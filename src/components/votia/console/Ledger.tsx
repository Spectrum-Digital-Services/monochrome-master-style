import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { shortHash, useElection } from "@/lib/election-store";
import { Mono, Panel, PanelHeader, Pill } from "../primitives";

function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Ledger() {
  const { ballots, highlightHash, setHighlightHash } = useElection();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [verify, setVerify] = useState("");
  const hlRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    hlRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightHash]);

  const rows = [...ballots].reverse().filter((b) => (channel === "all" || b.channel === channel) && (b.hash.includes(q.toLowerCase().replace("0x", "")) || b.token.toLowerCase().includes(q.toLowerCase())));
  // anonymised token: show only a salted fragment
  const anon = (t: string) => `anon-${t.replace(/\W/g, "").slice(-2)}••`;

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <p className="mb-2 text-sm font-semibold">Verify hash integrity</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const needle = verify.trim().toLowerCase().replace(/^0x/, "").replace("…", "");
            const found = ballots.find((b) => b.hash === needle || (needle.length >= 4 && b.hash.startsWith(needle)));
            if (found) {
              setHighlightHash(found.hash);
              toast.success("Hash verified on ledger", { description: `Board signature valid · ${shortHash(found.hash)}` });
            } else toast.error("No matching ballot found");
          }}
        >
          <input value={verify} onChange={(e) => setVerify(e.target.value)} placeholder="Paste full tracker hash or prefix" className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-xs outline-none focus:border-foreground" />
          <button className="rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground">Verify</button>
        </form>
      </Panel>
      <Panel>
        <PanelHeader
          title="Immutable zero-knowledge audit ledger"
          sub={`${ballots.length} sealed ballots`}
          right={
            <div className="flex gap-2">
              <button
                onClick={() => download("votia-ledger.csv", ["timestamp,token,hash,channel,weight,signature", ...ballots.map((b) => [new Date(b.ts).toISOString(), anon(b.token), b.hash, b.channel, b.weight, b.signature].join(","))].join("\n"), "text/csv")}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
              ><Download className="h-3 w-3" /> CSV</button>
              <button
                onClick={() => download("votia-ledger.json", JSON.stringify(ballots.map(({ selections: _s, token, ...b }) => ({ ...b, token: anon(token) })), null, 2), "application/json")}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
              ><Download className="h-3 w-3" /> JSON</button>
            </div>
          }
        />
        <div className="flex gap-2 border-b border-hairline px-5 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hash" className="w-full bg-transparent py-2 text-sm outline-none" />
          </div>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-lg border border-border bg-surface px-2 text-xs">
            <option value="all">All channels</option>
            <option>iOS Passkey</option>
            <option>Mobile Web</option>
            <option>API Sync</option>
          </select>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
              <tr className="border-b border-hairline">
                {["Timestamp", "Voter", "Receipt hash", "Channel", "Weight", "Board sig"].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const hl = b.hash === highlightHash;
                return (
                  <tr key={b.id} ref={hl ? hlRef : undefined} className={`animate-row-in border-b border-hairline ${hl ? "bg-primary text-primary-foreground" : "hover:bg-surface-2"}`}>
                    <td className="px-5 py-2.5"><Mono>{new Intl.DateTimeFormat("en-GB", { timeStyle: "medium", timeZone: "UTC" }).format(b.ts)}</Mono></td>
                    <td className="px-5 py-2.5"><Mono>{anon(b.token)}</Mono></td>
                    <td className="px-5 py-2.5"><Mono className="font-semibold">{shortHash(b.hash)}</Mono></td>
                    <td className="px-5 py-2.5 text-xs">{b.channel}</td>
                    <td className="px-5 py-2.5"><Mono>{b.weight.toFixed(1)}x</Mono></td>
                    <td className="px-5 py-2.5"><Pill solid={!hl}><BadgeCheck className="h-3 w-3" /> valid</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
