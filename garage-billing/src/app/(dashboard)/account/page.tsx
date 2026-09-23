import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, PageTitle } from "@/components/ui";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <PageTitle subtitle={`Signed in as ${session.email} (${session.role === "ADMIN" ? "Admin" : "Staff"})`}>
        My Account
      </PageTitle>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
