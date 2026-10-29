import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ActionForm from "@/components/ActionForm";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Select, TableWrap } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createUser, resetUserPassword, updateUser } from "../actions";

export const metadata: Metadata = { title: "Staff accounts" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return <Card><EmptyState>Only admins can manage staff accounts.</EmptyState></Card>;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Staff accounts" subtitle={<Link href="/settings" className="text-brand">← Settings</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card pad={false} className="lg:col-span-2">
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><div className="font-medium">{u.name}</div><div className="text-xs text-muted">{u.email} · since {formatDate(u.createdAt)}</div></td>
                    <td>{u.role === "ADMIN" ? <Badge tone="violet">Admin</Badge> : <Badge>Staff</Badge>}</td>
                    <td>{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
                    <td>
                      {u.id !== session.userId && (
                        <form action={updateUser} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={String(u.active)} />
                          <Select name="role" defaultValue={u.role} className="!w-24 !py-1 text-xs">
                            <option value="STAFF">Staff</option>
                            <option value="ADMIN">Admin</option>
                          </Select>
                          <Button variant="secondary" className="!px-2 !py-1 text-xs">Set role</Button>
                        </form>
                      )}
                      {u.id !== session.userId && (
                        <form action={updateUser} className="mt-1">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role} />
                          <input type="hidden" name="active" value={String(!u.active)} />
                          <Button variant="ghost" className="!px-2 !py-1 text-xs">{u.active ? "Disable login" : "Enable login"}</Button>
                        </form>
                      )}
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-brand">Reset password</summary>
                        <ActionForm action={resetUserPassword} submitLabel="Reset" className="mt-2">
                          <input type="hidden" name="id" value={u.id} />
                          <Input name="password" type="text" minLength={8} placeholder="New password (8+ chars)" required />
                        </ActionForm>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
        <Card>
          <SectionTitle>Add staff</SectionTitle>
          <ActionForm action={createUser} submitLabel="Create user" pendingLabel="Creating…" resetOnSuccess>
            <div className="space-y-3">
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Email"><Input name="email" type="email" autoCapitalize="none" required /></Field>
              <Field label="Role"><Select name="role" defaultValue="STAFF"><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></Select></Field>
              <Field label="Temporary password" hint="8+ characters"><Input name="password" type="text" minLength={8} required /></Field>
            </div>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">Staff can use every module; only admins can change settings, delete records and manage accounts.</p>
        </Card>
      </div>
    </div>
  );
}
