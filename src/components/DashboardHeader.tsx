import { Activity, RefreshCw, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface DashboardHeaderProps {
  gsecYield: number;
  lastSynced: string | null;
  isSyncing: boolean;
  onSync: () => void;
}

export function DashboardHeader({ gsecYield, lastSynced, isSyncing, onSync }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border px-6 py-4">
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
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">G-SEC 10Y</span>
              <span className="text-terminal-amber font-semibold text-sm">{gsecYield.toFixed(2)}%</span>
            </div>
            {lastSynced && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">LAST SYNC</span>
                <span className="text-foreground">{lastSynced}</span>
              </div>
            )}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs gap-1.5 text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber"
              >
                <BookOpen className="h-3.5 w-3.5" />
                METHODOLOGY
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg p-5">
              <div className="space-y-3 text-xs font-mono text-foreground">
                <h2 className="text-sm font-semibold text-foreground">Scoring Methodology</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-green font-semibold text-[11px]">DivScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (REIT_Yield / G-Sec_Yield) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Measures yield premium over risk-free rate.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-amber font-semibold text-[11px]">ValueScore</div>
                    <code className="text-[10px] text-muted-foreground block">= ((NAV - CMP) / NAV) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Discount to NAV. Higher = more undervalued.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (Occupancy + (100 - LTV) + (WALE × 10)) / 3</code>
                    <p className="text-[10px] text-muted-foreground">Direct WALE × 10 scaling.</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                    <div className="text-terminal-cyan font-semibold text-[11px]">GrowthScore</div>
                    <code className="text-[10px] text-muted-foreground block">= (1Y_CAGR / Max_1Y) × 100</code>
                    <p className="text-[10px] text-muted-foreground">Normalized relative to best performer in group.</p>
                  </div>
                </div>
                <div className="bg-secondary/50 rounded p-3">
                  <div className="text-foreground font-semibold text-[11px]">Final Score</div>
                  <code className="text-[10px] text-muted-foreground block">= Σ (Component × Weight%) / Total_Weight</code>
                  <p className="text-[10px] text-muted-foreground mt-1">Weights determined by selected strategy preset or custom sliders.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="font-mono text-xs gap-2 border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:text-terminal-green"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'SYNCING...' : 'SMART SYNC'}
          </Button>
        </div>
      </div>
    </header>
  );
}
