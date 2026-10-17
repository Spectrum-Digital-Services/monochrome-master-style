import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Vote, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Votia — Secure Organisational Elections" },
      { name: "description", content: "Create election events, invite voters by secure link, and run anonymous, verifiable ballots for your organisation." },
      { property: "og:title", content: "Votia — Secure Organisational Elections" },
      { property: "og:description", content: "Create election events, invite voters by secure link, and run anonymous, verifiable ballots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-hairline px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">V</div>
          <span className="text-lg font-semibold tracking-tight">Votia</span>
        </div>
        <Link to="/auth" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Organiser sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Elections your members can trust
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Create an election event, add candidates, documents and decision criteria, then invite voters
          with a personal secure link. Ballots are anonymous — no voter identity is ever stored with a vote.
        </p>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-card p-6 text-left shadow-card">
            <Building2 className="h-6 w-6" />
            <h2 className="mt-3 font-semibold">For organisers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your organisation email, Google or Microsoft to create and manage election events.
            </p>
            <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Open the console
            </Link>
          </div>
          <div className="rounded-2xl border border-hairline bg-card p-6 text-left shadow-card">
            <Vote className="h-6 w-6" />
            <h2 className="mt-3 font-semibold">For voters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No account needed. Open the secure invite link from your email and cast your ballot in seconds.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Anonymous by design — verified by receipt hash
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline px-6 py-4 text-center text-xs text-muted-foreground">
        Votia — secure organisational elections
      </footer>
    </div>
  );
}
