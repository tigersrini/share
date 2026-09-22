"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BarcodeField from "@/components/BarcodeField";
import { Button, Input, Label } from "@/components/ui";

export default function AddPartForm({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addByBarcode(code: string, qty: string) {
    if (!code.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCardId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code, quantity: qty || 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add part");
      setBarcode("");
      setQuantity("1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add part");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <BarcodeField
          value={barcode}
          onChange={setBarcode}
          onScanned={(code) => addByBarcode(code, quantity)}
          placeholder="Scan spare's barcode"
        />
        <div className="w-20">
          <Label>Qty</Label>
          <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" disabled={saving} onClick={() => addByBarcode(barcode, quantity)}>
          {saving ? "Adding…" : "Add to job card"}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
