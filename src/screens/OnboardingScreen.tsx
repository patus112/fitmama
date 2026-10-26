import { useState } from 'react';
import { DISCLAIMER, ZONES, type ZoneId } from '../domain/zones';
import { useAppState } from '../state/AppState';

export function OnboardingScreen() {
  const { setZones } = useAppState();
  const [picked, setPicked] = useState<ZoneId[]>([]);
  const [acked, setAcked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = picked.length > 0 && acked && !saving;

  function toggle(id: ZoneId) {
    setPicked((current) => (current.includes(id) ? current.filter((zone) => zone !== id) : [...current, id]));
  }

  async function build() {
    if (!ready) return;
    setSaving(true);
    setError(null);
    try {
      await setZones(picked);
      window.location.hash = '#/plan';
    } catch {
      setSaving(false);
      setError('Could not save that on this phone. Nothing left the device.');
    }
  }

  return (
    <div className="screen onboard" data-testid="onboarding">
      <header className="top block-top">
        <p className="hello">A plan that follows you</p>
        <h1>Choose your zones</h1>
      </header>
      <p className="lede">
        Pick every place you want to look after. Fit Mama builds a 28-day phase from those moves, about 10 to 20 calm minutes a day.
      </p>
      <ul className="safety-list">
        <li>No crunches or sit-ups.</li>
        <li>No fast head movement.</li>
        <li>No deep forward bends.</li>
        <li>Everything stays slow, and never into pain.</li>
      </ul>
      <div className="zone-grid" role="group" aria-label="Zones">
        {ZONES.map((zone) => {
          const on = picked.includes(zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              className={on ? 'zone-pick on' : 'zone-pick'}
              aria-pressed={on}
              onClick={() => toggle(zone.id)}
            >
              <span>{zone.name}</span>
              <small>{zone.hint}</small>
            </button>
          );
        })}
      </div>
      <label className="ack">
        <input type="checkbox" checked={acked} onChange={(event) => setAcked(event.target.checked)} />
        <span>{DISCLAIMER}</span>
      </label>
      {error ? (
        <p className="notice" role="status">
          {error}
        </p>
      ) : null}
      <button type="button" className="btn btn-coral" disabled={!ready} onClick={() => void build()}>
        {saving ? 'Saving on this phone' : 'Build my plan'}
      </button>
    </div>
  );
}
