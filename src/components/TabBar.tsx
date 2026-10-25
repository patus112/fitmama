import { Activity, ChartColumn, Map, User } from 'lucide-react';

const TABS = [
  { name: 'plan', href: '#/plan', label: 'Plan', icon: Map },
  { name: 'exercises', href: '#/exercises', label: 'Exercises', icon: Activity },
  { name: 'progress', href: '#/progress', label: 'Progress', icon: ChartColumn },
  { name: 'settings', href: '#/settings', label: 'Profile', icon: User },
] as const;

export function TabBar({ current }: { current: string }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.name;
        return (
          <a key={tab.name} href={tab.href} className={active ? 'tab active' : 'tab'} aria-current={active ? 'page' : undefined}>
            <Icon size={22} strokeWidth={active ? 2.6 : 2} aria-hidden="true" />
            <span>{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
