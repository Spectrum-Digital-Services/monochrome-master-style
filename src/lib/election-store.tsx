import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ContestType = "plurality" | "ranked" | "approval" | "resolution";
export type Candidate = { id: string; name: string; role: string; manifesto: string };
export type Contest = {
  id: string;
  title: string;
  type: ContestType;
  candidates: Candidate[];
  allowAbstain: boolean;
  allowWriteIn: boolean;
  threshold: number; // % needed to pass / win
};
export type DeliveryStatus = "Delivered" | "Opened" | "Voted" | "Bounced";
export type Voter = { token: string; name: string; dept: string; weight: number; status: DeliveryStatus };
export type Selection = string | string[]; // ranked/approval = string[]
export type Channel = "iOS Passkey" | "Mobile Web" | "API Sync";
export type Ballot = {
  id: string;
  token: string;
  hash: string;
  signature: string;
  ts: number;
  channel: Channel;
  weight: number;
  dept: string;
  selections: Record<string, Selection>;
};
export type ApiKey = { id: string; label: string; key: string; scopes: string[]; created: number; calls: number; revoked: boolean };
export type Trustee = { name: string; role: string; signed: boolean; signature?: string };
export type Module = { id: string; name: string; version: string; description: string; enabled: boolean };
export type Workspace = "voter" | "console" | "dual";
export type ConsoleModule = "telemetry" | "architect" | "roster" | "governance" | "api" | "ledger";

export const DEPARTMENTS = ["Engineering", "Operations & Legal", "EMEA Chapter", "Advisory Fellows"];
export const QUORUM = 60;
export const ABSTAIN = "__abstain";
export const WRITEIN_PREFIX = "__writein:";

// ---------- deterministic helpers ----------
export function hashString(input: string, len = 64) {
  let out = "";
  let h1 = 0x811c9dc5;
  let i = 0;
  while (out.length < len) {
    for (let j = 0; j < input.length; j++) {
      h1 ^= input.charCodeAt(j) + i;
      h1 = Math.imul(h1, 16777619) >>> 0;
    }
    out += h1.toString(16).padStart(8, "0");
    i++;
  }
  return out.slice(0, len);
}
export const shortHash = (h: string) => `0x${h.slice(0, 4)}…${h.slice(-4)}`;

// Keep server and browser markup identical by formatting seeded timestamps without
// relying on each runtime's ICU locale data or timezone defaults.
export function formatUtcTimestamp(ts: number, includeDate = true) {
  const date = new Date(ts);
  const pad = (value: number) => value.toString().padStart(2, "0");
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
  if (!includeDate) return time;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(date.getUTCDate())} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${time}`;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const BASE_TS = Date.UTC(2026, 9, 16, 8, 0, 0);

const FIRST = ["Amara", "Thabo", "Lena", "Kofi", "Sofia", "Ravi", "Naledi", "Jonas", "Mei", "Elias", "Zanele", "Omar", "Ines", "Pieter", "Aiko", "Lucas"];
const LAST = ["Dlamini", "Okafor", "Berg", "Mensah", "Rossi", "Patel", "Khumalo", "Weber", "Chen", "Laurent", "Ndlovu", "Haddad"];

function seedContests(): Contest[] {
  return [
    {
      id: "chair",
      title: "Chairperson of the Board",
      type: "plurality",
      allowAbstain: true,
      allowWriteIn: true,
      threshold: 50,
      candidates: [
        { id: "c1", name: "Helena Voss", role: "Chief Strategy Officer", manifesto: "Governance transparency, quarterly open board sessions and a member-first capital policy." },
        { id: "c2", name: "Marcus Adeyemi", role: "Head of Operations", manifesto: "Operational excellence, regional chapter autonomy and a five-year infrastructure roadmap." },
        { id: "c3", name: "Yuki Tanaka", role: "General Counsel", manifesto: "Risk discipline, independent audit oversight and modernised bylaws." },
      ],
    },
    {
      id: "treasurer",
      title: "Executive Treasurer",
      type: "ranked",
      allowAbstain: true,
      allowWriteIn: false,
      threshold: 50,
      candidates: [
        { id: "t1", name: "Priya Raman", role: "Finance Director", manifesto: "Reserve-backed budgeting and monthly published ledgers." },
        { id: "t2", name: "Daniel Okoro", role: "Controller, EMEA", manifesto: "Cost transparency per chapter and zero-based budgeting." },
        { id: "t3", name: "Clara Becker", role: "Audit Partner", manifesto: "Independent treasury controls and dual authorisation." },
        { id: "t4", name: "Sipho Mthembu", role: "Investment Lead", manifesto: "Long-horizon endowment growth with ethical screens." },
      ],
    },
    {
      id: "res104",
      title: "Resolution #104: Algorithmic Audit Charter",
      type: "resolution",
      allowAbstain: true,
      allowWriteIn: false,
      threshold: 66.7,
      candidates: [
        { id: "approve", name: "Approve", role: "", manifesto: "" },
        { id: "reject", name: "Reject", role: "", manifesto: "" },
      ],
    },
  ];
}

function seedVoters(): Voter[] {
  const r = rng(42);
  return Array.from({ length: 48 }, (_, i) => {
    const roll = r();
    return {
      token: `#AX-${(1000 + Math.floor(r() * 8999)).toString()}`,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
      dept: DEPARTMENTS[i % 4],
      weight: i % 9 === 0 ? 2.5 : i % 5 === 0 ? 2 : 1,
      status: roll < 0.08 ? "Bounced" : roll < 0.45 ? "Opened" : "Delivered",
    } as Voter;
  });
}

export function randomSelections(contests: Contest[], r: () => number): Record<string, Selection> {
  const sel: Record<string, Selection> = {};
  for (const c of contests) {
    const ids = c.candidates.map((x) => x.id);
    if (c.type === "ranked") {
      const shuffled = [...ids].sort(() => r() - 0.5);
      sel[c.id] = shuffled.slice(0, 2 + Math.floor(r() * (ids.length - 1)));
    } else if (c.type === "approval") {
      sel[c.id] = ids.filter(() => r() > 0.5);
    } else if (c.type === "resolution") {
      const x = r();
      sel[c.id] = x < 0.68 ? "approve" : x < 0.92 ? "reject" : ABSTAIN;
    } else {
      const x = r();
      sel[c.id] = x < 0.06 ? ABSTAIN : ids[Math.floor(Math.pow(r(), 1.3) * ids.length)] ?? ABSTAIN;
    }
  }
  return sel;
}

function makeBallot(v: Voter, selections: Record<string, Selection>, channel: Channel, ts: number): Ballot {
  const hash = hashString(`${v.token}|${ts}|${JSON.stringify(selections)}`);
  return {
    id: hash.slice(0, 12),
    token: v.token,
    hash,
    signature: hashString(`board-ecdsa|${hash}`, 40),
    ts,
    channel,
    weight: v.weight,
    dept: v.dept,
    selections,
  };
}

// ---------- tallies ----------
export function tallyContest(contest: Contest, ballots: Ballot[], weighted: boolean) {
  const counts: Record<string, number> = {};
  contest.candidates.forEach((c) => (counts[c.id] = 0));
  counts[ABSTAIN] = 0;
  let writeIns = 0;
  for (const b of ballots) {
    const s = b.selections[contest.id];
    if (s === undefined) continue;
    const w = weighted ? b.weight : 1;
    if (Array.isArray(s)) {
      if (contest.type === "ranked") {
        if (s[0]) counts[s[0]] = (counts[s[0]] ?? 0) + w;
        else counts[ABSTAIN] += w;
      } else s.forEach((id) => (counts[id] = (counts[id] ?? 0) + w));
    } else if (s.startsWith(WRITEIN_PREFIX)) writeIns += w;
    else counts[s] = (counts[s] ?? 0) + w;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) + writeIns;
  return { counts, writeIns, total };
}

export type RunoffRound = { round: number; counts: Record<string, number>; eliminated?: string; winner?: string };
export function runoff(contest: Contest, ballots: Ballot[], weighted: boolean): RunoffRound[] {
  let active = contest.candidates.map((c) => c.id);
  const rounds: RunoffRound[] = [];
  for (let round = 1; round <= contest.candidates.length; round++) {
    const counts: Record<string, number> = {};
    active.forEach((id) => (counts[id] = 0));
    let total = 0;
    for (const b of ballots) {
      const s = b.selections[contest.id];
      if (!Array.isArray(s)) continue;
      const pick = s.find((id) => active.includes(id));
      if (!pick) continue;
      const w = weighted ? b.weight : 1;
      counts[pick] = (counts[pick] ?? 0) + w;
      total += w;
    }
    const sorted = [...active].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    const leader = sorted[0];
    const loser = sorted[sorted.length - 1];
    if (total === 0) {
      rounds.push({ round, counts });
      break;
    }
    if (!leader) break;
    if ((counts[leader] ?? 0) / total > 0.5 || active.length === 1) {
      rounds.push({ round, counts, winner: leader });
      break;
    }
    if (!loser) break;
    rounds.push({ round, counts, eliminated: loser });
    active = active.filter((id) => id !== loser);
  }
  return rounds;
}

// ---------- store ----------
type Store = {
  contests: Contest[];
  voters: Voter[];
  ballots: Ballot[];
  apiKeys: ApiKey[];
  trustees: Trustee[];
  modules: Module[];
  activeToken: string;
  workspace: Workspace;
  consoleModule: ConsoleModule;
  highlightHash: string | null;
  simulating: boolean;
  certified: boolean;
  publicStandings: boolean;
  setWorkspace: (w: Workspace) => void;
  setConsoleModule: (m: ConsoleModule) => void;
  setActiveToken: (t: string) => void;
  setHighlightHash: (h: string | null) => void;
  setSimulating: (b: boolean) => void;
  setPublicStandings: (b: boolean) => void;
  castBallot: (token: string, selections: Record<string, Selection>, channel?: Channel) => Ballot | null;
  updateContest: (id: string, patch: Partial<Contest>) => void;
  addContest: (type: ContestType) => void;
  removeContest: (id: string) => void;
  addCandidate: (contestId: string, c: Omit<Candidate, "id">) => void;
  removeCandidate: (contestId: string, candidateId: string) => void;
  mintVoters: (count: number, dept: string, weight: number) => Voter[];
  setVoterWeight: (token: string, weight: number) => void;
  revokeVoter: (token: string) => void;
  mintApiKey: (prefix: string, label: string, scopes: string[]) => ApiKey;
  revokeApiKey: (id: string) => void;
  bumpApiCalls: (id?: string) => void;
  toggleModule: (id: string) => void;
  signTrustee: (index: number) => void;
  resetCeremony: () => void;
  stats: {
    eligible: number;
    voted: number;
    turnout: number;
    weightedCast: number;
    quorumMet: boolean;
    byDept: { dept: string; eligible: number; voted: number; pct: number }[];
  };
};

const Ctx = createContext<Store | null>(null);

export function ElectionProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [contests, setContests] = useState<Contest[]>(seedContests);
  const [voters, setVoters] = useState<Voter[]>(seedVoters);
  const [ballots, setBallots] = useState<Ballot[]>(() => {
    const vs = seedVoters();
    const cs = seedContests();
    const r = rng(7);
    const out: Ballot[] = [];
    vs.forEach((v, i) => {
      if (v.status === "Opened" && i % 2 === 0 && i > 1) {
        out.push(makeBallot(v, randomSelections(cs, r), i % 3 === 0 ? "Mobile Web" : "iOS Passkey", BASE_TS + i * 97_000));
      }
    });
    return out;
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: "k1", label: "Electoral Board primary", key: `eb_live_${hashString("ebkey", 32)}`, scopes: ["board:quorum_seal", "tally:read_stream"], created: BASE_TS - 86400000 * 3, calls: 1284, revoked: false },
    { id: "k2", label: "Okta HRIS sync", key: `org_live_${hashString("orgkey", 32)}`, scopes: ["voters:token_issue", "webhooks:subscribe"], created: BASE_TS - 86400000 * 9, calls: 9402, revoked: false },
  ]);
  const [trustees, setTrustees] = useState<Trustee[]>([
    { name: "Ingrid Solberg", role: "Board Chair", signed: false },
    { name: "Ahmed Farouk", role: "Legal Counsel", signed: false },
    { name: "Nomvula Zulu", role: "Chief Risk Officer", signed: false },
    { name: "Robert Hale", role: "External Deloitte Observer", signed: false },
    { name: "Grace Owusu", role: "Member Representative", signed: false },
  ]);
  const [modules, setModules] = useState<Module[]>([
    { id: "zk", name: "Zero-Knowledge Ballot Homomorphism", version: "v3.4", description: "Decouples voter identity from ballot content with homomorphic tallying.", enabled: true },
    { id: "passkey", name: "Passkey & FaceID Hardware Attestation", version: "v2.1", description: "Requires secure-enclave biometric signing before a ballot is sealed.", enabled: true },
    { id: "quorum", name: "Dynamic Quorum & Share-Weighting", version: "v4.0", description: "Applies vote multipliers and constitutional quorum thresholds.", enabled: true },
    { id: "hris", name: "Workday / Okta HRIS Roster Provisioner", version: "v1.9", description: "Syncs eligible members and departments from your HR system.", enabled: false },
    { id: "escrow", name: "Multi-Party Board Key Escrow", version: "3-of-5", description: "Results are sealed only after 3 of 5 commissioners co-sign.", enabled: true },
    { id: "proxy", name: "Delegated Liquid Proxy Voting", version: "v1.2", description: "Members may delegate their ballot to a registered proxy.", enabled: false },
  ]);
  const [activeToken, setActiveToken] = useState<string>(() => seedVoters()[0]?.token ?? "");
  const [workspace, setWorkspace] = useState<Workspace>("dual");
  const [consoleModule, setConsoleModule] = useState<ConsoleModule>("telemetry");
  const [highlightHash, setHighlightHash] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [publicStandings, setPublicStandings] = useState(true);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Mark seeded ballots' voters as voted
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const tokens = new Set(ballots.map((b) => b.token));
    setVoters((vs) => vs.map((v) => (tokens.has(v.token) ? { ...v, status: "Voted" } : v)));
  }, [ballots]);

  const castBallot = useCallback(
    (token: string, selections: Record<string, Selection>, channel: Channel = "iOS Passkey") => {
      const v = voters.find((x) => x.token === token);
      if (!v || v.status === "Voted" || v.status === "Bounced") return null;
      const b = makeBallot(v, selections, channel, Date.now());
      setBallots((bs) => [...bs, b]);
      setVoters((vs) => vs.map((x) => (x.token === token ? { ...x, status: "Voted" } : x)));
      return b;
    },
    [voters],
  );

  // Live remote voter traffic simulator
  const votersRef = useRef(voters);
  votersRef.current = voters;
  const contestsRef = useRef(contests);
  contestsRef.current = contests;
  useEffect(() => {
    if (!simulating) return;
    const r = rng(Date.now() % 100000);
    const id = setInterval(() => {
      const pool = votersRef.current.filter((v) => v.status === "Delivered" || v.status === "Opened");
      if (!pool.length) {
        setSimulating(false);
        return;
      }
      const v = pool[Math.floor(r() * pool.length)];
      if (!v) return;
      const channels: Channel[] = ["iOS Passkey", "Mobile Web", "API Sync"];
      const channel = channels[Math.floor(r() * 3)] ?? "Mobile Web";
      const b = makeBallot(v, randomSelections(contestsRef.current, r), channel, Date.now());
      setBallots((bs) => [...bs, b]);
      setVoters((vs) => vs.map((x) => (x.token === v.token ? { ...x, status: "Voted" } : x)));
    }, 2500);
    return () => clearInterval(id);
  }, [simulating]);

  const stats = useMemo(() => {
    const eligibleV = voters.filter((v) => v.status !== "Bounced");
    const voted = voters.filter((v) => v.status === "Voted").length;
    const turnout = eligibleV.length ? (voted / eligibleV.length) * 100 : 0;
    return {
      eligible: eligibleV.length,
      voted,
      turnout,
      weightedCast: ballots.reduce((a, b) => a + b.weight, 0),
      quorumMet: turnout >= QUORUM,
      byDept: DEPARTMENTS.map((dept) => {
        const e = eligibleV.filter((v) => v.dept === dept);
        const vv = e.filter((v) => v.status === "Voted").length;
        return { dept, eligible: e.length, voted: vv, pct: e.length ? (vv / e.length) * 100 : 0 };
      }),
    };
  }, [voters, ballots]);

  const certified = trustees.filter((t) => t.signed).length >= 3;

  const value: Store = {
    contests,
    voters,
    ballots,
    apiKeys,
    trustees,
    modules,
    activeToken,
    workspace,
    consoleModule,
    highlightHash,
    simulating,
    certified,
    publicStandings,
    setWorkspace,
    setConsoleModule,
    setActiveToken,
    setHighlightHash,
    setSimulating,
    setPublicStandings,
    castBallot,
    updateContest: (id, patch) => setContests((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    addContest: (type) =>
      setContests((cs) => [
        ...cs,
        {
          id: `ct${Date.now()}`,
          title: type === "resolution" ? "New Resolution" : "New Contest",
          type,
          allowAbstain: true,
          allowWriteIn: false,
          threshold: type === "resolution" ? 66.7 : 50,
          candidates:
            type === "resolution"
              ? [
                  { id: "approve", name: "Approve", role: "", manifesto: "" },
                  { id: "reject", name: "Reject", role: "", manifesto: "" },
                ]
              : [],
        },
      ]),
    removeContest: (id) => setContests((cs) => cs.filter((c) => c.id !== id)),
    addCandidate: (contestId, c) =>
      setContests((cs) => cs.map((x) => (x.id === contestId ? { ...x, candidates: [...x.candidates, { ...c, id: `cand${Date.now()}` }] } : x))),
    removeCandidate: (contestId, cid) =>
      setContests((cs) => cs.map((x) => (x.id === contestId ? { ...x, candidates: x.candidates.filter((c) => c.id !== cid) } : x))),
    mintVoters: (count, dept, weight) => {
      const fresh: Voter[] = Array.from({ length: count }, (_, i) => {
        const h = hashString(`${Date.now()}-${i}-${Math.random()}`, 8);
        return {
          token: `#AX-${(parseInt(h, 16) % 9000) + 1000}`,
          name: `${FIRST[parseInt(h.slice(0, 2), 16) % FIRST.length]} ${LAST[parseInt(h.slice(2, 4), 16) % LAST.length]}`,
          dept,
          weight,
          status: "Delivered",
        };
      });
      setVoters((vs) => [...fresh, ...vs]);
      return fresh;
    },
    setVoterWeight: (token, weight) => setVoters((vs) => vs.map((v) => (v.token === token ? { ...v, weight } : v))),
    revokeVoter: (token) => setVoters((vs) => vs.map((v) => (v.token === token && v.status !== "Voted" ? { ...v, status: "Bounced" } : v))),
    mintApiKey: (prefix, label, scopes) => {
      const k: ApiKey = { id: `k${Date.now()}`, label, key: `${prefix}${hashString(`${Date.now()}${label}`, 32)}`, scopes, created: Date.now(), calls: 0, revoked: false };
      setApiKeys((ks) => [k, ...ks]);
      return k;
    },
    revokeApiKey: (id) => setApiKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked: true } : k))),
    bumpApiCalls: (id) => setApiKeys((ks) => ks.map((k, i) => ((id ? k.id === id : i === 0) ? { ...k, calls: k.calls + 1 } : k))),
    toggleModule: (id) => setModules((ms) => ms.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))),
    signTrustee: (index) =>
      setTrustees((ts) =>
        ts.map((t, i) => (i === index && !t.signed ? { ...t, signed: true, signature: hashString(`trustee-${i}-${Date.now()}`, 40) } : t)),
      ),
    resetCeremony: () => setTrustees((ts) => ts.map(({ signature: _signature, ...t }) => ({ ...t, signed: false }))),
    stats,
  };

  if (!hydrated) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useElection() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useElection must be inside ElectionProvider");
  return s;
}

export function candidateName(contest: Contest, id: string) {
  if (id === ABSTAIN) return "Abstain";
  if (id.startsWith(WRITEIN_PREFIX)) return `Write-in: ${id.slice(WRITEIN_PREFIX.length)}`;
  return contest.candidates.find((c) => c.id === id)?.name ?? id;
}
