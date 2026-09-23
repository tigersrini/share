"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { resizeImageForUpload } from "@/lib/imageResize";

interface Photo {
  id: string;
  url: string;
}

export default function VehiclePhotos({
  jobCardId,
  photos,
  locked,
}: {
  jobCardId: string;
  photos: Photo[];
  locked: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const resized = await resizeImageForUpload(file);
      const formData = new FormData();
      formData.append("image", resized, "photo.jpg");
      const res = await fetch(`/api/jobcards/${jobCardId}/images`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to upload photo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Remove this photo?")) return;
    await fetch(`/api/jobcards/${jobCardId}/images?imageId=${imageId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- external Blob URLs, plain img avoids remote-pattern config */}
            <img src={p.url} alt="Vehicle" className="h-full w-full object-cover" />
            {!locked && (
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 group-active:opacity-100"
                aria-label="Remove photo"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!locked && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : "📷 Add vehicle photo"}
          </Button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
