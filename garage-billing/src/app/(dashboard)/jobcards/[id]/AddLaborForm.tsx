"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export default function AddLaborForm({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCardId}/labor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add labor charge");
      setDescription("");
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add labor charge");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Engine oil change service" />
        </div>
        <div className="w-28">
          <Label>Amount (₹)</Label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add charge"}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}
