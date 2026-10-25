import { useReducedMotion } from '../hooks/useReducedMotion';

const PIECES = [
  { left: '6%', delay: '0s', color: '#FF7F5C', rotate: -12 },
  { left: '14%', delay: '0.1s', color: '#8FC9A0', rotate: 18 },
  { left: '22%', delay: '0.2s', color: '#B4441E', rotate: 8 },
  { left: '31%', delay: '0.05s', color: '#CDE8D0', rotate: -20 },
  { left: '40%', delay: '0.18s', color: '#FF7F5C', rotate: 14 },
  { left: '48%', delay: '0.28s', color: '#2F6B45', rotate: -8 },
  { left: '57%', delay: '0.08s', color: '#FFE3D8', rotate: 22 },
  { left: '66%', delay: '0.22s', color: '#8FC9A0', rotate: -16 },
  { left: '74%', delay: '0.12s', color: '#FF7F5C', rotate: 10 },
  { left: '83%', delay: '0.3s', color: '#CDE8D0', rotate: -6 },
  { left: '91%', delay: '0.16s', color: '#B4441E', rotate: 16 },
  { left: '18%', delay: '0.34s', color: '#8FC9A0', rotate: -18 },
  { left: '52%', delay: '0.26s', color: '#FF7F5C', rotate: 6 },
  { left: '78%', delay: '0.04s', color: '#2F6B45', rotate: 20 },
];

export function Confetti() {
  const reduce = useReducedMotion();
  return (
    <div className={reduce ? 'confetti static' : 'confetti'} aria-hidden="true">
      {PIECES.map((piece) => (
        <span
          key={`${piece.left}-${piece.delay}`}
          style={{
            left: piece.left,
            background: piece.color,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
