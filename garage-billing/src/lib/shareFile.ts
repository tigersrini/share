import { buildWhatsAppLink } from "@/lib/format";

/**
 * Downloads the PDF to the device and opens WhatsApp already on the
 * customer's chat (via a wa.me deep link), instead of the generic OS share
 * sheet — the share sheet can't target a specific WhatsApp contact, so it
 * left staff searching the customer's number by hand. wa.me/<phone> opens
 * that exact conversation directly; the PDF just downloaded is one tap away
 * to attach there.
 */
export async function shareOrOpenWhatsApp(options: {
  pdfUrl: string;
  fileName: string;
  phone: string;
  message: string;
}): Promise<"downloaded-and-opened" | "opened-link"> {
  const { pdfUrl, fileName, phone, message } = options;
  // Always build the link from the app's canonical production domain, never
  // the current origin - a preview-deployment origin (e.g.
  // sparks-garage-billing-git-<hash>-<team>.vercel.app) would otherwise leak
  // the branch name and Vercel team to the customer.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const absoluteUrl = pdfUrl.startsWith("http") ? pdfUrl : `${siteUrl}${pdfUrl}`;

  let downloaded = false;
  try {
    const res = await fetch(pdfUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
      downloaded = true;
    }
  } catch {
    // Download failed (offline, etc). Still open the chat below with a link.
  }

  const text = downloaded
    ? `${message}\n\nThe PDF just downloaded to this device — tap 📎 in this chat to attach it.\nOr view/download: ${absoluteUrl}`
    : `${message}\n\nView/download PDF: ${absoluteUrl}`;
  const link = buildWhatsAppLink(phone, text);
  window.open(link, "_blank", "noopener,noreferrer");
  return downloaded ? "downloaded-and-opened" : "opened-link";
}
