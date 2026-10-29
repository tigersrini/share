import { Field, Input, Select, Textarea } from "@/components/ui";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABEL, UOMS } from "@/lib/labels";
import { GST_RATES } from "@/lib/gst";

interface Values {
  sku?: string;
  name?: string;
  category?: string;
  make?: string | null;
  spec?: string | null;
  uom?: string;
  hsn?: string | null;
  gstRate?: number;
  sellPrice?: number;
  reorderLevel?: number;
  notes?: string | null;
}

export default function ItemFields({ v = {} }: { v?: Values }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Item name *" className="sm:col-span-4">
        <Input name="name" defaultValue={v.name} required placeholder="e.g. DCR Bifacial TOPCon Module 585 Wp" />
      </Field>
      <Field label="SKU / code *" className="sm:col-span-2">
        <Input name="sku" defaultValue={v.sku} required className="uppercase" placeholder="PNL-585" />
      </Field>
      <Field label="Category" className="sm:col-span-2">
        <Select name="category" defaultValue={v.category ?? "PANEL"}>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{ITEM_CATEGORY_LABEL[c]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Make / brand" className="sm:col-span-2">
        <Input name="make" defaultValue={v.make ?? ""} placeholder="Emmvee, Deye…" />
      </Field>
      <Field label="Spec" className="sm:col-span-2">
        <Input name="spec" defaultValue={v.spec ?? ""} placeholder="585 Wp / 5 kW 1-Ph" />
      </Field>
      <Field label="Unit" className="sm:col-span-1">
        <Input name="uom" list="item-uoms" defaultValue={v.uom ?? "Nos"} />
        <datalist id="item-uoms">{UOMS.map((u) => <option key={u} value={u} />)}</datalist>
      </Field>
      <Field label="HSN/SAC" className="sm:col-span-1">
        <Input name="hsn" defaultValue={v.hsn ?? ""} />
      </Field>
      <Field label="GST %" className="sm:col-span-1">
        <Select name="gstRate" defaultValue={String(v.gstRate ?? 18)}>
          {GST_RATES.map((r) => (<option key={r} value={r}>{r}%</option>))}
        </Select>
      </Field>
      <Field label="Selling price (₹, ex-GST)" className="sm:col-span-2">
        <Input name="sellPrice" type="number" min="0" step="any" defaultValue={v.sellPrice ?? ""} />
      </Field>
      <Field label="Reorder level" hint="alert at or below" className="sm:col-span-2">
        <Input name="reorderLevel" type="number" min="0" step="any" defaultValue={v.reorderLevel ?? ""} />
      </Field>
      <Field label="Notes" className="sm:col-span-6">
        <Textarea name="notes" rows={2} defaultValue={v.notes ?? ""} />
      </Field>
    </div>
  );
}
