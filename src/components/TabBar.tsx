import { Activity, Play } from 'lucide-react';

const TABS = [
  { name: 'plan', href: '#/plan', label: 'Game', icon: Play },
  { name: 'exercises', href: '#/exercises', label: 'Library', icon: Activity },
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
