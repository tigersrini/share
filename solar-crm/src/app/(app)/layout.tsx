import Shell from "@/components/Shell";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <Shell userName={session.name} role={session.role}>
      {children}
    </Shell>
  );
}
