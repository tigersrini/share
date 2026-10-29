import type { Metadata } from "next";
import ActionForm from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { createCustomer } from "../actions";
import CustomerFields from "../CustomerFields";

export const metadata: Metadata = { title: "New lead" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New lead / customer" subtitle="Capture the enquiry now — you can add the roof & bill details later." />
      <Card>
        <ActionForm action={createCustomer} submitLabel="Save lead" pendingLabel="Saving…">
          <CustomerFields />
        </ActionForm>
      </Card>
    </div>
  );
}
