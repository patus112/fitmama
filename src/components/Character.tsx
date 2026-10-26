import hipsDown from '../assets/character/hips-down.webp';
import hipsUp from '../assets/character/hips-up.webp';

const characterFrames = { up: hipsUp, down: hipsDown };

export function Character({ pose }: { pose: number }) {
  const up = Math.min(1, Math.max(0, pose));
  return (
    <div className="character">
      <img src={characterFrames.down} alt="" style={{ opacity: 1 - up }} />
      <img src={characterFrames.up} alt="" style={{ opacity: up }} />
    </div>
  );
}
