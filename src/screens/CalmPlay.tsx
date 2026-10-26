import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Star } from 'lucide-react';
import { GameClock } from '../audio/clock';
import { music, unlockAudio } from '../audio/engine';
import { SoundControl } from '../components/SoundControl';
import { SpeedPad } from '../components/SpeedPad';
import { countdownFrom } from '../config';
import { exercisePhotos } from '../media';
import { formatClock, formatPoints } from '../domain/format';
import { breathFrame, breathPattern, holdBeatsLeft, holdsCompleted, type BlockResult } from '../domain/play';
import { MAX_COMBO, POINTS_PER_UP, comboMessage, type ScoreState } from '../domain/scoring';
import { planRep, pushRate, songTimeAt, type TempoAnchor } from '../domain/tempo';
import type { Exercise } from '../domain/catalog';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Mode = 'countdown' | 'play' | 'paused' | 'confirm' | 'saving';

interface Pop {
  id: number;
  points: number;
}

function absorb(state: ScoreState, hits: number): { state: ScoreState; gained: number[] } {
  let { score, combo, maxCombo } = state;
  const gained: number[] = [];
  const count = Math.max(0, Math.floor(hits));
  for (let hit = 0; hit < count; hit += 1) {
    const points = POINTS_PER_UP * combo;
    score += points;
    gained.push(points);
    maxCombo = Math.max(maxCombo, combo);
    combo = Math.min(MAX_COMBO, combo + 1);
  }
  return { state: { score, combo, maxCombo }, gained };
}

export function CalmPlay({
  exercise,
  playSeconds,
  songBpm,
  speed,
  songTitle,
  trackId,
  volume,
  muted,
  customUrl,
  onSpeed,
  opening,
  skipCountdown,
  onDone,
}: {
  exercise: Exercise;
  playSeconds: number;
  songBpm: number;
  speed: number;
  songTitle: string;
  trackId: string;
  volume: number;
  muted: boolean;
  customUrl: string | null;
  onSpeed: (speed: number) => void;
  opening: ScoreState;
  skipCountdown: boolean;
  onDone: (result: BlockResult) => Promise<'next' | 'saved'>;
}) {
  const reduce = useReducedMotion();
  const duration = playSeconds;
  const restSeconds = exercise.singleHold ? 0 : 2;
  const holdFor = exercise.singleHold ? duration : exercise.holdSeconds;
  const plan = planRep(songBpm, speed, { minSeconds: exercise.minRepSeconds, maxSeconds: exercise.maxRepSeconds });
  const [mode, setMode] = useState<Mode>(skipCountdown ? 'play' : 'countdown');
  const [count, setCount] = useState(() => countdownFrom());
  const [hud, setHud] = useState({
    now: 0,
    score: opening.score,
    combo: opening.combo,
    maxCombo: opening.maxCombo,
  });
  const [visual, setVisual] = useState({ progress: 0, holding: true, beats: 0, phase: 'inhale' as 'inhale' | 'exhale', breathCount: 1, scale: 0.62 });
  const [pops, setPops] = useState<Pop[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scoreRef = useRef<ScoreState>(opening);
  const seenRef = useRef(0);
  const nowRef = useRef(0);
  const clockRef = useRef<GameClock | null>(null);
  const anchorsRef = useRef<TempoAnchor[]>([{ realTime: 0, songTime: 0, rate: speed }]);
  const speedRef = useRef(speed);
  const started = useRef(false);
  const finishing = useRef(false);
  const popSerial = useRef(1);
  const countRef = useRef(count);
  const audioRef = useRef({ volume, muted, trackId });
  const customRef = useRef(customUrl);
  const onDoneRef = useRef(onDone);
  audioRef.current = { volume, muted, trackId };
  customRef.current = customUrl;
  onDoneRef.current = onDone;

  const finishRef = useRef<(completed: boolean) => Promise<void>>(async () => {});
  finishRef.current = async (completed: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    clockRef.current?.pause();
    music.stop();
    setMode('saving');
    const seconds = Math.round(Math.min(duration, Math.max(0, clockRef.current?.now() ?? nowRef.current)));
    try {
      const outcome = await onDoneRef.current({ state: scoreRef.current, seconds, completed });
      if (outcome === 'next') return;
    } catch {
      finishing.current = false;
      setSaveError('Could not save on this phone. Nothing left the device.');
      setMode('paused');
    }
  };

  useEffect(() => {
    const previous = speedRef.current;
    speedRef.current = speed;
    if (!started.current) {
      anchorsRef.current = [{ realTime: 0, songTime: 0, rate: speed }];
      return;
    }
    if (previous === speed) return;
    const now = clockRef.current?.now() ?? nowRef.current;
    anchorsRef.current = pushRate(anchorsRef.current, now, speed);
    music.setRate(speed);
  }, [speed]);

  useEffect(() => {
    if (mode !== 'countdown') return;
    const timer = window.setInterval(() => {
      const next = countRef.current - 1;
      if (next <= 0) {
        window.clearInterval(timer);
        countRef.current = 0;
        setCount(0);
        setMode('play');
        return;
      }
      countRef.current = next;
      setCount(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'play') return;
    const clock = clockRef.current ?? new GameClock();
    clockRef.current = clock;
    if (!started.current) {
      started.current = true;
      clock.start();
      const now = clock.now();
      const rate = speedRef.current;
      anchorsRef.current = [{ realTime: now, songTime: 0, rate }];
      const audio = audioRef.current;
      const startedAudio = {
        volume: audio.volume,
        muted: audio.muted,
        bpm: songBpm,
        rate,
        trackId: audio.trackId,
        customUrl: customRef.current,
        getTime: () => clock.now(),
      };
      void music.start(startedAudio).catch(() => {
        if (startedAudio.trackId !== 'custom') return;
        void music.start({ ...startedAudio, trackId: 'sunday-stretch', customUrl: null, bpm: 96 }).catch(() => {
          /* The circle keeps time even if the speaker stays quiet. */
        });
      });
    } else {
      clock.resume();
      void music.resume();
    }

    let frame = 0;
    const loop = () => {
      const current = clock.now();
      const songNow = songTimeAt(anchorsRef.current, current);
      let added = 0;
      if (exercise.mode === 'breath') {
        const pattern = breathPattern(songBpm, speedRef.current);
        const breath = breathFrame(songNow, pattern);
        added = breath.cyclesDone - seenRef.current;
        const scale = reduce ? (breath.phase === 'inhale' ? 1 : 0.68) : breath.scale;
        setVisual({
          progress: breath.phase === 'inhale' ? breath.count / pattern.inhaleBeats : breath.count / pattern.exhaleBeats,
          holding: breath.phase === 'inhale',
          beats: breath.count,
          phase: breath.phase,
          breathCount: breath.count,
          scale,
        });
      } else {
        const cycle = holdFor + restSeconds;
        const into = cycle > 0 ? current % cycle : 0;
        const holding = restSeconds <= 0 || into < holdFor;
        const progress = holding && holdFor > 0 ? Math.min(1, into / holdFor) : 0;
        const remain = holding ? Math.max(0, holdFor - into) : 0;
        const beat = 60 / Math.max(1, songBpm * speedRef.current);
        added = holdsCompleted(current, holdFor, restSeconds) - seenRef.current;
        setVisual({
          progress,
          holding,
          beats: holdBeatsLeft(remain, beat),
          phase: 'inhale',
          breathCount: 1,
          scale: 0.62 + 0.38 * progress,
        });
      }
      if (added > 0) {
        const absorbed = absorb(scoreRef.current, added);
        scoreRef.current = absorbed.state;
        seenRef.current += added;
        if (absorbed.gained.length > 0) {
          const created = absorbed.gained.map((points) => ({ id: popSerial.current++, points }));
          setPops((prev) => [...prev, ...created]);
          window.setTimeout(() => {
            setPops((prev) => prev.filter((pop) => !created.some((item) => item.id === pop.id)));
          }, 1400);
        }
      }
      nowRef.current = current;
      setHud({
        now: current,
        score: scoreRef.current.score,
        combo: scoreRef.current.combo,
        maxCombo: scoreRef.current.maxCombo,
      });
      if (current >= duration) {
        void finishRef.current(true);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [duration, exercise.mode, holdFor, mode, reduce, restSeconds, songBpm]);

  useEffect(() => {
    music.apply(volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    return () => {
      music.stop();
    };
  }, []);

  function pause() {
    clockRef.current?.pause();
    music.pause();
    setMode('paused');
  }

  function resume() {
    unlockAudio();
    if (trackId === 'custom' && customUrl) music.armFile(customUrl, true);
    else music.resume();
    setSaveError(null);
    setMode('play');
  }

  function askToQuit() {
    if (mode === 'play') {
      clockRef.current?.pause();
      music.pause();
    }
    setMode('confirm');
  }

  const remaining = Math.max(0, duration - hud.now);
  const cue =
    exercise.mode === 'breath'
      ? `${visual.phase === 'inhale' ? 'Inhale' : 'Exhale'} ${visual.breathCount}`
      : visual.holding
        ? 'Hold'
        : 'Rest';
  const cueClass = exercise.mode === 'breath' ? (visual.phase === 'inhale' ? 'up' : 'down') : visual.holding ? 'up' : 'down';
  const art = exercisePhotos[exercise.id];

  return (
    <div className="game" data-testid="game">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <header className="hud">
        <div className="combo-pill" data-testid="combo">
          <span className="combo-badge">x{hud.combo}</span>
          <span>
            <small>Combo</small>
            <strong>{comboMessage(hud.combo)}</strong>
          </span>
        </div>
        <div className="timer-pill" data-testid="timer" aria-label={`${formatClock(remaining)} left`}>
          <TimerRing progress={duration === 0 ? 0 : remaining / duration} />
          <span>{formatClock(remaining)}</span>
        </div>
        <div className="hud-right">
          <SoundControl caption={`${songTitle} · ${plan.feel}`} />
          {mode === 'play' ? (
            <button type="button" className="icon-btn pause-btn" aria-label="Pause" data-testid="pause" onClick={pause}>
              <Pause size={18} aria-hidden="true" />
            </button>
          ) : null}
          <div className="score-pill" data-testid="live-score">
            <Star size={16} color="#2F6B45" fill="#2F6B45" aria-hidden="true" />
            <span>
              <small>Score</small>
              <strong>{formatPoints(hud.score)}</strong>
            </span>
          </div>
        </div>
      </header>

      <div className="stage">
        <p className={`cue ${cueClass}`} data-testid="cue">
          {cue}
        </p>
        <p className="tempo-feel" data-testid="tempo-feel">
          {plan.feel}
        </p>
        {exercise.mode === 'breath' ? (
          <div className="breath-wrap">
            {art ? (
              <img
                className="breath-circle breath-art"
                data-testid="breath-circle"
                data-scale={visual.scale.toFixed(2)}
                src={art}
                alt=""
                style={{ transform: `scale(${visual.scale})` }}
              />
            ) : (
              <div
                className="breath-circle"
                data-testid="breath-circle"
                data-scale={visual.scale.toFixed(2)}
                style={{ transform: `scale(${visual.scale})` }}
              />
            )}
            <p className="breath-label">{exercise.name}</p>
          </div>
        ) : (
          <div className="hold-wrap">
            <div className="hold-stage">
              <HoldRing progress={visual.progress} />
              {art ? <img className="hold-art" src={art} alt="" data-testid="hold-art" /> : null}
            </div>
            <p className="hold-count" data-testid="hold-beats">
              {visual.beats > 0 ? visual.beats : '·'}
            </p>
            <p className="breath-label">{exercise.name}</p>
          </div>
        )}
        <div className="pops">
          {pops.map((pop) => (
            <div key={pop.id} className="pop" data-testid="perfect-pop">
              <strong>+{pop.points}</strong>
              <span>Nice</span>
            </div>
          ))}
        </div>
      </div>

      <p className="calm-foot">{comboMessage(hud.combo)}. Stay slow.</p>

      {mode === 'countdown' ? (
        <div className="overlay">
          <div className="countdown">
            <p>Get ready</p>
            <strong aria-live="polite">{count}</strong>
            <SpeedPad speed={speed} feel={plan.feel} onChange={onSpeed} />
          </div>
        </div>
      ) : null}

      {mode === 'paused' || mode === 'saving' ? (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-labelledby="pause-title">
            <h2 id="pause-title">{mode === 'saving' ? 'Saving on this phone' : 'Paused'}</h2>
            <p>{saveError ?? 'Take a breath. The beat will wait.'}</p>
            {mode === 'paused' ? (
              <>
                <SpeedPad speed={speed} feel={plan.feel} onChange={onSpeed} />
                <button type="button" className="btn btn-coral" onClick={resume}>
                  <Play size={18} fill="#3B2A24" aria-hidden="true" /> Resume
                </button>
                <button type="button" className="btn btn-quiet" onClick={askToQuit}>
                  End session
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === 'confirm' ? (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-labelledby="quit-title">
            <h2 id="quit-title">Hang in there, this one is almost done</h2>
            <p>There is no rush. Stay if it feels okay.</p>
            <button type="button" className="btn btn-coral" onClick={resume}>
              Continue
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => void finishRef.current(false)}>
              End anyway
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoldRing({ progress }: { progress: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg className="hold-ring" viewBox="0 0 120 120" data-testid="hold-ring" data-progress={progress.toFixed(2)} aria-hidden="true">
      <circle cx="60" cy="60" r={radius} fill="#fff8f1" stroke="#F0E2D8" strokeWidth="8" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#FF7F5C"
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

function TimerRing({ progress }: { progress: number }) {
  const radius = 11;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <circle
        cx="15"
        cy="15"
        r={radius}
        fill="none"
        stroke="#FF7F5C"
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 15 15)"
      />
    </svg>
  );
}
