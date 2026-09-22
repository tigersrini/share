"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui";

export default function InventorySearch({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q ? `/inventory?q=${encodeURIComponent(q)}` : "/inventory");
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, barcode, make or category…"
      />
    </form>
  );
}
