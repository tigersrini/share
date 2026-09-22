"use client";

import { useEffect, useId, useState } from "react";

/**
 * Camera barcode/QR scanner. Loads html5-qrcode dynamically (browser-only lib)
 * so it never touches the server bundle. Falls back gracefully if no camera
 * is available/permitted -- manual barcode entry always remains an option
 * wherever this component is used.
 */
export default function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const elId = `scanner-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let stopped = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(elId, { verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (stopped) return;
            onScan(decodedText);
          },
          () => {
            // ignore per-frame decode failures
          }
        );
      } catch {
        setError(
          "Could not access camera. You can still type the barcode manually below."
        );
      }
    })();

    return () => {
      stopped = true;
      scanner?.stop().then(() => scanner?.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elId]);

  return (
    <div className="rounded-lg border border-zinc-300 bg-black/5 p-3 dark:border-zinc-700 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Scan barcode
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-orange-600 hover:underline"
        >
          Close scanner
        </button>
      </div>
      <div id={elId} className="mx-auto w-full max-w-sm overflow-hidden rounded-md" />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
