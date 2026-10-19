import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportRedisError } from './connection-errors.js';

const reset = (code: string) => Object.assign(new Error(`read ${code}`), { code });

describe('reportRedisError', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('regroupe les coupures de toutes les connexions en une ligne par minute', () => {
    vi.setSystemTime(new Date('2026-09-30T10:00:00Z'));
    reportRedisError('file notifications', reset('ECONNRESET'));
    reportRedisError('worker notifications', reset('ECONNRESET'));
    reportRedisError('cache', reset('ECONNRESET'));
    expect(warn).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-09-30T10:01:01Z'));
    reportRedisError('file media', reset('ECONNRESET'));
    expect(warn).toHaveBeenCalledTimes(2);
    // Les deux connexions tues pendant la minute sont comptées dans la ligne suivante.
    expect(String(warn.mock.calls[1]![0])).toContain('3 connexions');
  });

  it('signale une à une les erreurs qui ne sont pas des coupures', () => {
    reportRedisError('file notifications', new Error('WRONGTYPE Operation against a key'));
    reportRedisError('file notifications', new Error('WRONGTYPE Operation against a key'));
    expect(error).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });
});
