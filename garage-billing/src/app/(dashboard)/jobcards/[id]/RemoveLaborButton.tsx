"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveLaborButton({
  jobCardId,
  laborId,
}: {
  jobCardId: string;
  laborId: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await fetch(`/api/jobcards/${jobCardId}/labor?laborId=${laborId}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}
