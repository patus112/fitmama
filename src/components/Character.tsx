import { characterFrames } from '../media';

export function Character({ pose }: { pose: number }) {
  const up = Math.min(1, Math.max(0, pose));
  return (
    <div className="character">
      <img src={characterFrames.down} alt="" style={{ opacity: 1 - up }} />
      <img src={characterFrames.up} alt="" style={{ opacity: up }} />
    </div>
  );
}
