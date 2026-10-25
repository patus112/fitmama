import { describe, expect, it } from 'vitest';
import { audibleGain, playInGesture, preferPlaybackSession, startTone, unlockWebAudio, type UnlockContext } from './unlock';

function fakeContext(): UnlockContext & { order: string[] } {
  const order: string[] = [];
  return {
    order,
    state: 'suspended',
    destination: 'dest',
    resume() {
      order.push('resume');
      return Promise.resolve();
    },
    createBuffer() {
      order.push('buffer');
      return { samples: 1 };
    },
    createBufferSource() {
      order.push('source');
      return {
        buffer: null,
        connect(dest: unknown) {
          order.push(dest === 'dest' ? 'connect-dest' : 'connect');
        },
        start(when?: number) {
          order.push(`start:${when ?? 'now'}`);
        },
      };
    },
  };
}

describe('unlockWebAudio', () => {
  it('calls resume and starts a silent buffer before returning', () => {
    const audio = fakeContext();
    unlockWebAudio(audio);
    expect(audio.order).toEqual(['resume', 'buffer', 'source', 'connect-dest', 'start:0']);
  });
});

describe('audibleGain', () => {
  it('keeps the default volume above zero and mute at zero', () => {
    expect(audibleGain(0.35, false)).toBeGreaterThan(0);
    expect(audibleGain(0.35, true)).toBe(0);
    expect(audibleGain(0, false)).toBe(0);
  });
});

describe('playInGesture', () => {
  it('sets playsinline and calls play before returning', () => {
    const order: string[] = [];
    const el = {
      src: '',
      loop: false,
      playsInline: false,
      volume: 1,
      setAttribute(name: string) {
        order.push(name);
      },
      play() {
        order.push('play');
        return Promise.resolve();
      },
    };
    playInGesture(el, 'blob:song', 0.35);
    expect(el.src).toBe('blob:song');
    expect((el as { playsInline?: boolean }).playsInline).toBe(true);
    expect(el.loop).toBe(true);
    expect(order).toEqual(['playsinline', 'webkit-playsinline', 'play']);
  });
});

describe('preferPlaybackSession', () => {
  it('selects playback when the browser exposes audioSession', () => {
    const nav = { audioSession: { type: 'auto' } };
    preferPlaybackSession(nav);
    expect(nav.audioSession.type).toBe('playback');
    preferPlaybackSession({});
  });
});

describe('startTone', () => {
  it('connects the oscillator through a gain to the destination and starts it', () => {
    const order: string[] = [];
    const gainNode = {
      gain: {
        value: 0,
        setValueAtTime() {
          order.push('gain-set');
        },
        exponentialRampToValueAtTime(value: number) {
          order.push(`ramp:${value}`);
        },
      },
      connect(dest: unknown) {
        order.push(dest === 'master' ? 'gain-master' : 'gain-other');
      },
    };
    const osc = {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime() {
          order.push('freq');
        },
      },
      connect(dest: unknown) {
        order.push(dest === gainNode ? 'osc-gain' : 'osc-other');
      },
      start(when?: number) {
        order.push(`start:${when}`);
      },
      stop() {
        order.push('stop');
      },
    };
    const heard = startTone(
      {
        currentTime: 2,
        createOscillator: () => osc,
        createGain: () => gainNode,
      },
      'master',
      { frequency: 523.25, peak: 0.4, when: 2, wave: 'sine', duration: 0.35 },
    );
    expect(heard).toBe(0.4);
    expect(order).toContain('osc-gain');
    expect(order).toContain('gain-master');
    expect(order).toContain('start:2');
    expect(order.some((step) => step.startsWith('ramp:0.4'))).toBe(true);
  });
});
