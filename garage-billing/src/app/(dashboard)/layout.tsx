import Nav from "@/components/Nav";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <>
      <Nav userName={session?.name} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-20 sm:px-6 sm:py-6 sm:pb-6">{children}</div>
    </>
  );
}
