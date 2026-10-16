import { useState } from "react";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { hashString, runoff, shortHash, tallyContest, useElection } from "@/lib/election-store";
import { Mono, Panel, PanelHeader, Pill, Segmented } from "../primitives";

const SCOPES = ["voters:token_issue", "tally:read_stream", "board:quorum_seal", "webhooks:subscribe"];
const PREFIXES = [
  { value: "eb_live_", label: "Electoral Board" },
  { value: "org_live_", label: "Organisation IT" },
  { value: "aud_live_", label: "External Auditor" },
] as const;
const ENDPOINTS = ["POST /v2/electoral-board/access-keys/mint", "GET /v2/tally/zero-knowledge-proof", "POST /v2/board/quorum-seal"] as const;

export function ApiGateway() {
  const store = useElection();
  const { apiKeys, mintApiKey, revokeApiKey, bumpApiCalls } = store;
  const [prefix, setPrefix] = useState<(typeof PREFIXES)[number]["value"]>("eb_live_");
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["tally:read_stream"]);
  const [endpoint, setEndpoint] = useState<(typeof ENDPOINTS)[number]>(ENDPOINTS[1]);
  const [response, setResponse] = useState<string>("// Run a request to see the live payload");

  const run = () => {
    bumpApiCalls();
    let body: unknown;
    if (endpoint.includes("mint")) {
      const fresh = store.mintVoters(1, "Engineering", 1);
      body = { status: 201, minted: fresh.map((v) => ({ token: v.token, dept: v.dept, weight: v.weight, delivery: "queued" })) };
    } else if (endpoint.includes("zero-knowledge")) {
      body = {
        status: 200,
        ballots: store.ballots.length,
        weighted: store.stats.weightedCast,
        proof: `zk-snark:${hashString(String(store.ballots.length), 48)}`,
        contests: store.contests.map((c) => ({
          id: c.id,
          type: c.type,
          tally: tallyContest(c, store.ballots, true).counts,
          ...(c.type === "ranked" ? { runoff_rounds: runoff(c, store.ballots, true).length } : {}),
        })),
      };
    } else {
      const signed = store.trustees.filter((t) => t.signed).length;
      body = {
        status: store.stats.quorumMet && signed >= 3 ? 200 : 409,
        quorum: { turnout: Number(store.stats.turnout.toFixed(2)), required: 60, met: store.stats.quorumMet },
        escrow: { signatures: signed, required: 3 },
        sealed: store.certified,
      };
    }
    setResponse(JSON.stringify(body, null, 2));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Provision scoped API key" sub="HMAC-SHA512 signed credentials" />
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const k = mintApiKey(prefix, label || "Untitled key", scopes);
            setLabel("");
            navigator.clipboard?.writeText(k.key);
            toast.success("Key minted and copied", { description: shortHash(k.key) });
          }}
        >
          <Segmented value={prefix} onChange={setPrefix} options={PREFIXES.map((p) => ({ value: p.value, label: p.label }))} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground" />
          <div className="grid grid-cols-2 gap-2">
            {SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <input type="checkbox" className="accent-current" checked={scopes.includes(s)} onChange={() => setScopes((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))} />
                <Mono>{s}</Mono>
              </label>
            ))}
          </div>
          <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground active:scale-[0.99]">Mint key</button>
        </form>
        <div className="border-t border-hairline">
          {apiKeys.map((k) => (
            <div key={k.id} className={`flex items-center justify-between gap-3 border-b border-hairline px-5 py-3 last:border-0 ${k.revoked ? "opacity-40" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{k.label}</p>
                <Mono className="text-muted-foreground">{k.key.slice(0, 18)}…</Mono>
                <div className="mt-1 flex flex-wrap gap-1">{k.scopes.map((s) => <Pill key={s}>{s}</Pill>)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Mono className="text-muted-foreground">{k.calls.toLocaleString()} calls</Mono>
                <button onClick={() => { navigator.clipboard?.writeText(k.key); toast("Copied"); }} className="rounded-md p-1.5 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
                {!k.revoked && <button onClick={() => revokeApiKey(k.id)} className="rounded-md px-2 py-1 text-xs hover:bg-muted">Revoke</button>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="flex flex-col">
        <PanelHeader title="REST API & webhook playground" sub="Responses reflect live election state" />
        <div className="flex gap-2 p-5 pb-3">
          <select value={endpoint} onChange={(e) => setEndpoint(e.target.value as (typeof ENDPOINTS)[number])} className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs">
            {ENDPOINTS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <button onClick={run} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground"><Play className="h-3.5 w-3.5" /> Send</button>
        </div>
        <div className="px-5 pb-2"><Mono className="text-muted-foreground">x-api-key: {apiKeys.find((k) => !k.revoked)?.key.slice(0, 22) ?? "none"}…</Mono></div>
        <pre className="m-5 mt-2 flex-1 overflow-auto rounded-xl bg-primary p-4 font-mono text-[11px] leading-relaxed text-primary-foreground">{response}</pre>
      </Panel>
    </div>
  );
}
