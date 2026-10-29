import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import { Card, Dl, Field, Input, PageHeader, SectionTitle } from "@/components/ui";
import { changeOwnPassword } from "../settings/actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const s = await getSession();
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="My account" />
      <Card className="mb-4">
        <Dl items={[["Name", s?.name], ["Email", s?.email], ["Role", s?.role === "ADMIN" ? "Admin" : "Staff"]]} />
      </Card>
      <Card>
        <SectionTitle>Change password</SectionTitle>
        <ActionForm action={changeOwnPassword} submitLabel="Change password" pendingLabel="Saving…" resetOnSuccess>
          <div className="space-y-3">
            <Field label="Current password"><Input name="current" type="password" autoComplete="current-password" required /></Field>
            <Field label="New password" hint="8+ characters"><Input name="next" type="password" autoComplete="new-password" minLength={8} required /></Field>
            <Field label="Confirm new password"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
