export function StickyFooter() {
  return (
    <footer className="border-t border-border bg-card px-3 sm:px-6 py-3 mt-auto">
      <div className="max-w-[1600px] mx-auto space-y-2">
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclaimer:</span> Not Financial Advice. This tool parses official NSE XBRL filings for educational purposes. Investment in REITs/InvITs is subject to market risk, interest rate risk, and liquidity risk. Please consult a certified financial advisor before making any investment decisions.
          </p>
        </div>
        <div className="flex items-start gap-2 pt-1 border-t border-border/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-accent-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed italic">
            <span className="font-semibold not-italic text-foreground">Developer Note:</span> This application was 'Vibe Coded' using generative AI. Users should <span className="font-semibold text-foreground not-italic">cross-verify</span> all rankings and metrics against official SEBI filings.
          </p>
        </div>
        <div className="text-center pt-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            Crafted by{' '}
            <a
              href="https://www.linkedin.com/in/pradeep-kumars/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              Pradeep
            </a>
            {' '}| 2026 Build
          </span>
        </div>
      </div>
    </footer>
  );
}
