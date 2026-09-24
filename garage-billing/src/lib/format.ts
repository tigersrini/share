export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** Normalizes a phone number to digits only, keeping a leading country code if present. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

/** Builds a wa.me deep link that opens WhatsApp with a prefilled message to the given phone number. */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = normalizePhone(phone).replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
