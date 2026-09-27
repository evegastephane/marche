import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import type { AppConfig } from '../../../shared/infrastructure/config/app-config.js';
import { EmailSender, type OutgoingEmail } from '../application/email.port.js';

/** Développement : SMTP vers Mailpit (http://localhost:8025). */
export class SmtpEmailSender extends EmailSender {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    super();
    this.transporter = createTransport(smtpUrl);
  }

  async send(email: OutgoingEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
    });
  }
}

/** Production : Resend, avec clé d'idempotence (un job rejoué n'envoie pas deux fois). */
export class ResendEmailSender extends EmailSender {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    super();
    this.resend = new Resend(apiKey);
  }

  async send(email: OutgoingEmail): Promise<void> {
    const { error } = await this.resend.emails.send(
      {
        from: this.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error) throw new Error(`Envoi Resend refusé : ${error.name} ${error.message}`);
  }
}

/** Tests et environnements sans e-mail : journalise seulement. */
export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger('E-mail');

  async send(email: OutgoingEmail): Promise<void> {
    this.logger.log(`[non envoyé] ${email.subject} → ${email.to.join(', ')}`);
  }
}

/** Choix du canal selon EMAIL_PROVIDER (pattern Strategy). */
export function createEmailSender(config: AppConfig): EmailSender {
  switch (config.email.provider) {
    case 'smtp':
      if (!config.email.smtpUrl) throw new Error('SMTP_URL manquant');
      return new SmtpEmailSender(config.email.smtpUrl, config.email.from);
    case 'resend':
      if (!config.email.resendApiKey) throw new Error('RESEND_API_KEY manquant');
      return new ResendEmailSender(config.email.resendApiKey, config.email.from);
    case 'log':
      return new LogEmailSender();
  }
}
