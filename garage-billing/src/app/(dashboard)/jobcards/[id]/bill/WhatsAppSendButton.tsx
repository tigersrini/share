"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { shareOrOpenWhatsApp } from "@/lib/shareFile";

interface Props {
  jobCardId: string;
  phone: string;
  customerName: string;
  vehicle: string;
  grandTotal: string;
  alreadySentAt: string | null;
}

export default function WhatsAppSendButton({
  jobCardId,
  phone,
  customerName,
  vehicle,
  grandTotal,
  alreadySentAt,
}: Props) {
  const [sentAt, setSentAt] = useState(alreadySentAt);
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    try {
      await shareOrOpenWhatsApp({
        pdfUrl: `/api/jobcards/${jobCardId}/bill/pdf`,
        fileName: `invoice-${jobCardId.slice(-8)}.pdf`,
        phone,
        message: `*Sparks Racing & Garage*\nHi ${customerName}, your bill for ${vehicle} is ready — total *${grandTotal}*.`,
      });
      await fetch(`/api/jobcards/${jobCardId}/bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappSent: true }),
      });
      setSentAt(new Date().toISOString());
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={sending} className="w-full">
        {sending ? "Preparing PDF…" : `Open WhatsApp chat with ${customerName}`}
      </Button>
      <a
        href={`/api/jobcards/${jobCardId}/bill/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-center text-xs font-medium text-orange-600 hover:underline"
      >
        Preview / download PDF
      </a>
      {sentAt && (
        <p className="mt-2 text-xs text-zinc-500">
          Sent this bill at {new Date(sentAt).toLocaleString("en-IN")}.
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-400">
        This downloads the PDF to this device, then opens WhatsApp already on{" "}
        {customerName}&apos;s chat (no searching their number) with the bill amount pre-filled —
        tap 📎 there to attach the PDF that just downloaded. For fully automatic sending with no
        tap at all, connect the WhatsApp Business Cloud API (see README).
      </p>
    </div>
  );
}
