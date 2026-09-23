"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BarcodeField from "@/components/BarcodeField";
import { Button, Input, Label } from "@/components/ui";
import { formatINR } from "@/lib/format";

interface PartResult {
  id: string;
  name: string;
  barcode: string;
  make: string | null;
  category: string | null;
  sellingPrice: number;
  quantity: number;
}

export default function AddPartForm({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nameQuery, setNameQuery] = useState("");
  const [results, setResults] = useState<PartResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartResult | null>(null);
  const [selectedQty, setSelectedQty] = useState("1");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = nameQuery.trim();
    if (q.length < 2) {
      return;
    }
    const searchingTimer = setTimeout(() => setSearching(true), 0);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parts?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(searchingTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nameQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

  async function addSelectedPart() {
    if (!selectedPart) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/jobcards/${jobCardId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sparePartId: selectedPart.id, quantity: selectedQty || 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add part");
      setSelectedPart(null);
      setSelectedQty("1");
      setNameQuery("");
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
      </div>

      <div className="my-3 flex items-center gap-2 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or search by name
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div ref={boxRef} className="relative">
        <Label>Part name</Label>
        <Input
          value={nameQuery}
          onChange={(e) => {
            const value = e.target.value;
            setNameQuery(value);
            setSelectedPart(null);
            setShowResults(true);
            if (value.trim().length < 2) {
              setResults([]);
              setSearching(false);
            }
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Type a part name, e.g. brake pad"
        />
        {showResults && nameQuery.trim().length >= 2 && (
          <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {searching && <div className="px-3 py-2 text-xs text-zinc-500">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-500">No matching parts in inventory.</div>
            )}
            {!searching &&
              results.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => {
                    setSelectedPart(part);
                    setNameQuery(part.name);
                    setShowResults(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span>
                    {part.name}
                    {part.make && <span className="ml-1 text-xs text-zinc-500">({part.make})</span>}
                    <span
                      className={`ml-2 text-xs ${part.quantity > 0 ? "text-zinc-500" : "text-red-500"}`}
                    >
                      {part.quantity > 0 ? `${part.quantity} in stock` : "out of stock"}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{formatINR(part.sellingPrice)}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {selectedPart && (
        <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <div className="text-xs text-zinc-500">
            Selected: <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedPart.name}</span>{" "}
            · {formatINR(selectedPart.sellingPrice)}
          </div>
          <div className="w-20">
            <Label>Qty</Label>
            <Input
              type="number"
              min="1"
              value={selectedQty}
              onChange={(e) => setSelectedQty(e.target.value)}
            />
          </div>
          <Button type="button" disabled={saving} onClick={addSelectedPart}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
