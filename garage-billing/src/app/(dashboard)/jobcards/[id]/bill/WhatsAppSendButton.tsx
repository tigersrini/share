"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { buildWhatsAppLink } from "@/lib/format";

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
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/jobcards/${jobCardId}/bill/pdf`;
  const shortMessage = `*Sparks Racing & Garage*\nHi ${customerName}, your bill for ${vehicle} is ready — total *${grandTotal}*.`;

  async function markSent() {
    try {
      await fetch(`/api/jobcards/${jobCardId}/bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappSent: true }),
      });
      setSentAt(new Date().toISOString());
    } catch {
      // non-fatal
    }
  }

  async function handleClick() {
    setError(null);
    setSending(true);
    try {
      // Prefer sharing the actual PDF file (works on most mobile browsers —
      // opens the native share sheet with WhatsApp as one of the targets,
      // the PDF attaches directly instead of just a text message).
      const res = await fetch(`/api/jobcards/${jobCardId}/bill/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], `invoice-${jobCardId.slice(-8)}.pdf`, { type: "application/pdf" });
        const nav = navigator as Navigator & {
          share?: (data: ShareData) => Promise<void>;
          canShare?: (data: ShareData) => boolean;
        };
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({ files: [file], title: "Invoice", text: shortMessage });
          await markSent();
          return;
        }
      }
    } catch {
      // fall through to the wa.me fallback below
    } finally {
      setSending(false);
    }

    // Fallback (desktop / unsupported browsers): open WhatsApp with a text
    // message that links to the PDF for the customer to view/download.
    const link = buildWhatsAppLink(phone, `${shortMessage}\n\nView/download your invoice: ${pdfUrl}`);
    window.open(link, "_blank", "noopener,noreferrer");
    await markSent();
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={sending} className="w-full">
        {sending ? "Preparing PDF…" : `Send PDF bill to ${customerName} via WhatsApp`}
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-zinc-400">
        On a phone, this opens your share sheet with the PDF attached — pick WhatsApp there. On
        desktop (or if file-sharing isn&apos;t supported), it opens WhatsApp with a link to the PDF
        instead. For fully automatic sending with no tap at all, connect the WhatsApp Business
        Cloud API (see README).
      </p>
    </div>
  );
}
