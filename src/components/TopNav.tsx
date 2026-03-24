import { NavLink as RouterNavLink } from 'react-router-dom';
import { BarChart3, Building2, Zap, Trophy, BookOpen } from 'lucide-react';

export function TopNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all border ${
      isActive
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'
    }`;

  return (
    <nav className="border-b border-border px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto">
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-mono">
          <span className="font-bold text-foreground">RankIndia</span>
        </span>
      </div>
      <RouterNavLink to="/ranker" className={linkClass}>
        <Trophy className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Master Ranker</span>
        <span className="sm:hidden">Ranker</span>
      </RouterNavLink>
      <RouterNavLink to="/" className={linkClass}>
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Commercial REITs</span>
        <span className="sm:hidden">REITs</span>
      </RouterNavLink>
      <RouterNavLink to="/invits" className={linkClass}>
        <Zap className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Infrastructure InvITs</span>
        <span className="sm:hidden">InvITs</span>
      </RouterNavLink>
      <RouterNavLink to="/about" className={linkClass}>
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">About & Methodology</span>
        <span className="sm:hidden">About</span>
      </RouterNavLink>
    </nav>
  );
}
