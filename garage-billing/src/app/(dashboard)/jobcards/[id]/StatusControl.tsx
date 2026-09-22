"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui";

const options = ["OPEN", "IN_PROGRESS", "COMPLETED"] as const;

export default function StatusControl({
  jobCardId,
  currentStatus,
}: {
  jobCardId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      await fetch(`/api/jobcards/${jobCardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Select
      value={currentStatus}
      disabled={updating}
      onChange={(e) => updateStatus(e.target.value)}
      className="w-auto"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace("_", " ")}
        </option>
      ))}
    </Select>
  );
}
