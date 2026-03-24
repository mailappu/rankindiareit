import { RefreshCw, ShieldCheck, AlertTriangle, FileWarning, BadgeCheck, Info } from 'lucide-react';
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
  onRefreshData?: () => void;
  isRefreshingData?: boolean;
  lastDataSync?: string | null;
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
      <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
        {/* Benchmark — inline */}
        <TooltipProvider>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
            </span>
            <span className="text-foreground font-bold text-sm font-mono">{gsecYield.toFixed(2)}%</span>
            <span className="text-[9px] font-mono text-muted-foreground hidden sm:inline">G-Sec</span>
            <span className={`text-[8px] px-1 py-0.5 rounded uppercase ${
              gsecStatus === 'live'
                ? 'bg-terminal-green/15 text-terminal-green'
                : gsecStatus === 'cached'
                  ? 'bg-terminal-amber/15 text-terminal-amber'
                  : 'bg-terminal-red/15 text-terminal-red'
            }`}>{pulseLabel}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] font-mono max-w-[260px]">
                <p>The 10-Year Indian Government Bond (G-Sec) represents the 'Risk-Free Rate'. REITs must yield significantly more than this to compensate for property and market risks.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Tax Bracket Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono self-center">
          <span className="hidden sm:inline text-muted-foreground">TAX</span>
          <Select value={String(taxRate)} onValueChange={(v) => onTaxRateChange(Number(v) as TaxBracket)}>
            <SelectTrigger className="h-7 w-[80px] text-[10px] font-mono border-border bg-secondary/50">
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
        </div>

        {/* Error Log */}
        {syncErrors.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[10px] sm:text-xs gap-1 sm:gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive px-2 sm:px-3 self-center"
              >
                <FileWarning className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ERROR LOG</span> ({syncErrors.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h2 className="text-sm font-semibold text-foreground">Sync Error Log</h2>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  The following sources encountered errors during the last sync. Existing cached data is preserved.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {syncErrors.map((err, i) => (
                    <div key={i} className="bg-destructive/5 border border-destructive/20 rounded p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-destructive font-semibold text-[11px]">{err.source}</span>
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

        {/* Sync — inline */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="font-mono text-[10px] sm:text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary px-2 sm:px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'SYNCING...' : 'SYNC'}
          </Button>
          {lastSynced && (
            <span className={`text-[8px] font-mono ${syncFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lastSynced}{syncFailed ? ' ✗' : ''}
            </span>
          )}
        </div>
      </div>

      {provenanceBadge && !syncFailed && (
        <div className="mt-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-mono text-primary/80">{provenanceBadge}</span>
        </div>
      )}

      {syncFailed && (
        <div className="mt-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-[10px] font-mono text-destructive/80">Sync failed — using cached/fallback data.</span>
        </div>
      )}
    </header>
  );
}
