"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export default function GenerateBillForm({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const [taxPercent, setTaxPercent] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobcards/${jobCardId}/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxPercent, discount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate bill");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>GST rate for breakdown (%)</Label>
          <Input type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
        </div>
        <div>
          <Label>Discount (₹)</Label>
          <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Part and labor prices are MRP — already inclusive of tax. The GST rate here doesn&apos;t add
        anything to the total; it just shows the tax portion already included in the price on the
        invoice.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Generating…" : "Generate final bill"}
      </Button>
    </form>
  );
}
