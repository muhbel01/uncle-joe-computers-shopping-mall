"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError("Sign-in failed. Check your email and password, then try again."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("Staff sign-in is not configured yet. Please try again later."); }
    finally { setBusy(false); }
  }

  return <main className="page-shell"><section className="container page-heading admin-login-wrap">
    <Link href="/" className="back-link">← Back to shop</Link><span className="eyebrow">STAFF ACCESS</span>
    <h1>Sign in to your workspace</h1><p>For authorised Uncle Joe Computers staff only.</p>
    {searchParams.get("reason") === "not-authorized" && <p className="form-error" role="alert">This account does not have an active staff role. Ask the Super Admin to grant access.</p>}
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label htmlFor="staff-email">Work email</label><input id="staff-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="staff-password">Password</label><input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="form-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
    </form><p className="admin-security-note">Staff accounts must be created by an authorised administrator. Public self-registration is disabled.</p>
  </section></main>;
}
