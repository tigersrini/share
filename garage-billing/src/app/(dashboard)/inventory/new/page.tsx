import { Card, PageTitle } from "@/components/ui";
import NewPartForm from "./NewPartForm";

export default function NewPartPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle subtitle="Scan the spare's barcode, enter the quantity received, and fill in whatever details we couldn't fetch automatically.">
        Scan / Add Spare Part
      </PageTitle>
      <Card>
        <NewPartForm />
      </Card>
    </div>
  );
}
