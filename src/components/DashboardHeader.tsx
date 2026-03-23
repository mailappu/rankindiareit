import { RefreshCw, ShieldCheck, AlertTriangle, FileWarning, BadgeCheck, BarChart3, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { GSecStatus } from '@/lib/gsec-service';
import type { SyncError } from '@/lib/sync-engine';
import type { TaxBracket } from '@/lib/reit-types';
import { TAX_BRACKETS } from '@/lib/reit-types';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface DashboardHeaderProps {
  gsecYield: number;
  gsecStatus: GSecStatus;
  lastSynced: string | null;
  syncFailed: boolean;
  isSyncing: boolean;
  onSync: () => void;
  provenanceBadge: string | null;
  syncErrors: SyncError[];
  taxRate: TaxBracket;
  onTaxRateChange: (rate: TaxBracket) => void;
}

export function DashboardHeader({ gsecYield, gsecStatus, lastSynced, syncFailed, isSyncing, onSync, provenanceBadge, syncErrors, taxRate, onTaxRateChange }: DashboardHeaderProps) {
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
    <header className="border-b border-border px-3 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Logo + tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg tracking-tight text-foreground">
              <span className="font-bold">RankIndia</span><span className="font-light text-primary">REIT</span>
            </h1>
            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">BETA</span>
          </div>
          <span className="hidden md:block text-[10px] text-muted-foreground font-mono border-l border-border pl-3">AI-Powered Yield Analysis &amp; Risk Benchmarking</span>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Benchmark indicator */}
          <TooltipProvider>
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity cursor-pointer text-xs font-mono">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
                </span>
                <span className="hidden sm:inline text-muted-foreground">BENCHMARK</span>
                <span className="text-terminal-amber font-semibold text-sm">{gsecYield.toFixed(2)}%</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px] font-mono max-w-[260px]">
                    <p>The 10-Year Indian Government Bond (G-Sec) represents the 'Risk-Free Rate'. REITs must yield significantly more than this to compensate for property and market risks.</p>
                  </TooltipContent>
                </Tooltip>
                <span title="Verified Mar 21, 2026"><BadgeCheck className="h-3.5 w-3.5 text-terminal-green" /></span>
                <span className={`text-[8px] px-1 py-0.5 rounded uppercase ${
                  gsecStatus === 'live'
                    ? 'bg-terminal-green/15 text-terminal-green'
                    : gsecStatus === 'cached'
                      ? 'bg-terminal-amber/15 text-terminal-amber'
                      : 'bg-terminal-red/15 text-terminal-red'
                }`}>{pulseLabel}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
              <div className="space-y-3 text-xs font-mono text-foreground">
                <h2 className="text-sm font-semibold text-foreground">Scoring Methodology</h2>
                <div className="bg-terminal-amber/10 border border-terminal-amber/20 rounded p-3 mb-3">
                  <div className="text-terminal-amber font-semibold text-[11px]">Current Benchmark: {gsecYield.toFixed(3)}% G-Sec 10Y</div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {gsecStatus === 'live'
                      ? 'Fetched live from public bond data (cached for 4 hours). All DivScores recalculate automatically when this changes by ≥0.02%.'
                      : gsecStatus === 'cached'
                        ? 'Using cached rate (over 4 hours old). Click Smart Sync to refresh.'
                        : 'Using verified fallback rate (Mar 21, 2026). Click Smart Sync to fetch live rate.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-green font-semibold text-[11px]">DivScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (REIT_Yield / {gsecYield.toFixed(3)}%) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Yield premium over risk-free rate.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-amber font-semibold text-[11px]">ValueScore</div>
                    <code className="text-[10px] text-muted-foreground block">= ((NAV - CMP) / NAV) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Discount to NAV.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (Occ + (100-LTV) + WALE×10) / 3</code>
                    <p className="text-[10px] text-muted-foreground">Direct WALE × 10 scaling.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-cyan font-semibold text-[11px]">GrowthScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (1Y_CAGR / Max_1Y) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Normalized to best performer.</p>
                  </div>
                </div>
                <div className="bg-secondary/50 rounded p-3">
                  <div className="text-foreground font-semibold text-[11px]">Final Score</div>
                  <code className="text-[10px] text-muted-foreground block">= Σ (Component × Weight%) / Total_Weight</code>
                </div>
                <div className="bg-terminal-blue/10 border border-terminal-blue/20 rounded p-3">
                  <div className="text-terminal-blue font-semibold text-[11px]">⚡ Age Normalization</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Ranking for younger REITs (like Nexus) is normalized by shifting CAGR weightage to current Yield and Operational Metrics so the final score remains fair and out of 100.</p>
                </div>
                <div className="bg-secondary/50 rounded p-3">
                  <div className="text-foreground font-semibold text-[11px]">🔄 Smart Sync</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">HEAD requests are proxied through an edge function to bypass CORS. Only re-parses PDFs when content-length or last-modified headers change.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {lastSynced && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="hidden sm:inline text-muted-foreground">SYNCED</span>
              <span className={syncFailed ? 'text-terminal-red' : 'text-foreground'}>
                {lastSynced}
                {syncFailed && <span className="ml-1 text-terminal-red">(Failed)</span>}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {syncErrors.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-[10px] sm:text-xs gap-1 sm:gap-1.5 border-terminal-red/30 text-terminal-red hover:bg-terminal-red/10 hover:text-terminal-red px-2 sm:px-3"
                  >
                    <FileWarning className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ERROR LOG</span> ({syncErrors.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-lg p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-terminal-red" />
                      <h2 className="text-sm font-semibold text-foreground">Sync Error Log</h2>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      The following sources encountered errors during the last sync. Existing cached data is preserved.
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {syncErrors.map((err, i) => (
                        <div key={i} className="bg-terminal-red/5 border border-terminal-red/20 rounded p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-terminal-red font-semibold text-[11px]">{err.source}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(err.timestamp).toLocaleTimeString('en-IN')}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground break-all">{err.message}</p>
                          <code className="text-[9px] text-muted-foreground/60 block truncate">{err.url}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="font-mono text-[10px] sm:text-xs gap-1.5 border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:text-terminal-green px-2 sm:px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'SYNC...' : 'SYNC'}
            </Button>
          </div>
        </div>
      </div>

      {provenanceBadge && !syncFailed && (
        <div className="mt-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-terminal-green" />
          <span className="text-[10px] font-mono text-terminal-green/80">{provenanceBadge}</span>
        </div>
      )}

      {syncFailed && (
        <div className="mt-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-terminal-red" />
          <span className="text-[10px] font-mono text-terminal-red/80">Sync failed — using cached/fallback data.</span>
        </div>
      )}
    </header>
  );
}
