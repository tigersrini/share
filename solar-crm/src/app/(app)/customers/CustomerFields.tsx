import { Field, Input, Select, Textarea } from "@/components/ui";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, LEAD_SOURCES } from "@/lib/labels";
import { toDateInput } from "@/lib/format";

interface Values {
  name?: string;
  phone?: string;
  altPhone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  type?: string;
  source?: string | null;
  monthlyBill?: number | null;
  monthlyUnits?: number | null;
  roofAreaSqft?: number | null;
  expectedKw?: number | null;
  nextFollowUpAt?: Date | null;
  notes?: string | null;
}

/** Shared by the "new lead" and "edit customer" forms. */
export default function CustomerFields({ v = {} }: { v?: Values }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name *">
        <Input name="name" defaultValue={v.name} required autoFocus={!v.name} />
      </Field>
      <Field label="Phone *">
        <Input name="phone" type="tel" inputMode="tel" defaultValue={v.phone} required />
      </Field>
      <Field label="Alternate phone">
        <Input name="altPhone" type="tel" inputMode="tel" defaultValue={v.altPhone ?? ""} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" inputMode="email" defaultValue={v.email ?? ""} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <Textarea name="address" rows={2} defaultValue={v.address ?? ""} placeholder="Villa / flat no., street, area" />
      </Field>
      <Field label="City / locality">
        <Input name="city" defaultValue={v.city ?? ""} />
      </Field>
      <Field label="Pincode">
        <Input name="pincode" inputMode="numeric" defaultValue={v.pincode ?? ""} />
      </Field>
      <Field label="Customer type">
        <Select name="type" defaultValue={v.type ?? "RESIDENTIAL"}>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {CUSTOMER_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="GSTIN" hint="for B2B invoices">
        <Input name="gstin" defaultValue={v.gstin ?? ""} className="uppercase" />
      </Field>
      <Field label="Lead source">
        <Input name="source" list="lead-sources" defaultValue={v.source ?? ""} />
        <datalist id="lead-sources">
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Next follow-up">
        <Input name="nextFollowUpAt" type="date" defaultValue={toDateInput(v.nextFollowUpAt)} />
      </Field>
      <Field label="Monthly EB bill (₹)">
        <Input name="monthlyBill" type="number" inputMode="decimal" min="0" step="any" defaultValue={v.monthlyBill ?? ""} />
      </Field>
      <Field label="Monthly units (kWh)" hint="from EB card">
        <Input name="monthlyUnits" type="number" inputMode="decimal" min="0" step="any" defaultValue={v.monthlyUnits ?? ""} />
      </Field>
      <Field label="Shadow-free roof area (sq ft)">
        <Input name="roofAreaSqft" type="number" inputMode="decimal" min="0" step="any" defaultValue={v.roofAreaSqft ?? ""} />
      </Field>
      <Field label="Interested system size (kW)">
        <Input name="expectedKw" type="number" inputMode="decimal" min="0" step="any" defaultValue={v.expectedKw ?? ""} />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea name="notes" rows={2} defaultValue={v.notes ?? ""} />
      </Field>
    </div>
  );
}
