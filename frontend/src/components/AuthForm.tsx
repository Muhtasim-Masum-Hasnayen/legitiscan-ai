"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Button, Card, Field, inputClass } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await register(email, password, name);
      else await login(email, password);
      router.push("/history");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        {isRegister && (
          <Field label="Name (optional)" htmlFor="name">
            <input id="name" className={inputClass} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" required className={inputClass} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" hint={isRegister ? "8 to 72 characters." : undefined}>
          <input id="password" type="password" required maxLength={72} className={inputClass} value={password}
            autoComplete={isRegister ? "new-password" : "current-password"} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div aria-live="polite">{error && <Alert tone="error">{error}</Alert>}</div>
        <Button type="submit" loading={busy} className="w-full">{isRegister ? "Create account" : "Sign in"}</Button>
        <p className="text-center text-sm text-ink-soft">
          {isRegister ? (<>Already have an account? <Link href="/login" className="font-medium text-brand-800 underline">Sign in</Link></>)
            : (<>New here? <Link href="/register" className="font-medium text-brand-800 underline">Create an account</Link></>)}
        </p>
        {isRegister && <p className="text-xs text-ink-mute">Scans you made in this browser before signing up are moved into your account.</p>}
      </form>
    </Card>
  );
}
