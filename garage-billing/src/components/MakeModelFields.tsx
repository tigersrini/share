"use client";

import { useEffect, useId, useState } from "react";
import { Input, Label } from "@/components/ui";
import type { CatalogResponse } from "@/lib/vehicleCatalog";

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
 * Make/Model text fields backed by datalists: this garage's own
 * most-frequently-used makes/models (from real Vehicle history) are
 * suggested first, falling back to a static reference catalog of common
 * Indian OEMs. Still plain text inputs underneath, so a rare/custom
 * make or model can always just be typed in.
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
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>Make</Label>
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
