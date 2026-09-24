"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="relative aspect-[1200/415] w-64 overflow-hidden rounded-lg shadow-[0_0_40px_rgba(255,120,0,0.25)]">
            <Image src="/sparks-logo.png" alt="Sparks Racing and Garage" fill sizes="256px" className="object-contain" priority />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">Sparks Racing &amp; Garage</h1>
          <p className="text-sm text-zinc-400">Inventory &amp; Billing — staff login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full py-3 text-base">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
