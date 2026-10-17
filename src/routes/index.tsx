import { createFileRoute } from "@tanstack/react-router";
import { ElectionProvider, QUORUM, useElection, type Workspace } from "@/lib/election-store";
import { Dot, Pill, Segmented } from "@/components/votia/primitives";
import { VoterApp } from "@/components/votia/VoterApp";
import { Console } from "@/components/votia/Console";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Votia — Organisational Election & Electoral Board Suite" },
      { name: "description", content: "Weighted, ranked-choice and resolution ballots with zero-knowledge receipts, live quorum and 3-of-5 board certification." },
      { property: "og:title", content: "Votia — Election & Board Governance" },
      { property: "og:description", content: "Run verifiable AGM elections with live turnout, quorum and cryptographic audit ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ElectionProvider>
      <App />
    </ElectionProvider>
  ),
});

function App() {
  const { workspace, setWorkspace, stats, certified } = useElection();
  return (
    <div className="flex h-screen flex-col">
      <header className="glass sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">V</div>
          <span className="text-lg font-semibold tracking-tight">Votia</span>
          <Pill solid={certified}>
            <Dot live={!certified} /> AGM 2026 · {certified ? "Certified & Sealed" : "Quorum Live"}
          </Pill>
          <Pill>
            Turnout <span className="font-mono">{stats.turnout.toFixed(1)}%</span> / {QUORUM}%
          </Pill>
        </div>
        <Segmented<Workspace>
          value={workspace}
          onChange={setWorkspace}
          options={[
            { value: "voter", label: "Voter Mobile" },
            { value: "console", label: "Board & Org Console" },
            { value: "dual", label: "Live Dual View" },
          ]}
        />
      </header>
      <div className="min-h-0 flex-1 p-5">
        {workspace === "voter" && (
          <div className="mx-auto h-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-background shadow-card">
            <VoterApp />
          </div>
        )}
        {workspace === "console" && <Console />}
        {workspace === "dual" && (
          <div className="flex h-full gap-6">
            <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-hairline bg-background">
              <VoterApp />
            </div>
            <div className="min-w-0 flex-1"><Console /></div>
          </div>
        )}
      </div>
    </div>
  );
}
