import { createServerFn } from "@tanstack/react-start";

// Public, token-gated ballot access. The invite token is the credential:
// no account, no identity stored on the ballot.

export const getBallotByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data: { token } }) => {
    if (!token || token.length < 16) throw new Error("Invalid invite link");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("id, status, election_id")
      .eq("token", token)
      .single();
    if (error || !invite) throw new Error("This invite link is invalid or has been revoked");

    const [{ data: election }, { data: candidates }, { data: documents }, { data: criteria }] = await Promise.all([
      supabaseAdmin.from("elections").select("id, title, description, status, opens_at, closes_at").eq("id", invite.election_id).single(),
      supabaseAdmin.from("candidates").select("id, name, role, manifesto").eq("election_id", invite.election_id).order("sort_order"),
      supabaseAdmin.from("election_documents").select("id, title, url, notes").eq("election_id", invite.election_id).order("created_at"),
      supabaseAdmin.from("decision_criteria").select("id, label, weight").eq("election_id", invite.election_id).order("sort_order"),
    ]);
    if (!election) throw new Error("Election not found");

    return {
      election,
      candidates: candidates ?? [],
      documents: documents ?? [],
      criteria: criteria ?? [],
      alreadyVoted: invite.status === "voted",
    };
  });

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; selections: Record<string, string> }) => input)
  .handler(async ({ data: { token, selections } }) => {
    if (!token || token.length < 16) throw new Error("Invalid invite link");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("id, status, election_id")
      .eq("token", token)
      .single();
    if (error || !invite) throw new Error("This invite link is invalid or has been revoked");
    if (invite.status === "voted") throw new Error("This invite has already been used to cast a ballot");

    const { data: election } = await supabaseAdmin
      .from("elections")
      .select("status, opens_at, closes_at")
      .eq("id", invite.election_id)
      .single();
    if (!election || election.status !== "open") throw new Error("This election is not open for voting");
    const now = Date.now();
    if (election.opens_at && now < Date.parse(election.opens_at)) throw new Error("Voting has not opened yet");
    if (election.closes_at && now > Date.parse(election.closes_at)) throw new Error("Voting has closed");

    // Receipt hash proves inclusion without storing any voter identity.
    const receiptHash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${token}|${now}|${JSON.stringify(selections)}`))),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: insertError } = await supabaseAdmin.from("ballots").insert({
      election_id: invite.election_id,
      selections,
      receipt_hash: receiptHash,
    });
    if (insertError) throw new Error("Could not record your ballot. Please try again.");

    await supabaseAdmin.from("invites").update({ status: "voted" }).eq("id", invite.id);
    return { receiptHash };
  });
