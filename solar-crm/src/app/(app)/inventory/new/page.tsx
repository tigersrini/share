import type { Metadata } from "next";
import ActionForm from "@/components/ActionForm";
import { Card, Field, Input, PageHeader, SectionTitle } from "@/components/ui";
import { createItem } from "../actions";
import ItemFields from "../ItemFields";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New inventory item" />
      <ActionForm action={createItem} submitLabel="Create item" pendingLabel="Saving…">
        <div className="space-y-4">
          <Card>
            <ItemFields />
          </Card>
          <Card>
            <SectionTitle>Opening stock (optional)</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quantity on hand now"><Input name="openingQty" type="number" min="0" step="any" /></Field>
              <Field label="Cost per unit (₹, ex-GST)"><Input name="openingCost" type="number" min="0" step="any" /></Field>
            </div>
            <p className="mt-2 text-xs text-muted">Later purchases update the average cost automatically.</p>
          </Card>
        </div>
      </ActionForm>
    </div>
  );
}
