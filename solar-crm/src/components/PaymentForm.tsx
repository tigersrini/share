import ActionForm from "./ActionForm";
import { Field, Input, Select } from "./ui";
import { addPayment } from "@/app/(app)/projects/actions";
import { PAYMENT_MODES, PAYMENT_MODE_LABEL } from "@/lib/labels";
import { todayInput } from "@/lib/format";

/** "Record payment received" — used on both project and invoice pages. */
export default function PaymentForm({
  customerId,
  projectId,
  invoiceId,
  invoices,
  suggested,
}: {
  customerId: string;
  projectId?: string;
  invoiceId?: string;
  /** when on a project page: lets the payment be tagged to one of its invoices */
  invoices?: { id: string; number: string }[];
  suggested?: number;
}) {
  return (
    <ActionForm action={addPayment} submitLabel="Record payment" pendingLabel="Saving…" resetOnSuccess>
      <input type="hidden" name="customerId" value={customerId} />
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {invoiceId && <input type="hidden" name="invoiceId" value={invoiceId} />}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Amount (₹) *">
          <Input name="amount" type="number" inputMode="decimal" min="0" step="any" defaultValue={suggested && suggested > 0 ? Math.round(suggested) : ""} required />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" defaultValue={todayInput()} />
        </Field>
        <Field label="Mode">
          <Select name="mode" defaultValue="BANK_TRANSFER">
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_MODE_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference / UTR">
          <Input name="reference" placeholder="e.g. Advance 60%" />
        </Field>
        {invoices && invoices.length > 0 && (
          <Field label="Against invoice" className="sm:col-span-2">
            <Select name="invoiceId" defaultValue="">
              <option value="">— not tied to an invoice —</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </ActionForm>
  );
}
