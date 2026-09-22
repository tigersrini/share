"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  regNumber: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
  vehicles: Vehicle[];
}

export default function NewJobCardFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customerId");

  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ make: "", model: "", regNumber: "" });
  const [complaints, setComplaints] = useState("");
  const [odometer, setOdometer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!presetCustomerId) return;
    fetch(`/api/customers/${presetCustomerId}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        if (data.vehicles?.length === 1) setVehicleId(data.vehicles[0].id);
      })
      .catch(() => {});
  }, [presetCustomerId]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phone.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  async function addVehicle() {
    if (!customer) return;
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id, ...newVehicle }),
    });
    const vehicle = await res.json();
    if (res.ok) {
      setCustomer({ ...customer, vehicles: [...customer.vehicles, vehicle] });
      setVehicleId(vehicle.id);
      setShowAddVehicle(false);
      setNewVehicle({ make: "", model: "", regNumber: "" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer || !vehicleId || !complaints.trim()) {
      setError("Select a customer, a vehicle, and describe the complaint.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/jobcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          vehicleId,
          complaints,
          odometer: odometer || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed to create job card");
      router.push(`/jobcards/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job card");
      setSaving(false);
    }
  }

  if (!customer) {
    return (
      <Card>
        <form onSubmit={search} className="space-y-3">
          <Label>Customer phone number</Label>
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" autoFocus />
            <Button type="submit" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>

        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCustomer(c)}
                  className="flex w-full items-center justify-between py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span>
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-zinc-500">· {c.phone}</span>
                  </span>
                  <span className="text-xs text-zinc-500">{c.vehicles.length} vehicle(s)</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {results.length === 0 && phone && !searching && (
          <p className="mt-4 text-sm text-zinc-500">
            No customer found.{" "}
            <Link
              href={`/customers/new?phone=${encodeURIComponent(phone)}&returnTo=/jobcards/new`}
              className="font-medium text-orange-600 hover:underline"
            >
              Add this customer →
            </Link>
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-medium">{customer.name}</div>
          <div className="text-xs text-zinc-500">{customer.phone}</div>
        </div>
        <Button type="button" variant="ghost" onClick={() => setCustomer(null)}>
          Change customer
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Vehicle</Label>
          <div className="space-y-2">
            {customer.vehicles.map((v) => (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  vehicleId === v.id
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="radio"
                  name="vehicle"
                  checked={vehicleId === v.id}
                  onChange={() => setVehicleId(v.id)}
                />
                {v.make} {v.model} · {v.regNumber}
              </label>
            ))}
          </div>

          {!showAddVehicle ? (
            <Button type="button" variant="secondary" className="mt-2" onClick={() => setShowAddVehicle(true)}>
              + Add vehicle
            </Button>
          ) : (
            <div className="mt-2 space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Make" value={newVehicle.make} onChange={(e) => setNewVehicle((v) => ({ ...v, make: e.target.value }))} />
                <Input placeholder="Model" value={newVehicle.model} onChange={(e) => setNewVehicle((v) => ({ ...v, model: e.target.value }))} />
              </div>
              <Input
                placeholder="Registration number"
                value={newVehicle.regNumber}
                onChange={(e) => setNewVehicle((v) => ({ ...v, regNumber: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button type="button" onClick={addVehicle}>
                  Save vehicle
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddVehicle(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>Customer complaints</Label>
          <Textarea
            value={complaints}
            onChange={(e) => setComplaints(e.target.value)}
            rows={3}
            placeholder="e.g. Engine noise, brake feels soft, oil leak near chain"
            required
          />
        </div>

        <div>
          <Label>Odometer (km, optional)</Label>
          <Input type="number" min="0" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Open Job Card"}
        </Button>
      </form>
    </Card>
  );
}
