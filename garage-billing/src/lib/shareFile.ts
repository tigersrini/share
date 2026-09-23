import { buildWhatsAppLink } from "@/lib/format";

/**
 * Shares a PDF (fetched from pdfUrl) to WhatsApp: on phones that support the
 * Web Share API with files, this opens the native share sheet with the PDF
 * already attached (pick WhatsApp there). Otherwise it falls back to a
 * wa.me link with a text message that links to the PDF for the customer to
 * view/download themselves.
 */
export async function shareOrOpenWhatsApp(options: {
  pdfUrl: string;
  fileName: string;
  phone: string;
  message: string;
}): Promise<"shared" | "opened-link"> {
  const { pdfUrl, fileName, phone, message } = options;

  try {
    const res = await fetch(pdfUrl);
    if (res.ok) {
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: fileName, text: message });
        return "shared";
      }
    }
  } catch {
    // fall through to link fallback below
  }

  const absoluteUrl = pdfUrl.startsWith("http") ? pdfUrl : `${window.location.origin}${pdfUrl}`;
  const link = buildWhatsAppLink(phone, `${message}\n\nView/download PDF: ${absoluteUrl}`);
  window.open(link, "_blank", "noopener,noreferrer");
  return "opened-link";
}
