'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

/**
 * Une lampe : sa position en pixels CSS dans le canevas (vers le bas), sa puissance (0 = éteinte), son demi-angle
 * et sa portée (en pixels : au-delà, sa lumière s'est éteinte).
 */
export interface Lamp {
  x: number;
  y: number;
  power: number;
  spread: number;
  reach: number;
}

const MAX_LAMPS = 6;

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/*
 * Faisceaux volumétriques : un cône doux par lampe, une brume qui dérive, des poussières qui montent dans la
 * lumière. Rendu en demi-résolution (la lumière est floue par nature) et posé sur la page en « screen ».
 */
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform vec4 uLamps[${MAX_LAMPS}];
uniform float uReach[${MAX_LAMPS}];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float t = uTime;
  float light = 0.0;
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    vec4 L = uLamps[i];
    if (L.z <= 0.0) continue;
    vec2 d = px - L.xy;
    if (d.y <= 0.0) continue;
    float ang = abs(atan(d.x, d.y));
    float cone = 1.0 - smoothstep(L.w * 0.45, L.w, ang);
    float core = 1.0 - smoothstep(0.0, L.w * 0.42, ang);
    float fall = 1.0 / (1.0 + d.y * 0.0032);
    float near = smoothstep(0.0, 26.0, d.y);
    float far = 1.0 - smoothstep(uReach[i] * 0.35, uReach[i], length(d));
    light += (cone * 0.5 + core * 0.5) * fall * near * far * L.z;
  }
  float haze = fbm(px * 0.0042 + vec2(t * 0.014, -t * 0.022));
  light *= 0.5 + 0.95 * haze;

  vec2 cell = px / 24.0 + vec2(sin(t * 0.2) * 0.3, t * 0.28);
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float h = hash(id);
  vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float mote = smoothstep(0.09, 0.0, length(f - off * 0.7)) * step(0.7, h);
  float twinkle = 0.45 + 0.55 * sin(t * 1.6 + h * 40.0);
  light += mote * twinkle * min(light, 0.8) * 2.4;

  vec3 warm = mix(vec3(0.96, 0.40, 0.12), vec3(1.0, 0.84, 0.66), clamp(light * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(warm * light * 0.9, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Canevas de lumière posé sur une scène. `lamps` est lu à chaque image : les lampes suivent la page qui défile.
 * Sans WebGL, rien n'est dessiné et la scène garde sa lumière CSS. Mouvement réduit : la brume ne dérive plus.
 */
export function Beam({
  lamps,
  className,
}: {
  lamps: () => Lamp[];
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const read = useRef(lamps);
  read.current = lamps;
  const reduce = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const gl = element.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uLamps = gl.getUniformLocation(program, 'uLamps');
    const uReach = gl.getUniformLocation(program, 'uReach');
    const packed = new Float32Array(MAX_LAMPS * 4);
    const reaches = new Float32Array(MAX_LAMPS).fill(1);

    let scale = 0.5;
    const resize = () => {
      scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      element.width = Math.max(1, Math.round(element.clientWidth * scale));
      element.height = Math.max(1, Math.round(element.clientHeight * scale));
      gl.viewport(0, 0, element.width, element.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    let visible = true;
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    watcher.observe(element);

    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      packed.fill(0);
      read
        .current()
        .slice(0, MAX_LAMPS)
        .forEach((lamp, index) => {
          packed.set([lamp.x, lamp.y, lamp.power, lamp.spread], index * 4);
          reaches[index] = lamp.reach;
        });
      gl.uniform2f(uRes, element.width, element.height);
      gl.uniform1f(uScale, scale);
      gl.uniform1f(uTime, reduce ? 12 : (now - start) / 1000);
      gl.uniform4fv(uLamps, packed);
      gl.uniform1fv(uReach, reaches);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      watcher.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [reduce]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={className}
      style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
    />
  );
}
