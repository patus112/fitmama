interface ProbeAudio {
  src: string;
  preload: string;
  duration: number;
  onloadedmetadata: (() => void) | null;
  onerror: (() => void) | null;
}

/**
 * True when an `<audio>` element can read the file.
 * A greyed-out download is allowed through the picker, then checked here.
 */
export function probePlayable(
  file: Blob,
  createAudio?: () => ProbeAudio,
  createUrl: (blob: Blob) => string = (blob) => URL.createObjectURL(blob),
  revokeUrl: (url: string) => void = (url) => URL.revokeObjectURL(url),
): Promise<boolean> {
  const make = createAudio ?? (() => new Audio() as unknown as ProbeAudio);
  return new Promise((resolve) => {
    const url = createUrl(file);
    const audio = make();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      revokeUrl(url);
      audio.src = '';
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 4000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) && audio.duration > 0);
    audio.onerror = () => finish(false);
    audio.src = url;
  });
}
