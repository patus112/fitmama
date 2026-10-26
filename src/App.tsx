import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { useRoute } from './routing';
import { ExerciseDetailScreen } from './screens/ExerciseDetailScreen';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { GameScreen, PracticeScreen } from './screens/GameScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useAppState } from './state/AppState';

export function App() {
  const route = useRoute();
  const { ready, storageError, settings } = useAppState();
  const showTabs = route.name === 'plan' || route.name === 'exercises' || route.name === 'progress' || route.name === 'settings';
  const needsPlan = !settings.disclaimerAck || settings.zones.length === 0;

  useEffect(() => {
    const titles: Record<string, string> = {
      plan: 'My Plan · Fit Mama',
      exercises: 'Library · Fit Mama',
      exercise: 'Exercise · Fit Mama',
      game: 'Game · Fit Mama',
      practice: 'Practice · Fit Mama',
      results: 'Your rhythm · Fit Mama',
      progress: 'Progress · Fit Mama',
      settings: 'Profile · Fit Mama',
      missing: 'Fit Mama',
    };
    document.title = titles[route.name] ?? 'Fit Mama';
  }, [route.name]);

  if (!ready) {
    return (
      <div className="boot">
        <p>Opening your plan…</p>
      </div>
    );
  }

  if (needsPlan) return <OnboardingScreen />;

  return (
    <div className={showTabs ? 'shell' : 'shell shell-full'}>
      {storageError ? (
        <p className="banner" role="status">
          {storageError}
        </p>
      ) : null}
      <main>
        {route.name === 'plan' ? <PlanScreen /> : null}
        {route.name === 'exercises' ? <ExercisesScreen /> : null}
        {route.name === 'exercise' ? <ExerciseDetailScreen id={route.id} /> : null}
        {route.name === 'game' ? <GameScreen phaseIndex={route.phaseIndex} day={route.day} /> : null}
        {route.name === 'practice' ? <PracticeScreen id={route.id} /> : null}
        {route.name === 'results' ? <ResultsScreen sessionId={route.sessionId} /> : null}
        {route.name === 'progress' ? <ProgressScreen /> : null}
        {route.name === 'settings' ? <SettingsScreen /> : null}
        {route.name === 'missing' ? (
          <div className="screen">
            <h1>That page is not here</h1>
            <a className="btn btn-coral" href="#/plan">
              Back to my plan
            </a>
          </div>
        ) : null}
      </main>
      {showTabs ? <TabBar current={route.name === 'plan' || route.name === 'exercises' ? route.name : ''} /> : null}
    </div>
  );
}
