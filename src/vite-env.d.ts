/// <reference types="vite/client" />

interface Window {
  /** Dev-only trace of the audio unlock path, read by the end-to-end test. */
  __fitmamaAudioLog?: string[];
}
