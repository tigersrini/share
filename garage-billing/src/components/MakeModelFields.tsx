"use client";

import { useEffect, useId, useState } from "react";
import { Input, Label } from "@/components/ui";
import type { CatalogResponse } from "@/lib/vehicleCatalog";
import { colorFor, initialsFor } from "@/lib/oemBadges";

let cachedCatalog: CatalogResponse | null = null;
let inflight: Promise<CatalogResponse> | null = null;

function loadCatalog(): Promise<CatalogResponse> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
  if (!inflight) {
    inflight = fetch("/api/vehicle-catalog")
      .then((r) => r.json())
      .then((data: CatalogResponse) => {
        cachedCatalog = data;
        return data;
      })
      .catch(() => ({ makes: [], modelsByMake: {} }));
  }
  return inflight;
}

/**
 * Make/Model fields backed by a frequency-ranked catalog: this garage's own
 * most-used makes/models (from real Vehicle history) are suggested first,
 * falling back to a static reference list of common Indian OEMs. Shown as
 * tappable color badges (no licensed logo images available, so these are
 * generated initials chips, not real brand marks) above plain text inputs —
 * a rare/custom make or model can always just be typed.
 */
export default function MakeModelFields({
  make,
  model,
  onMakeChange,
  onModelChange,
}: {
  make: string;
  model: string;
  onMakeChange: (v: string) => void;
  onModelChange: (v: string) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogResponse>({ makes: [], modelsByMake: {} });
  const makeListId = `makes-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const modelListId = `models-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    loadCatalog().then(setCatalog);
  }, []);

  const matchedMake = catalog.makes.find((m) => m.toLowerCase() === make.trim().toLowerCase());
  const modelOptions = matchedMake ? catalog.modelsByMake[matchedMake] ?? [] : [];

  return (
    <div className="space-y-2">
      <div>
        <Label>Make</Label>
        <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {catalog.makes.slice(0, 12).map((m) => {
            const { bg, fg } = colorFor(m);
            const selected = matchedMake === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onMakeChange(m)}
                title={m}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-md border px-1.5 py-1 ${
                  selected ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-transparent"
                }`}
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {initialsFor(m)}
                </span>
                <span className="max-w-[4.5rem] truncate text-[10px] text-zinc-600 dark:text-zinc-400">{m}</span>
              </button>
            );
          })}
        </div>
        <Input
          list={makeListId}
          value={make}
          onChange={(e) => onMakeChange(e.target.value)}
          placeholder="Bajaj"
          required
        />
        <datalist id={makeListId}>
          {catalog.makes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div>
        <Label>Model</Label>
        {modelOptions.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {modelOptions.slice(0, 8).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModelChange(m)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  model.trim().toLowerCase() === m.toLowerCase()
                    ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        <Input
          list={modelListId}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder="Pulsar 150"
          required
        />
        <datalist id={modelListId}>
          {modelOptions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
