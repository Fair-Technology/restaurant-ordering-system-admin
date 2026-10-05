export interface OrderAlarm {
  enable(): Promise<boolean>;
  setRinging(on: boolean): void;
  chime(): void;
  dispose(): void;
}

const RING_EVERY_MS = 2000;
const BEEP_OFFSETS_S = [0, 0.25, 0.5];
const BEEP_LENGTH_S = 0.18;
const CHIME_NOTES_HZ = [660, 880];
const CHIME_NOTE_GAP_S = 0.2;
const CHIME_NOTE_LENGTH_S = 0.25;

type AudioContextCtor = typeof AudioContext;

export function createOrderAlarm(): OrderAlarm {
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const beeps = () => {
    if (!ctx) return;
    for (const offset of BEEP_OFFSETS_S) {
      const start = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + BEEP_LENGTH_S);
    }
  };

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    async enable() {
      if (!ctx) {
        const Ctor: AudioContextCtor | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
        if (!Ctor) return false;
        ctx = new Ctor();
      }
      await ctx.resume();
      return ctx.state === 'running';
    },
    setRinging(on) {
      if (!on) {
        stopTimer();
        return;
      }
      if (timer !== null || !ctx) return;
      beeps();
      timer = setInterval(beeps, RING_EVERY_MS);
    },
    chime() {
      if (!ctx) return;
      CHIME_NOTES_HZ.forEach((hz, i) => {
        if (!ctx) return;
        const start = ctx.currentTime + i * CHIME_NOTE_GAP_S;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + CHIME_NOTE_LENGTH_S);
      });
    },
    dispose() {
      stopTimer();
      void ctx?.close();
      ctx = null;
    },
  };
}
