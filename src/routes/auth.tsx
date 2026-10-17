import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Votia — Organiser Sign In" },
      { name: "description", content: "Secure access for election organisers. Sign in with your organisation email, Google or Microsoft." },
      { property: "og:title", content: "Votia — Organiser Sign In" },
      { property: "og:description", content: "Secure access for election organisers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-foreground";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [busy, setBusy] = useState(false);

  const afterAuth = () => navigate({ to: "/dashboard" });

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, organisation },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
        afterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterAuth();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "microsoft") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Sign-in failed. Please try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return; // browser is navigating to the provider
    afterAuth();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">V</div>
          <h1 className="text-2xl font-semibold tracking-tight">Votia for Organisations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your organiser console" : "Create your organiser account"}
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuth("google")}
            className="w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Continue with Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuth("microsoft")}
            className="w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Continue with Microsoft
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or with organisation email <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-2.5">
          {mode === "signup" && (
            <>
              <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className={field} placeholder="Organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} required />
            </>
          )}
          <input className={field} type="email" placeholder="you@organisation.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "New to Votia? " : "Already have an account? "}
          <button type="button" className="font-medium text-foreground underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Voter? Use the secure invite link sent to your email — no account needed.
        </p>
      </div>
    </div>
  );
}
