import Link from "next/link";
import { SiteChip, StatusDot } from "@/components/CrewBits";
import { Badge } from "@/components/ui";
import { ASSIGNMENT_LABEL, ASSIGNMENT_TONE } from "@/lib/team";
import { markDayPresent, removeAssignment, setAssignmentStatus } from "./actions";

export type Row = {
  id: string;
  date: Date;
  status: "PLANNED" | "DONE" | "ABSENT";
  note: string | null;
  memberId: string;
  projectId: string;
  member: { id: string; name: string; role: string };
  project: { id: string; code: string; customer: { name: string } };
};

export default function DayDetail({ groups, k, canEdit }: { groups: Map<string, Row[]>; k: string; canEdit: boolean }) {
  return (
    <div className="space-y-3">
      {groups.size === 0 && <p className="text-sm text-muted">Nobody scheduled.</p>}
      {[...groups.entries()].map(([pid, rows]) => (
        <div key={pid} className="rounded-lg border border-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SiteChip code={rows[0].project.code} href={`/sites/${pid}`}>{rows[0].project.code} · {rows[0].project.customer.name}</SiteChip>
            {rows.some((r) => r.status === "PLANNED") && (
              <form action={markDayPresent}>
                <input type="hidden" name="projectId" value={pid} />
                <input type="hidden" name="date" value={k} />
                <button className="rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand-strong hover:brightness-95">✓ Mark all present</button>
              </form>
            )}
          </div>
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2"><StatusDot status={r.status} /><Link href={`/team/${r.member.id}`} className="font-medium hover:text-brand">{r.member.name}</Link><span className="text-xs text-muted">{r.member.role}</span></span>
                <span className="flex items-center gap-1">
                  <Badge tone={ASSIGNMENT_TONE[r.status]}>{ASSIGNMENT_LABEL[r.status]}</Badge>
                  {(["DONE", "ABSENT", "PLANNED"] as const).filter((s) => s !== r.status).map((s) => (
                    <form key={s} action={setAssignmentStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={s} />
                      <button className="rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">{s === "DONE" ? "Present" : s === "ABSENT" ? "Absent" : "Reset"}</button>
                    </form>
                  ))}
                  {canEdit && (
                    <form action={removeAssignment}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="px-1.5 py-1 text-xs text-muted hover:text-danger" title="Remove">✕</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {rows[0].note && <p className="mt-2 text-xs text-muted">Note: {rows[0].note}</p>}
        </div>
      ))}
    </div>
  );
}
