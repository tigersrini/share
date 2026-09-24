export interface ExternalProductInfo {
  name?: string;
  make?: string;
  description?: string;
  sellingPrice?: number;
  source: string;
}

/**
 * Best-effort lookup of a barcode against a public product database
 * (UPCItemDB's free trial endpoint - no key required, rate limited).
 * Motorcycle spare parts are rarely listed there, so this is expected to
 * miss often; the caller must always fall back to manual entry.
 */
export async function lookupBarcodeExternally(
  barcode: string
): Promise<ExternalProductInfo | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return null;
    return {
      name: item.title,
      make: item.brand,
      description: item.description,
      sellingPrice: Array.isArray(item.offers) && item.offers[0]?.price ? Number(item.offers[0].price) : undefined,
      source: "upcitemdb",
    };
  } catch {
    return null;
  }
}
