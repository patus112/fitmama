import { useEffect, useState } from 'react';
import { Check, Flame, Leaf, Lock, Play, Star } from 'lucide-react';
import { music, unlockAudio } from '../audio/engine';
import { QuietLinks } from '../components/QuietLinks';
import { exerciseById } from '../domain/catalog';
import { formatPoints } from '../domain/format';
import { blocksForDay, plannedDay } from '../domain/generator';
import {
  DAYS_PER_PHASE,
  PHASES,
  completedDayKeys,
  completedInPhase,
  dayKey,
  dayState,
  dayTitle,
  frontierDay,
  planComplete,
  type DayRef,
} from '../domain/plan';
import { currentStreak } from '../domain/streak';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAppState } from '../state/AppState';

const INNER = 340;
const TILE = 76;
const ROW = 158;

function LeafMark({ className }: { className: string }) {
  return <Leaf className={className} size={28} color="#8FC9A0" aria-hidden="true" />;
}

export function PlanScreen() {
  const { sessions, settings, customUrl } = useAppState();
  const reduce = useReducedMotion();
  function beginAudio() {
    unlockAudio();
    if (settings.trackId === 'custom' && customUrl) music.armFile(customUrl, false);
  }
  const keys = completedDayKeys(sessions);
  const frontier = frontierDay(keys);
  const finished = planComplete(keys);
  const [picked, setPicked] = useState<number | null>(null);
  const phaseIndex = picked ?? frontier.phaseIndex;
  const phase = PHASES[phaseIndex] ?? PHASES[0];
  const done = completedInPhase(phaseIndex, keys);
  const streak = currentStreak(
    sessions.filter((session) => session.completed).map((session) => session.date),
    new Date(),
  );
  const points = sessions.reduce((sum, session) => sum + session.score, 0);
  const showCallout = phaseIndex === frontier.phaseIndex;
  const calloutDay = frontier;
  const height = 36 + DAYS_PER_PHASE * ROW;

  const frontierPhase = frontier.phaseIndex;
  const frontierDayNumber = frontier.day;
  useEffect(() => {
    const tile = document.getElementById(`day-${dayKey({ phaseIndex: frontierPhase, day: frontierDayNumber })}`);
    tile?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [frontierPhase, frontierDayNumber, phaseIndex, reduce]);

  if (!phase) return null;

  return (
    <div className="screen screen-plan">
      <header className="top">
        <div className="top-links">
          <p className="hello">Hi, take it easy today</p>
          <QuietLinks />
        </div>
        <h1>My Plan</h1>
        <div className="chips">
          <span className="chip chip-flame" data-testid="streak">
            <Flame size={16} color="#B4441E" fill="#B4441E" aria-hidden="true" />
            <strong>{streak}</strong>
            <span className="visually-hidden">day streak</span>
          </span>
          <span className="chip chip-star" data-testid="points">
            <Star size={16} color="#2F6B45" fill="#2F6B45" aria-hidden="true" />
            <strong>{formatPoints(points)}</strong>
            <span className="visually-hidden">points</span>
          </span>
        </div>
      </header>

      <section className="phase-card">
        <p className="phase-kicker">
          Phase {phaseIndex + 1} · {phase.name} · Day {phaseIndex === frontier.phaseIndex ? frontier.day : done === DAYS_PER_PHASE ? DAYS_PER_PHASE : 1} of {DAYS_PER_PHASE}
        </p>
        <h2>{phase.tagline}</h2>
        <p>{phase.blurb}</p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${(done / DAYS_PER_PHASE) * 100}%` }} />
        </div>
        <div className="bar-labels">
          <span>Day 1</span>
          <span>Day 7</span>
          <span>Day 14</span>
          <span>Day 21</span>
          <span>Day 28</span>
        </div>
      </section>

      <div className="phases" role="group" aria-label="Phases">
        {PHASES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === phaseIndex ? 'phase-chip active' : 'phase-chip'}
            aria-pressed={index === phaseIndex}
            onClick={() => setPicked(index)}
          >
            {item.name}
          </button>
        ))}
      </div>

      {showCallout ? <TodayPlan zones={settings.zones} day={calloutDay} /> : null}

      <div className="path-wrap">
        <LeafMark className="leaf leaf-a" />
        <LeafMark className="leaf leaf-b" />
        <LeafMark className="leaf leaf-c" />
        <div className="path" style={{ height }}>
          <svg className="connectors" width={INNER} height={height} aria-hidden="true">
            {Array.from({ length: DAYS_PER_PHASE - 1 }, (_, index) => {
              const from = point(index);
              const to = point(index + 1);
              const next: DayRef = { phaseIndex, day: index + 2 };
              const solid = dayState(next, keys) !== 'locked';
              const mid = (from.y + to.y) / 2;
              return (
                <path
                  key={index}
                  d={`M ${from.x} ${from.y} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}`}
                  stroke={solid ? '#8FC9A0' : '#E4D3C8'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={solid ? undefined : '1 16'}
                />
              );
            })}
          </svg>
          {Array.from({ length: DAYS_PER_PHASE }, (_, index) => {
            const day = index + 1;
            const ref: DayRef = { phaseIndex, day };
            const state = dayState(ref, keys);
            const position = point(index);
            const key = dayKey(ref);
            const title = dayTitle(ref);
            return (
              <DayTile
                key={key}
                id={`day-${key}`}
                testId={`day-${key}`}
                state={state}
                day={day}
                title={title}
                left={position.x - TILE / 2}
                top={position.y - TILE / 2}
                href={`#/game/${ref.phaseIndex}/${ref.day}`}
                onBegin={beginAudio}
              />
            );
          })}
          {showCallout ? (
            <aside className="callout" style={calloutStyle(calloutDay.day - 1)} data-testid="day-callout">
              <h2>{finished ? 'You finished this round' : dayTitle(calloutDay)}</h2>
              <p>
                {finished
                  ? 'Play the last day again whenever you want.'
                  : daySummary(settings.zones, calloutDay)}
              </p>
              <a className="btn btn-coral" href={`#/game/${calloutDay.phaseIndex}/${calloutDay.day}`} data-testid="start-day" onClick={beginAudio}>
                <Play size={18} fill="#3B2A24" aria-hidden="true" />
                Start
              </a>
            </aside>
          ) : (
            <p className="path-note">
              {done === DAYS_PER_PHASE ? 'These days are done.' : 'These days open after the earlier ones.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function daySummary(zones: readonly string[], day: DayRef): string {
  const planned = plannedDay(zones, day);
  const total = (planned?.blocks ?? []).reduce((sum, block) => sum + block.seconds, 0);
  const minutes = Math.max(1, Math.round(total / 60));
  return planned?.light ? `${minutes} min · light day` : `${minutes} min`;
}

function blockLength(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function TodayPlan({ zones, day }: { zones: readonly string[]; day: DayRef }) {
  const planned = plannedDay(zones, day);
  const blocks = blocksForDay(zones, day);
  if (!planned || blocks.length === 0) return null;
  return (
    <section className="card today-card" data-testid="today-plan">
      <h2>{planned.light ? 'Light day' : 'Today'}</h2>
      <p>{daySummary(zones, day)}. One calm breath is always in there.</p>
      <ol className="today-moves">
        {blocks.map((block, index) => (
          <li key={`${block.exerciseId}-${index}`}>
            <strong>{exerciseById(block.exerciseId)?.name ?? 'Move'}</strong>
            <span>{blockLength(block.seconds)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function point(index: number): { x: number; y: number } {
  const leftSide = index % 2 === 0;
  return {
    x: leftSide ? 8 + TILE / 2 : INNER - 8 - TILE / 2,
    y: 24 + TILE / 2 + index * ROW,
  };
}

function calloutStyle(index: number): { left: number; top: number } {
  const tile = point(index);
  const width = 196;
  const left = tile.x > INNER / 2 ? tile.x - TILE / 2 - width - 10 : tile.x + TILE / 2 + 10;
  return { left, top: tile.y - 20 };
}

function DayTile({
  id,
  testId,
  state,
  day,
  title,
  left,
  top,
  href,
  onBegin,
}: {
  id: string;
  testId: string;
  state: 'done' | 'current' | 'locked';
  day: number;
  title: string;
  left: number;
  top: number;
  href: string;
  onBegin: () => void;
}) {
  const style = { left, top };
  const label = state === 'done' ? `Day ${day}, ${title}, done` : state === 'current' ? `Day ${day}, ${title}, ready` : `Day ${day}, not open yet`;
  if (state === 'current') {
    return (
      <a id={id} href={href} className="day-tile current" style={style} data-testid={testId} data-state={state} aria-current="step" aria-label={label} onClick={onBegin}>
        <Play size={18} fill="#3B2A24" aria-hidden="true" />
        <span>Day {day}</span>
      </a>
    );
  }
  return (
    <div id={id} className={`day-tile ${state}`} style={style} data-testid={testId} data-state={state} aria-label={label}>
      {state === 'done' ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
      <span>Day {day}</span>
    </div>
  );
}
