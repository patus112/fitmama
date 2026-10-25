import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Pause, Play, Star } from 'lucide-react';
import { format } from 'date-fns';
import { GameClock } from '../audio/clock';
import { music } from '../audio/engine';
import { Character } from '../components/Character';
import { SoundControl } from '../components/SoundControl';
import { countdownFrom, gameSeconds } from '../config';
import { GLUTE_BRIDGE_ID } from '../domain/catalog';
import { TRAVEL_SECONDS, buildChart, noteTravel, remainingUpMoves, type Note } from '../domain/chart';
import { formatClock, formatPoints } from '../domain/format';
import { canPlayDay, dayKey, dayTitle, isValidDay } from '../domain/plan';
import { activeDirection, poseAt } from '../domain/pose';
import { advanceScore, comboMessage, initialScore, type ScoreState } from '../domain/scoring';
import { resolveBpm } from '../domain/tracks';
import { addSession } from '../data/db';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAppState } from '../state/AppState';

type Mode = 'countdown' | 'play' | 'paused' | 'confirm' | 'saving';

interface Pop {
  id: number;
  points: number;
}

export function GameScreen({ phaseIndex, day }: { phaseIndex: number; day: number }) {
  const { settings, sessions, customUrl, refreshSessions } = useAppState();
  const reduce = useReducedMotion();
  const ref = { phaseIndex, day };
  const allowed = isValidDay(ref) && canPlayDay(ref, sessions);

  if (!isValidDay(ref)) {
    return (
      <div className="results">
        <h1>That day is not on the plan</h1>
        <a className="btn btn-coral" href="#/plan">
          Back to my plan
        </a>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="results">
        <h1>This day opens after the earlier ones</h1>
        <p className="lede">No rush. The next open day is waiting on your plan.</p>
        <a className="btn btn-coral" href="#/plan">
          Back to my plan
        </a>
      </div>
    );
  }

  return (
    <LiveGame
      phaseIndex={phaseIndex}
      day={day}
      bpm={resolveBpm(settings.trackId, settings.customBpm)}
      trackId={settings.trackId}
      volume={settings.volume}
      muted={settings.muted}
      reduce={reduce}
      customUrl={customUrl}
      refreshSessions={refreshSessions}
    />
  );
}

function LiveGame({
  phaseIndex,
  day,
  bpm,
  trackId,
  volume,
  muted,
  reduce,
  customUrl,
  refreshSessions,
}: {
  phaseIndex: number;
  day: number;
  bpm: number;
  trackId: string;
  volume: number;
  muted: boolean;
  reduce: boolean;
  customUrl: string | null;
  refreshSessions: () => Promise<void>;
}) {
  const duration = gameSeconds();
  const notes = useMemo(() => buildChart(bpm, duration), [bpm, duration]);
  const travel = Math.min(TRAVEL_SECONDS, notes[0]?.time ?? TRAVEL_SECONDS);
  const [mode, setMode] = useState<Mode>('countdown');
  const [count, setCount] = useState(() => countdownFrom());
  const [hud, setHud] = useState({ now: 0, score: 0, combo: 1, maxCombo: 0 });
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState(false);
  const [movesLeft, setMovesLeft] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scoreRef = useRef<ScoreState>(initialScore());
  const nowRef = useRef(0);
  const clockRef = useRef<GameClock | null>(null);
  const notesRef = useRef<Note[]>(notes);
  const customRef = useRef(customUrl);
  const started = useRef(false);
  const finishing = useRef(false);
  const popSerial = useRef(1);
  const countRef = useRef(count);
  const audioRef = useRef({ volume, muted, trackId });
  notesRef.current = notes;
  customRef.current = customUrl;
  audioRef.current = { volume, muted, trackId };

  const finishRef = useRef<(completed: boolean) => Promise<void>>(async () => {});
  finishRef.current = async (completed: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    clockRef.current?.pause();
    music.stop();
    setMode('saving');
    const seconds = Math.round(Math.min(duration, Math.max(0, clockRef.current?.now() ?? nowRef.current)));
    try {
      const id = await addSession({
        date: format(new Date(), 'yyyy-MM-dd'),
        startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
        exercises: [{ exerciseId: GLUTE_BRIDGE_ID, seconds }],
        totalSeconds: seconds,
        score: scoreRef.current.score,
        maxCombo: scoreRef.current.maxCombo,
        completed,
        dayKey: dayKey({ phaseIndex, day }),
      });
      await refreshSessions();
      window.location.hash = `#/results/${id}`;
    } catch {
      finishing.current = false;
      setSaveError('Could not save on this phone. Nothing left the device.');
      setMode('paused');
    }
  };

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
      const audio = audioRef.current;
      const startedAudio = {
        volume: audio.volume,
        muted: audio.muted,
        bpm,
        trackId: audio.trackId,
        customUrl: customRef.current,
        getTime: () => clock.now(),
      };
      void music.start(startedAudio).catch(() => {
        if (startedAudio.trackId !== 'custom') return;
        void music
          .start({ ...startedAudio, trackId: 'sunday-stretch', customUrl: null })
          .catch(() => {
            /* The chart keeps time even if the speaker stays quiet. */
          });
      });
    } else {
      clock.resume();
      void music.resume();
    }

    let frame = 0;
    const loop = () => {
      const current = clock.now();
      const previous = nowRef.current;
      const advanced = advanceScore(scoreRef.current, notesRef.current, previous, current);
      scoreRef.current = advanced.state;
      nowRef.current = current;
      if (advanced.gained.length > 0) {
        const created = advanced.gained.map((points) => ({ id: popSerial.current++, points }));
        setPops((prev) => [...prev, ...created]);
        setFlash(true);
        window.setTimeout(() => {
          setPops((prev) => prev.filter((pop) => !created.some((item) => item.id === pop.id)));
          setFlash(false);
        }, 1400);
      }
      setHud({
        now: current,
        score: advanced.state.score,
        combo: advanced.state.combo,
        maxCombo: advanced.state.maxCombo,
      });
      if (current >= duration) {
        void finishRef.current(true);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [bpm, duration, mode]);

  useEffect(() => {
    music.apply(volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    return () => {
      music.stop();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (mode === 'play' || mode === 'paused')) {
        event.preventDefault();
        if (mode === 'play') {
          clockRef.current?.pause();
          music.pause();
        }
        setMovesLeft(remainingUpMoves(notesRef.current, clockRef.current?.now() ?? nowRef.current));
        setMode('confirm');
      }
      if (event.key === ' ' && mode === 'play') {
        event.preventDefault();
        clockRef.current?.pause();
        music.pause();
        setMode('paused');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  function pause() {
    clockRef.current?.pause();
    music.pause();
    setMode('paused');
  }

  function resume() {
    setSaveError(null);
    setMode('play');
  }

  function askToQuit() {
    if (mode === 'play') {
      clockRef.current?.pause();
      music.pause();
    }
    setMovesLeft(remainingUpMoves(notesRef.current, clockRef.current?.now() ?? nowRef.current));
    setMode('confirm');
  }

  const cue = activeDirection(notes, hud.now);
  const pose = poseAt(notes, hud.now, reduce ? 0 : 0.35);
  const remaining = Math.max(0, duration - hud.now);
  const title = dayTitle({ phaseIndex, day });

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
          <SoundControl />
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
        <p className={`cue ${cue}`}>
          {cue === 'up' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
          {cue === 'up' ? 'Hips up' : 'Hips down'}
        </p>
        <Character pose={pose} />
        <div className="pops">
          {pops.map((pop) => (
            <div key={pop.id} className="pop" data-testid="perfect-pop">
              <strong>+{pop.points}</strong>
              <span>Perfect</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lane" data-testid="note-lane">
        <div className={flash && !reduce ? 'hit-ring flash' : 'hit-ring'} data-testid="hit-ring" />
        <div className="lane-notes">
          {notes.map((note) => {
            const offset = noteTravel(note.time, hud.now, travel);
            if (offset < -0.22 || offset > 1.05) return null;
            return (
              <div
                key={note.index}
                className={`note note-${note.direction}`}
                style={{ left: `calc(42px + (100% - 96px) * ${offset})`, opacity: offset < 0 ? Math.max(0, 1 + offset / 0.22) : 1 }}
                aria-hidden="true"
              >
                {note.direction === 'up' ? <ArrowUp /> : <ArrowDown />}
              </div>
            );
          })}
        </div>
        <div className="eq" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <p className="visually-hidden">Points arrive on their own, in time with the beat. {title}.</p>

      {mode === 'countdown' ? (
        <div className="overlay">
          <div className="countdown">
            <p>Get ready</p>
            <strong aria-live="polite">{count}</strong>
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
            <h2 id="quit-title">
              Hang in there, only {movesLeft} {movesLeft === 1 ? 'move' : 'moves'} left
            </h2>
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
