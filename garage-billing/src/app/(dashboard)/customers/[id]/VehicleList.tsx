"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import MakeModelFields from "@/components/MakeModelFields";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  regNumber: string;
  vin: string | null;
}

export default function VehicleList({
  vehicles,
  vehicleJobCardCounts,
}: {
  vehicles: Vehicle[];
  vehicleJobCardCounts: Record<string, number>;
}) {
  return (
    <ul className="space-y-2 text-sm">
      {vehicles.map((v) => (
        <VehicleRow key={v.id} vehicle={v} jobCardCount={vehicleJobCardCounts[v.id] ?? 0} />
      ))}
      {vehicles.length === 0 && <li className="text-zinc-500">No vehicles yet.</li>}
    </ul>
  );
}

function VehicleRow({ vehicle, jobCardCount }: { vehicle: Vehicle; jobCardCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [regNumber, setRegNumber] = useState(vehicle.regNumber);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make, model, regNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to save.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (jobCardCount > 0) return;
    if (!confirm(`Delete ${vehicle.make} ${vehicle.model} (${vehicle.regNumber})?`)) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to delete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
        <form onSubmit={handleSave} className="space-y-2">
          <MakeModelFields make={make} model={model} onMakeChange={setMake} onModelChange={setModel} />
          <div>
            <Label>Registration number</Label>
            <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} required />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2">
      <span>
        {vehicle.make} {vehicle.model} <span className="text-zinc-500">· {vehicle.regNumber}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-orange-600 hover:underline">
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={jobCardCount > 0}
          title={jobCardCount > 0 ? "Can't delete a vehicle with job card history" : undefined}
          className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Delete
        </button>
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </li>
  );
}
