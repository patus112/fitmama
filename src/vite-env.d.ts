/// <reference types="vite/client" />

/** Short git SHA and build date, inlined so a stale service-worker bundle is visible. */
declare const __APP_VERSION__: string;

interface Window {
  /** Dev-only trace of the audio unlock path, read by the end-to-end test. */
  __fitmamaAudioLog?: string[];
}
