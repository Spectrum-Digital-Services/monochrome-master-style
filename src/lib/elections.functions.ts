import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyElections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("elections")
      .select("id, title, description, status, opens_at, closes_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getElectionDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string }) => input)
  .handler(async ({ data: { electionId }, context }) => {
    const [election, candidates, documents, criteria, invites, ballots] = await Promise.all([
      context.supabase.from("elections").select("*").eq("id", electionId).single(),
      context.supabase.from("candidates").select("*").eq("election_id", electionId).order("sort_order"),
      context.supabase.from("election_documents").select("*").eq("election_id", electionId).order("created_at"),
      context.supabase.from("decision_criteria").select("*").eq("election_id", electionId).order("sort_order"),
      context.supabase.from("invites").select("id, email, name, token, status, created_at").eq("election_id", electionId).order("created_at"),
      context.supabase.from("ballots").select("id, receipt_hash, created_at").eq("election_id", electionId).order("created_at"),
    ]);
    if (election.error) throw new Error(election.error.message);
    return {
      election: election.data,
      candidates: candidates.data ?? [],
      documents: documents.data ?? [],
      criteria: criteria.data ?? [],
      invites: invites.data ?? [],
      ballots: ballots.data ?? [],
    };
  });

export const createElection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; description: string; opensAt?: string | null; closesAt?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("elections")
      .insert({
        title: data.title,
        description: data.description,
        owner_id: context.userId,
        opens_at: data.opensAt ?? null,
        closes_at: data.closesAt ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateElection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string; patch: { title?: string; description?: string; status?: string; opens_at?: string | null; closes_at?: string | null } }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("elections").update(data.patch).eq("id", data.electionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string; name: string; role: string; manifesto: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("candidates").insert({
      election_id: data.electionId,
      name: data.name,
      role: data.role,
      manifesto: data.manifesto,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string; title: string; url: string; notes: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("election_documents").insert({
      election_id: data.electionId,
      title: data.title,
      url: data.url,
      notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("election_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addCriterion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string; label: string; weight: number }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("decision_criteria").insert({
      election_id: data.electionId,
      label: data.label,
      weight: data.weight,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCriterion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("decision_criteria").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { electionId: string; email: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("invites")
      .insert({ election_id: data.electionId, email: data.email, name: data.name })
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
