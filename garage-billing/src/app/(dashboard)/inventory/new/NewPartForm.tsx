"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BarcodeField from "@/components/BarcodeField";
import { Button, Input, Label, Textarea } from "@/components/ui";

const emptyForm = {
  barcode: "",
  name: "",
  make: "",
  category: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  quantity: "1",
  lowStockAt: "2",
};

type LookupState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "in-inventory"; name: string }
  | { status: "found-online"; source: string }
  | { status: "not-found" };

export default function NewPartForm() {
  const [form, setForm] = useState(emptyForm);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const barcode = form.barcode.trim();
    if (barcode.length < 4) {
      return;
    }
    const checkingTimer = setTimeout(() => setLookup({ status: "checking" }), 0);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parts/lookup/${encodeURIComponent(barcode)}`);
        const data = await res.json();
        if (data.source === "inventory") {
          setLookup({ status: "in-inventory", name: data.part.name });
          setForm((f) => ({
            ...f,
            name: data.part.name,
            make: data.part.make ?? "",
            category: data.part.category ?? "",
            description: data.part.description ?? "",
            costPrice: String(data.part.costPrice ?? ""),
            sellingPrice: String(data.part.sellingPrice ?? ""),
          }));
        } else if (data.source === "external") {
          setLookup({ status: "found-online", source: data.info.source });
          setForm((f) => ({
            ...f,
            name: data.info.name ?? f.name,
            make: data.info.make ?? f.make,
            description: data.info.description ?? f.description,
            sellingPrice: data.info.sellingPrice ? String(data.info.sellingPrice) : f.sellingPrice,
          }));
        } else {
          setLookup({ status: "not-found" });
        }
      } catch {
        setLookup({ status: "not-found" });
      }
    }, 500);

    return () => {
      clearTimeout(checkingTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.barcode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.barcode.trim() || !form.name.trim()) {
      setError("Barcode and name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ? JSON.stringify(data.error) : "Failed to save part");
      }
      const part = await res.json();
      setMessage(`Saved "${part.name}" — stock is now ${part.quantity}.`);
      setForm(emptyForm);
      setLookup({ status: "idle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save part");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BarcodeField value={form.barcode} onChange={(v) => set("barcode", v)} autoFocus />

      {form.barcode.trim().length >= 4 && lookup.status === "checking" && (
        <p className="text-xs text-zinc-500">Checking inventory and the web…</p>
      )}
      {form.barcode.trim().length >= 4 && lookup.status === "in-inventory" && (
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Already in inventory as &quot;{lookup.name}&quot; — the quantity below will be added to existing stock.
        </p>
      )}
      {form.barcode.trim().length >= 4 && lookup.status === "found-online" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Found matching product online ({lookup.source}) — fields pre-filled, please verify.
        </p>
      )}
      {form.barcode.trim().length >= 4 && lookup.status === "not-found" && (
        <p className="text-xs text-zinc-500">No match found — please type in the details.</p>
      )}

      <div>
        <Label>Part name</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Front Brake Shoe" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Make / Brand</Label>
          <Input value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Bajaj OEM" />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Brake, Engine, Oil" />
        </div>
      </div>

      <div>
        <Label>Description (optional)</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cost price (₹)</Label>
          <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
        </div>
        <div>
          <Label>Selling price (₹)</Label>
          <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantity received (inward)</Label>
          <Input type="number" min="0" step="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div>
          <Label>Low stock alert at</Label>
          <Input type="number" min="0" step="1" value={form.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save part"}
        </Button>
        <Link href="/inventory" className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400">
          View inventory →
        </Link>
      </div>
    </form>
  );
}
