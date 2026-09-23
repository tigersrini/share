import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageTitle } from "@/components/ui";
import StaffList from "./StaffList";
import AddStaffForm from "./AddStaffForm";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const staff = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle subtitle="Add mechanics/staff logins and control who has admin access.">
        Staff Accounts
      </PageTitle>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Add staff account</h2>
        <AddStaffForm />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">All accounts</h2>
        <StaffList
          initialStaff={staff.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
          currentUserId={session.userId}
        />
      </Card>
    </div>
  );
}
