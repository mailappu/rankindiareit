import { TopNav } from '@/components/TopNav';
import { TerminologyCard } from '@/components/TerminologyCard';
import { MethodologyCard } from '@/components/MethodologyCard';

export default function Terminology() {
  return (
    <div className="flex-1 flex flex-col">
      <TopNav />
      <main className="flex-1 px-3 sm:px-6 py-4 space-y-4 max-w-[1600px] mx-auto w-full">
        <h1 className="text-lg font-mono font-bold text-foreground">Terminology & Methodology</h1>
        <TerminologyCard defaultExpanded />
        <MethodologyCard defaultExpanded />
      </main>
    </div>
  );
}
