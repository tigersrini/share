"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { buildWhatsAppLink, formatINR } from "@/lib/format";

interface Props {
  jobCardId: string;
  phone: string;
  customerName: string;
  vehicle: string;
  parts: { name: string; qty: number; amount: number }[];
  labors: { description: string; amount: number }[];
  grandTotal: number;
  alreadySentAt: string | null;
}

export default function WhatsAppSendButton({
  jobCardId,
  phone,
  customerName,
  vehicle,
  parts,
  labors,
  grandTotal,
  alreadySentAt,
}: Props) {
  const [sentAt, setSentAt] = useState(alreadySentAt);

  const lines = [
    `*Sparks Racing and Garage*`,
    `Hi ${customerName}, here is your bill for ${vehicle}:`,
    "",
    ...parts.map((p) => `• ${p.name} x${p.qty} — ${formatINR(p.amount)}`),
    ...labors.map((l) => `• ${l.description} — ${formatINR(l.amount)}`),
    "",
    `*Total: ${formatINR(grandTotal)}*`,
    "",
    "Thank you for servicing with us!",
  ];
  const message = lines.join("\n");
  const link = buildWhatsAppLink(phone, message);

  async function handleClick() {
    window.open(link, "_blank", "noopener,noreferrer");
    try {
      await fetch(`/api/jobcards/${jobCardId}/bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappSent: true }),
      });
      setSentAt(new Date().toISOString());
    } catch {
      // non-fatal: the message still opened in WhatsApp
    }
  }

  return (
    <div>
      <Button onClick={handleClick} className="w-full">
        Send bill to {customerName} via WhatsApp
      </Button>
      {sentAt && (
        <p className="mt-2 text-xs text-zinc-500">
          Opened WhatsApp for this bill at {new Date(sentAt).toLocaleString("en-IN")}.
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-400">
        Opens WhatsApp with the bill pre-filled — you send the final tap. For fully automatic
        sending without opening WhatsApp, connect the WhatsApp Business Cloud API (see README).
      </p>
    </div>
  );
}
