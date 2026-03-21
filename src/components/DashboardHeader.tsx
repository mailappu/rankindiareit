import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { GSecStatus } from '@/lib/gsec-service';

interface DashboardHeaderProps {
  gsecYield: number;
  gsecStatus: GSecStatus;
  lastSynced: string | null;
  isSyncing: boolean;
  onSync: () => void;
  provenanceBadge: string | null;
}

export function DashboardHeader({ gsecYield, gsecStatus, lastSynced, isSyncing, onSync, provenanceBadge }: DashboardHeaderProps) {
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
    <header className="border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-terminal-green" />
            <h1 className="text-lg font-semibold font-mono tracking-tight text-foreground">
              SMART REIT ANALYST
            </h1>
          </div>
          <span className="text-xs text-muted-foreground font-mono">INDIA</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs font-mono">
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
                  </span>
                  <span className="text-muted-foreground">BENCHMARK</span>
                  <span className="text-terminal-amber font-semibold text-sm">{gsecYield.toFixed(3)}%</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded uppercase ${
                    gsecStatus === 'live'
                      ? 'bg-terminal-green/15 text-terminal-green'
                      : gsecStatus === 'cached'
                        ? 'bg-terminal-amber/15 text-terminal-amber'
                        : 'bg-terminal-red/15 text-terminal-red'
                  }`}>{pulseLabel}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg p-5">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                      <div className="text-terminal-green font-semibold text-[11px]">DivScore</div>
                      <code className="text-[10px] text-muted-foreground block">= (REIT_Yield / {gsecYield}%) × 100</code>
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
                    <p className="text-[10px] text-muted-foreground leading-relaxed">For younger REITs (e.g. Nexus, listed May 2023), missing 3Y/5Y CAGR weight is redistributed 60% to Dividend Yield and 40% to Safety, keeping the score fair and out of 100.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3">
                    <div className="text-foreground font-semibold text-[11px]">🔄 Smart Sync</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">HEAD requests are proxied through an edge function to bypass CORS. Only re-parses PDFs when content-length or last-modified headers change.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {lastSynced && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">SYNCED</span>
                <span className="text-foreground">{lastSynced}</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="font-mono text-xs gap-2 border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:text-terminal-green"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'CHECKING...' : 'SMART SYNC'}
          </Button>
        </div>
      </div>

      {provenanceBadge && (
        <div className="mt-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-terminal-green" />
          <span className="text-[10px] font-mono text-terminal-green/80">{provenanceBadge}</span>
        </div>
      )}
    </header>
  );
}
