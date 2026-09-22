"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Input, Label, PageTitle } from "@/components/ui";

function NewCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create customer");
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo ? `${returnTo}?customerId=${data.id}` : `/customers/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle>New Customer</PageTitle>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Customer name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save customer"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense>
      <NewCustomerForm />
    </Suspense>
  );
}
