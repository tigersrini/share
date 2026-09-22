"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import BarcodeScanner from "@/components/BarcodeScanner";

/**
 * Text field for a barcode with an optional camera scanner.
 * Works purely by manual typing when no camera is available.
 */
export default function BarcodeField({
  value,
  onChange,
  onScanned,
  autoFocus,
  placeholder = "Scan or type barcode",
}: {
  value: string;
  onChange: (v: string) => void;
  onScanned?: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [scanning, setScanning] = useState(false);

  return (
    <div>
      <Label>Barcode</Label>
      <div className="flex gap-2">
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={() => setScanning((s) => !s)}>
          {scanning ? "Cancel" : "📷 Scan"}
        </Button>
      </div>
      {scanning && (
        <div className="mt-2">
          <BarcodeScanner
            onScan={(code) => {
              onChange(code);
              onScanned?.(code);
              setScanning(false);
            }}
            onClose={() => setScanning(false)}
          />
        </div>
      )}
    </div>
  );
}
