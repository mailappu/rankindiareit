import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { REITData, ScoreBreakdown } from '@/lib/reit-types';
import { getHeatmapClass } from '@/lib/reit-scoring';

type ScoredREIT = REITData & ScoreBreakdown;
type SortKey = keyof ScoredREIT;

interface REITTableProps {
  data: ScoredREIT[];
}

const COLUMNS: { key: SortKey; label: string; format?: (v: any, r: ScoredREIT) => string; heatmap?: string }[] = [
  { key: 'name', label: 'REIT' },
  { key: 'rank', label: '#' },
  { key: 'finalScore', label: 'Score', format: v => v.toFixed(1), heatmap: 'finalScore' },
  { key: 'cmp', label: 'CMP (₹)', format: v => `₹${v}` },
  { key: 'nav', label: 'NAV (₹)', format: v => `₹${v}` },
  { key: 'divYield', label: 'Div Yield', format: v => `${v.toFixed(1)}%`, heatmap: 'divYield' },
  { key: 'growth1Y', label: '1Y CAGR', format: v => `${v.toFixed(1)}%`, heatmap: 'growth' },
  { key: 'growth3Y', label: '3Y CAGR', format: v => `${v.toFixed(1)}%`, heatmap: 'growth' },
  { key: 'growth5Y', label: '5Y CAGR', format: (v) => v !== null ? `${v.toFixed(1)}%` : 'N/A' },
  { key: 'sector', label: 'Sector' },
  { key: 'valueScore', label: 'Value%', format: v => `${v.toFixed(1)}%`, heatmap: 'valueScore' },
  { key: 'divScore', label: 'DivScore', format: v => v.toFixed(1) },
  { key: 'occupancy', label: 'Occup.', format: v => `${v}%`, heatmap: 'occupancy' },
  { key: 'wale', label: 'WALE', format: v => `${v}Y` },
  { key: 'ltv', label: 'LTV', format: v => `${v}%`, heatmap: 'ltv' },
  { key: 'safetyScore', label: 'Safety', format: v => v.toFixed(1) },
  { key: 'pipeline', label: 'Pipeline', format: v => `${v}M sqft` },
];

export function REITTable({ data }: REITTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'rank'); }
  };

  const getRankBadge = (rank: number) => {
    const colors = ['text-terminal-green', 'text-terminal-amber', 'text-terminal-blue', 'text-muted-foreground'];
    return colors[rank - 1] || colors[3];
  };

  return (
    <div className="card-terminal overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((reit) => (
              <tr key={reit.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                {COLUMNS.map(col => {
                  const val = reit[col.key];
                  const heatClass = col.heatmap && val !== null ? getHeatmapClass(val as number, col.heatmap) : '';

                  if (col.key === 'rank') {
                    return (
                      <td key={col.key} className="px-3 py-2.5">
                        <span className={`font-bold text-sm ${getRankBadge(reit.rank)}`}>
                          {reit.rank}
                        </span>
                      </td>
                    );
                  }

                  if (col.key === 'name') {
                    return (
                      <td key={col.key} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-foreground text-xs">{reit.ticker}</div>
                            <div className="text-[10px] text-muted-foreground">{reit.name}</div>
                          </div>
                          <a href={reit.irUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-terminal-blue">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                    );
                  }

                  if (col.key === 'sector') {
                    return (
                      <td key={col.key} className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          reit.sector === 'Retail' ? 'bg-terminal-amber/15 text-terminal-amber' : 'bg-terminal-blue/15 text-terminal-blue'
                        }`}>
                          {reit.sector}
                        </span>
                      </td>
                    );
                  }

                  return (
                    <td key={col.key} className={`px-3 py-2.5 ${heatClass} ${
                      col.key === 'finalScore' ? 'font-bold text-sm text-foreground' : 'text-foreground'
                    } ${val === null ? 'text-muted-foreground italic' : ''}`}>
                      {col.format ? col.format(val, reit) : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
