import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

        <div className="flex items-center gap-6">
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
