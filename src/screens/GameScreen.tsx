import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Pause, Play, Star } from 'lucide-react';
import { format } from 'date-fns';
import { GameClock } from '../audio/clock';
import { music, unlockAudio } from '../audio/engine';
import { ExerciseFrames } from '../components/ExerciseFrames';
import { SoundControl } from '../components/SoundControl';
import { SpeedPad } from '../components/SpeedPad';
import { blockPlaySeconds, countdownFrom } from '../config';
import { exerciseById, type Exercise } from '../domain/catalog';
import { blocksForDay } from '../domain/generator';
import { TRAVEL_SECONDS, noteTravel, remainingUpMoves } from '../domain/chart';
import { formatClock, formatPoints } from '../domain/format';
import { canPlayDay, completedDayKeys, dayKey, dayTitle, frontierDay, isValidDay } from '../domain/plan';
import { type BlockResult } from '../domain/play';
import { poseAmount, repPose } from '../domain/frames';
import { activeDirection } from '../domain/pose';
import { advanceScore, comboMessage, initialScore, type ScoreState } from '../domain/scoring';
import { CalmPlay } from './CalmPlay';
import {
  SPEED_MAX,
  buildBeatChart,
  planRep,
  projectNotes,
  pushRate,
  replaceFutureNotes,
  songTimeAt,
  type BeatNote,
  type TempoAnchor,
} from '../domain/tempo';
import { resolveBeatOffset, resolveSongBpm, songName } from '../domain/tracks';
import { addSession } from '../data/db';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAppState } from '../state/AppState';

type Mode = 'countdown' | 'play' | 'paused' | 'confirm' | 'saving';

interface Pop {
  id: number;
  points: number;
}

export function GameScreen({ phaseIndex, day }: { phaseIndex: number; day: number }) {
  const { sessions } = useAppState();
  const ref = { phaseIndex, day };

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

  if (!canPlayDay(ref, sessions)) {
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

  return <PlayQueue phaseIndex={phaseIndex} day={day} />;
}

export function PracticeScreen({ id }: { id: string }) {
  const exercise = exerciseById(id);
  if (!exercise) {
    return (
      <div className="results">
        <h1>That move is not in the library</h1>
        <a className="btn btn-coral" href="#/exercises">
          Back to the library
        </a>
      </div>
    );
  }
  return <PlayQueue practiceId={exercise.id} />;
}

function PlayQueue({
  phaseIndex,
  day,
  practiceId,
}: {
  phaseIndex?: number;
  day?: number;
  practiceId?: string;
}) {
  const { settings, sessions, customUrl, customName, detectedBpm, beatOffset, refreshSessions, setSongSpeed } =
    useAppState();
  const reduce = useReducedMotion();
  const practice = practiceId ? exerciseById(practiceId) : undefined;
  const planned =
    practice
      ? [{ exerciseId: practice.id, seconds: Math.min(180, Math.max(practice.defaultSeconds, 60)) }]
      : blocksForDay(settings.zones, { phaseIndex: phaseIndex ?? 0, day: day ?? 1 });
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState(() => initialScore());
  const logRef = useRef<{ exerciseId: string; seconds: number }[]>([]);
  const indexRef = useRef(0);
  const startedAt = useRef(new Date());
  indexRef.current = index;
  const block = planned[index];
  const exercise = block ? exerciseById(block.exerciseId) : undefined;
  const songBpm = resolveSongBpm(settings.trackId, settings.customBpm, detectedBpm, settings.bpmManual);
  const speed = settings.speeds[settings.trackId] ?? 1;
  const offset = resolveBeatOffset(settings.trackId, settings.bpmManual, beatOffset);
  const playSeconds = block ? blockPlaySeconds(block.seconds, planned.length) : 1;

  async function onDone(result: BlockResult): Promise<'next' | 'saved'> {
    const current = exercise;
    if (!current) return 'saved';
    const exercisesDone = [...logRef.current, { exerciseId: current.id, seconds: result.seconds }];
    const finishedPractice = Boolean(practiceId);
    const more = result.completed && !finishedPractice && indexRef.current + 1 < planned.length;
    if (more) {
      logRef.current = exercisesDone;
      setCarry(result.state);
      setIndex(indexRef.current + 1);
      return 'next';
    }
    const totalSeconds = exercisesDone.reduce((sum, item) => sum + item.seconds, 0);
    const frontier = frontierDay(completedDayKeys(sessions));
    const id = await addSession({
      date: format(startedAt.current, 'yyyy-MM-dd'),
      startedAt: startedAt.current.toISOString(),
      exercises: exercisesDone,
      totalSeconds,
      score: result.state.score,
      maxCombo: result.state.maxCombo,
      completed: result.completed && !finishedPractice,
      dayKey: dayKey(
        finishedPractice || phaseIndex === undefined || day === undefined ? frontier : { phaseIndex, day },
      ),
    });
    await refreshSessions();
    window.location.hash = `#/results/${id}`;
    return 'saved';
  }

  if (!exercise || !block) {
    return (
      <div className="results">
        <h1>This day has no moves yet</h1>
        <a className="btn btn-coral" href="#/settings">
          Choose zones
        </a>
      </div>
    );
  }

  const shared = {
    exercise,
    playSeconds,
    songBpm,
    speed,
    songTitle: songName(settings.trackId, customName),
    trackId: settings.trackId,
    volume: settings.volume,
    muted: settings.muted,
    customUrl,
    onSpeed: setSongSpeed,
    opening: carry,
    skipCountdown: index > 0,
    onDone,
  };

  if (exercise.mode === 'rep') {
    return (
      <LiveGame
        key={exercise.id + index}
        phaseIndex={phaseIndex ?? 0}
        day={day ?? 1}
        beatOffset={offset}
        reduce={reduce}
        {...shared}
      />
    );
  }

  return <CalmPlay key={exercise.id + index} {...shared} />;
}

function LiveGame({
  phaseIndex,
  day,
  exercise,
  playSeconds,
  songBpm,
  speed,
  beatOffset,
  songTitle,
  trackId,
  volume,
  muted,
  reduce,
  customUrl,
  onSpeed,
  opening,
  skipCountdown,
  onDone,
}: {
  phaseIndex: number;
  day: number;
  exercise: Exercise;
  playSeconds: number;
  songBpm: number;
  speed: number;
  beatOffset: number;
  songTitle: string;
  trackId: string;
  volume: number;
  muted: boolean;
  reduce: boolean;
  customUrl: string | null;
  onSpeed: (speed: number) => void;
  opening: ScoreState;
  skipCountdown: boolean;
  onDone: (result: BlockResult) => Promise<'next' | 'saved'>;
}) {
  const duration = playSeconds;
  const plan = planRep(songBpm, speed, { minSeconds: exercise.minRepSeconds, maxSeconds: exercise.maxRepSeconds });
  const songDuration = duration * SPEED_MAX + 8;
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [chart, setChart] = useState<BeatNote[]>(() =>
    buildBeatChart({
      songBpm,
      beatOffset,
      beatsPerRep: plan.beatsPerRep,
      songDuration,
      leadSongTime: TRAVEL_SECONDS * speed,
      fileDuration: null,
    }),
  );
  const [anchors, setAnchors] = useState<TempoAnchor[]>([{ realTime: 0, songTime: 0, rate: speed }]);
  const [mode, setMode] = useState<Mode>(skipCountdown ? 'play' : 'countdown');
  const [count, setCount] = useState(() => countdownFrom());
  const [hud, setHud] = useState({ now: 0, score: opening.score, combo: opening.combo, maxCombo: opening.maxCombo });
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState(false);
  const [movesLeft, setMovesLeft] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scoreRef = useRef<ScoreState>(opening);
  const onDoneRef = useRef(onDone);
  const nowRef = useRef(0);
  const clockRef = useRef<GameClock | null>(null);
  const chartRef = useRef<BeatNote[]>(chart);
  const anchorsRef = useRef<TempoAnchor[]>(anchors);
  const speedRef = useRef(speed);
  const songRef = useRef({ songBpm, beatOffset, beatsPerRep: plan.beatsPerRep, fileDuration });
  const chartKeyRef = useRef('');
  const customRef = useRef(customUrl);
  const started = useRef(false);
  const finishing = useRef(false);
  const popSerial = useRef(1);
  const countRef = useRef(count);
  const audioRef = useRef({ volume, muted, trackId });
  chartRef.current = chart;
  anchorsRef.current = anchors;
  songRef.current = { songBpm, beatOffset, beatsPerRep: plan.beatsPerRep, fileDuration };
  customRef.current = customUrl;
  audioRef.current = { volume, muted, trackId };
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
    if (trackId !== 'custom' || !customUrl) {
      setFileDuration(null);
      return;
    }
    const element = document.createElement('audio');
    element.preload = 'metadata';
    element.src = customUrl;
    const onMeta = () => {
      if (Number.isFinite(element.duration) && element.duration > 0.5) setFileDuration(element.duration);
    };
    element.addEventListener('loadedmetadata', onMeta);
    return () => {
      element.removeEventListener('loadedmetadata', onMeta);
      element.src = '';
    };
  }, [customUrl, trackId]);

  useEffect(() => {
    const previous = speedRef.current;
    speedRef.current = speed;
    if (!started.current) {
      const next = [{ realTime: 0, songTime: 0, rate: speed }];
      anchorsRef.current = next;
      setAnchors(next);
      return;
    }
    if (previous === speed) return;
    const now = clockRef.current?.now() ?? nowRef.current;
    const next = pushRate(anchorsRef.current, now, speed);
    anchorsRef.current = next;
    setAnchors(next);
    music.setRate(speed);
  }, [speed]);

  useEffect(() => {
    const key = `${songBpm}|${beatOffset}|${plan.beatsPerRep}|${fileDuration ?? ''}`;
    const built = buildBeatChart({
      songBpm,
      beatOffset,
      beatsPerRep: plan.beatsPerRep,
      songDuration,
      leadSongTime: started.current ? 0 : TRAVEL_SECONDS * speed,
      fileDuration,
    });
    if (!started.current) {
      chartKeyRef.current = key;
      chartRef.current = built;
      setChart(built);
      return;
    }
    if (chartKeyRef.current === key) return;
    chartKeyRef.current = key;
    const now = clockRef.current?.now() ?? nowRef.current;
    const songNow = songTimeAt(anchorsRef.current, now);
    const merged = replaceFutureNotes(chartRef.current, built, songNow, TRAVEL_SECONDS * speed);
    chartRef.current = merged;
    setChart(merged);
  }, [songBpm, beatOffset, plan.beatsPerRep, speed, fileDuration, songDuration]);

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
      const nextAnchors = [{ realTime: now, songTime: 0, rate }];
      anchorsRef.current = nextAnchors;
      setAnchors(nextAnchors);
      const audio = audioRef.current;
      const song = songRef.current;
      const startedAudio = {
        volume: audio.volume,
        muted: audio.muted,
        bpm: song.songBpm,
        rate,
        trackId: audio.trackId,
        customUrl: customRef.current,
        getTime: () => clock.now(),
      };
      void music.start(startedAudio).catch(() => {
        if (startedAudio.trackId !== 'custom') return;
        void music
          .start({ ...startedAudio, trackId: 'sunday-stretch', customUrl: null, bpm: 96 })
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
      const advanced = advanceScore(
        scoreRef.current,
        projectNotes(chartRef.current, anchorsRef.current),
        previous,
        current,
      );
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
  }, [duration, mode]);

  useEffect(() => {
    music.apply(volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    return () => {
      music.stop();
    };
  }, []);

  function movesAhead(): number {
    const now = clockRef.current?.now() ?? nowRef.current;
    return remainingUpMoves(projectNotes(chartRef.current, anchorsRef.current), now);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (mode === 'play' || mode === 'paused')) {
        event.preventDefault();
        if (mode === 'play') {
          clockRef.current?.pause();
          music.pause();
        }
        setMovesLeft(movesAhead());
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
    setMovesLeft(movesAhead());
    setMode('confirm');
  }

  const live = projectNotes(chart, anchors);
  const travel = TRAVEL_SECONDS;
  const cue = activeDirection(live, hud.now);
  const pose = reduce ? 0 : poseAmount(exercise.id, repPose(live, hud.now));
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
        <p className={`cue ${cue}`} data-testid="cue">
          {cue === 'up' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
          {cue === 'up' ? exercise.cueUp : exercise.cueDown}
        </p>
        <p className="tempo-feel" data-testid="tempo-feel">
          {plan.feel}
        </p>
        <ExerciseFrames exercise={exercise} driven pose={pose} reduce={reduce} className="stage-art" testId="stage-art" />
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
          {live.map((note) => {
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
