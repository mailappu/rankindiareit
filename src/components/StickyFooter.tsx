export function StickyFooter() {
  return (
    <footer className="border-t border-border bg-card px-3 sm:px-6 py-3 mt-auto">
      <div className="max-w-[1600px] mx-auto space-y-2">
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclaimer:</span> Educational purposes only. Data parsed from BSE XBRL Filings. Investment in REITs/InvITs is subject to market risk. Please consult a certified financial advisor.
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
            {' '}| 2026
          </span>
        </div>
      </div>
    </footer>
  );
}
