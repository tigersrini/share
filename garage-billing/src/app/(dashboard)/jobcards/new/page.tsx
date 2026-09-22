import { Suspense } from "react";
import { PageTitle } from "@/components/ui";
import NewJobCardFlow from "./NewJobCardFlow";

export default function NewJobCardPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle subtitle="Find the customer by phone number, pick the vehicle, and note their complaint.">
        New Job Card
      </PageTitle>
      <Suspense>
        <NewJobCardFlow />
      </Suspense>
    </div>
  );
}
