import { NavLink as RouterNavLink } from 'react-router-dom';
import { BarChart3, Building2, Zap, Trophy, BookOpen, RefreshCw, AlertTriangle, FileWarning, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { GSecStatus } from '@/lib/gsec-service';
import type { SyncError } from '@/lib/sync-engine';
import type { TaxBracket } from '@/lib/reit-types';
import { TAX_BRACKETS } from '@/lib/reit-types';

export interface TopNavProps {
  gsecYield?: number;
  gsecStatus?: GSecStatus;
  lastSynced?: string | null;
  syncFailed?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  syncErrors?: SyncError[];
  taxRate?: TaxBracket;
  onTaxRateChange?: (rate: TaxBracket) => void;
}

export function TopNav({
  gsecYield, gsecStatus, lastSynced, syncFailed, isSyncing, onSync,
  syncErrors = [], taxRate, onTaxRateChange,
}: TopNavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-all border ${
      isActive
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'
    }`;

  const hasDashboard = gsecYield !== undefined && onSync;

  const pulseColor = gsecStatus === 'live'
    ? 'bg-terminal-green'
    : gsecStatus === 'cached'
      ? 'bg-terminal-amber'
      : 'bg-terminal-red';

  const pulseLabel = gsecStatus === 'live'
    ? 'LIVE'
    : gsecStatus === 'cached'
      ? 'CACHED'
      : 'FALLBACK';

  return (
    <TooltipProvider>
      <nav className="border-b border-border px-3 sm:px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
        {/* Brand */}
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono font-bold text-foreground">RankIndia</span>
        </div>

        {/* Nav Links */}
        <RouterNavLink to="/ranker" className={linkClass}>
          <Trophy className="h-3 w-3" />
          <span className="hidden sm:inline">Ranker</span>
        </RouterNavLink>
        <RouterNavLink to="/" className={linkClass}>
          <Building2 className="h-3 w-3" />
          <span className="hidden sm:inline">REITs</span>
        </RouterNavLink>
        <RouterNavLink to="/invits" className={linkClass}>
          <Zap className="h-3 w-3" />
          <span className="hidden sm:inline">InvITs</span>
        </RouterNavLink>
        <RouterNavLink to="/about" className={linkClass}>
          <BookOpen className="h-3 w-3" />
          <span className="hidden sm:inline">About</span>
        </RouterNavLink>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dashboard controls — right side */}
        {hasDashboard && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* G-Sec Benchmark */}
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pulseColor}`} />
              </span>
              <span className="text-foreground font-bold text-xs font-mono">{gsecYield!.toFixed(2)}%</span>
              <span className={`text-[7px] px-0.5 py-0 rounded uppercase ${
                gsecStatus === 'live'
                  ? 'bg-terminal-green/15 text-terminal-green'
                  : gsecStatus === 'cached'
                    ? 'bg-terminal-amber/15 text-terminal-amber'
                    : 'bg-terminal-red/15 text-terminal-red'
              }`}>{pulseLabel}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] font-mono max-w-[260px]">
                  <p>India 10Y G-Sec — the risk-free benchmark rate.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Tax Selector */}
            {taxRate !== undefined && onTaxRateChange && (
              <Select value={String(taxRate)} onValueChange={(v) => onTaxRateChange(Number(v) as TaxBracket)}>
                <SelectTrigger className="h-6 w-[70px] text-[9px] font-mono border-border bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_BRACKETS.map(rate => (
                    <SelectItem key={rate} value={String(rate)} className="text-xs font-mono">
                      {rate === 0 ? '0%' : rate === 31.2 ? '31.2% HNI' : `${rate}%`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Error Log */}
            {syncErrors.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 font-mono text-[9px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 px-1.5">
                    <FileWarning className="h-3 w-3" />
                    ({syncErrors.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-lg p-4 max-h-[85vh] overflow-y-auto">
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h2 className="text-sm font-semibold text-foreground">Sync Error Log</h2>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {syncErrors.map((err, i) => (
                        <div key={i} className="bg-destructive/5 border border-destructive/20 rounded p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-destructive font-semibold text-[11px]">{err.source}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(err.timestamp).toLocaleTimeString('en-IN')}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground break-all">{err.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="h-6 font-mono text-[9px] gap-1 border-primary/30 text-primary hover:bg-primary/10 px-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '...' : 'SYNC'}
            </Button>
            {lastSynced && (
              <span className={`text-[7px] font-mono ${syncFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
                {lastSynced}
              </span>
            )}
          </div>
        )}
      </nav>
    </TooltipProvider>
  );
}
