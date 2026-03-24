import { BookOpen, FileCode, Scale, Layers } from 'lucide-react';

export default function About() {
  return (
    <div className="flex-1">
      <main className="px-3 sm:px-6 py-6 space-y-8 max-w-[900px] mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono mb-1">About & Methodology</h1>
          <p className="text-xs font-mono text-muted-foreground">
            How RankIndia scores, ranks, and benchmarks Indian REITs and InvITs.
          </p>
        </div>

        {/* Taxation Logic */}
        <section className="card-terminal p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold font-mono text-foreground">Taxation Logic</h2>
          </div>
          <div className="space-y-3 text-xs font-mono text-muted-foreground leading-relaxed">
            <p>
              REIT and InvIT distributions are <span className="text-foreground font-semibold">not uniformly taxed</span>. 
              Each distribution is a mix of components — Interest, Exempt Dividend, Taxable Dividend, 
              Amortization of SPV Debt, and Return of Capital — each with different tax treatment.
            </p>
            <div className="bg-secondary/50 rounded p-3 space-y-2">
              <div className="text-foreground font-semibold text-[11px]">Tax DNA Components</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-destructive">●</span>
                  <div>
                    <span className="text-foreground font-semibold">Interest Income:</span> Taxed at your slab rate (up to 31.2% for HNI).
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">●</span>
                  <div>
                    <span className="text-foreground font-semibold">Exempt Dividend:</span> Tax-free in the hands of the investor.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent">●</span>
                  <div>
                    <span className="text-foreground font-semibold">Taxable Dividend:</span> Taxed at your slab rate. Common in Mindspace REIT.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-terminal-cyan">●</span>
                  <div>
                    <span className="text-foreground font-semibold">Amortization / Debt Repayment:</span> Tax-free (reduces cost basis for capital gains).
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-secondary/50 rounded p-3">
              <div className="text-foreground font-semibold text-[11px] mb-1">Post-Tax Yield Formula</div>
              <code className="text-[10px] text-primary block">
                PostTaxYield = (TTM / CMP) × [(Interest% × (1 - TaxRate)) + (Exempt% × 1) + (Taxable% × (1 - TaxRate)) + (Amortization% × 1)] × 100
              </code>
            </div>
            <p>
              This is why two REITs with identical gross yields can have very different post-tax yields. 
              Embassy REIT (75% exempt dividend) retains ~95% of gross yield at 31.2% tax, 
              while Mindspace (85% taxable dividend) retains only ~73%.
            </p>
          </div>
        </section>

        {/* Why XBRL */}
        <section className="card-terminal p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-terminal-cyan" />
            <h2 className="text-sm font-bold font-mono text-foreground">Why XBRL?</h2>
          </div>
          <div className="space-y-3 text-xs font-mono text-muted-foreground leading-relaxed">
            <p>
              <span className="text-foreground font-semibold">XBRL (eXtensible Business Reporting Language)</span> is the 
              machine-readable financial reporting format mandated by SEBI and BSE for all listed entities.
            </p>
            <div className="bg-secondary/50 rounded p-3 space-y-2">
              <div className="text-foreground font-semibold text-[11px]">Why we use it</div>
              <ul className="space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="text-primary shrink-0">→</span>
                  <span><span className="text-foreground font-semibold">Accuracy:</span> Data comes directly from regulatory filings, not aggregator websites.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary shrink-0">→</span>
                  <span><span className="text-foreground font-semibold">Timeliness:</span> We parse XBRL Instance Documents within hours of board meeting announcements.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary shrink-0">→</span>
                  <span><span className="text-foreground font-semibold">Transparency:</span> Every metric is traceable to a specific XML tag in the source filing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary shrink-0">→</span>
                  <span><span className="text-foreground font-semibold">Automation:</span> No manual data entry = no human errors in distribution splits.</span>
                </li>
              </ul>
            </div>
            <p>
              The BSE Corporate Filings API serves as our primary data source. We query for 
              specific scrip codes and filter for 'Financial Results' XBRL filings. The XML 
              is parsed client-side using <code className="text-primary">fast-xml-parser</code>.
            </p>
          </div>
        </section>

        {/* Equity vs Hybrid */}
        <section className="card-terminal p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-bold font-mono text-foreground">Equity vs. Hybrid Classification (2026 Update)</h2>
          </div>
          <div className="space-y-3 text-xs font-mono text-muted-foreground leading-relaxed">
            <p>
              As of FY26, SEBI has not yet formally classified Indian REITs into 'Equity' and 'Hybrid' 
              sub-categories the way mutual funds are. However, the market is evolving:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-terminal-blue font-semibold text-[11px]">Pure-Play REITs</div>
                <p className="text-[10px]">
                  Embassy, Mindspace, Brookfield — primarily office assets generating rental income. 
                  Distribution is mostly from lease rentals. Behave like <span className="text-foreground font-semibold">equity-like instruments</span> with 
                  property market exposure.
                </p>
              </div>
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-accent font-semibold text-[11px]">Retail/Hybrid REITs</div>
                <p className="text-[10px]">
                  Nexus Select Trust — mixed retail assets with higher consumer cyclicality. 
                  Revenue tied to tenant sales, footfall, and consumption patterns. 
                  Higher growth potential but more volatile distributions.
                </p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded p-3 space-y-2">
              <div className="text-foreground font-semibold text-[11px]">InvIT Classification</div>
              <p className="text-[10px]">
                Infrastructure InvITs are further segmented by asset type:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-teal-400 font-semibold">Road/Toll:</span> IRB, NHIT, Bharat Highways — 
                  WPI-linked toll hikes provide inflation protection. Finite concession life.
                </div>
                <div>
                  <span className="text-teal-400 font-semibold">Transmission:</span> IndiGrid, PowerGrid — 
                  Fixed annuity model with regulated returns. Lower growth, higher predictability.
                </div>
                <div>
                  <span className="text-teal-400 font-semibold">Future:</span> Data centers, renewable energy 
                  InvITs expected in 2026-2027 pipeline.
                </div>
              </div>
            </div>
            <p>
              RankIndia applies sector-specific scoring adjustments: Road/Toll InvITs receive a 1.2× growth 
              multiplier (WPI-linked hikes), while Transmission InvITs use 0.8× (fixed annuity).
            </p>
          </div>
        </section>

        {/* Scoring Methodology */}
        <section className="card-terminal p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold font-mono text-foreground">Scoring Methodology</h2>
          </div>
          <div className="space-y-3 text-xs font-mono text-muted-foreground leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-primary font-semibold text-[11px]">DivScore</div>
                <code className="text-[10px] block">= (Post-Tax Yield / G-Sec Yield) × 100</code>
                <p className="text-[10px]">Measures yield premium over the risk-free rate.</p>
              </div>
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-accent font-semibold text-[11px]">ValueScore</div>
                <code className="text-[10px] block">= ((NAV - CMP) / NAV) × 100</code>
                <p className="text-[10px]">Discount to Net Asset Value. Higher = more undervalued.</p>
              </div>
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-terminal-blue font-semibold text-[11px]">SafetyScore (REIT)</div>
                <code className="text-[10px] block">= (Occ × 0.4) + (WALE/10 × 0.4) + ((1-LTV) × 0.2)</code>
                <p className="text-[10px]">40% occupancy, 40% lease duration, 20% leverage.</p>
              </div>
              <div className="bg-secondary/50 rounded p-3 space-y-1.5">
                <div className="text-teal-400 font-semibold text-[11px]">SafetyScore (InvIT)</div>
                <code className="text-[10px] block">= (Avail% × 0.5) + (min(Life, 30) × 1.66)</code>
                <p className="text-[10px]">Availability + remaining concession life.</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded p-3">
              <div className="text-foreground font-semibold text-[11px]">Strategy Weighting</div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                <div><span className="text-primary font-semibold">Income:</span> 70% Yield · 20% Safety · 10% Growth</div>
                <div><span className="text-terminal-cyan font-semibold">Growth:</span> 60% Growth · 20% Yield · 20% Safety</div>
                <div><span className="text-terminal-blue font-semibold">Risk Averse:</span> 60% Safety · 30% Yield · 10% Growth</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
