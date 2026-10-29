import Link from "next/link";
import ActionForm from "./ActionForm";
import { Field, Input, Select, Textarea } from "./ui";
import { assignCrew } from "@/app/(app)/schedule/actions";
import { siteHue } from "@/lib/team";

/** A coloured pill for a site, consistent everywhere (same project = same colour). */
export function SiteChip({ code, children, href }: { code: string; children?: React.ReactNode; href?: string }) {
  const h = siteHue(code);
  const style = {
    borderLeft: `3px solid hsl(${h} 55% 48%)`,
    background: `color-mix(in srgb, hsl(${h} 60% 50%) 14%, transparent)`,
  };
  const cls = "inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.72rem] font-medium leading-tight";
  const body = (
    <>
      <span className="truncate">{children ?? code}</span>
    </>
  );
  return href ? (
    <Link href={href} style={style} className={cls}>
      {body}
    </Link>
  ) : (
    <span style={style} className={cls}>
      {body}
    </span>
  );
}

export function StatusDot({ status }: { status: "PLANNED" | "DONE" | "ABSENT" }) {
  const cls = status === "DONE" ? "bg-brand" : status === "ABSENT" ? "bg-danger" : "bg-info/60";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} title={status} />;
}

export interface MemberOpt {
  id: string;
  name: string;
  role: string;
}
export interface SiteOpt {
  id: string;
  code: string;
  label: string;
}

/** "Assign crew to a site for a date range" — used on /schedule/assign and on each site page. */
export default function AssignForm({
  sites,
  members,
  projectId,
  date,
  defaultProjectId,
  defaultMemberIds = [],
}: {
  sites: SiteOpt[];
  members: MemberOpt[];
  /** fixed site (hides the site picker) */
  projectId?: string;
  date: string;
  defaultProjectId?: string;
  defaultMemberIds?: string[];
}) {
  return (
    <ActionForm action={assignCrew} submitLabel="Assign crew" pendingLabel="Assigning…">
      <div className="space-y-3">
        {projectId ? (
          <input type="hidden" name="projectId" value={projectId} />
        ) : (
          <Field label="Site *">
            <Select name="projectId" defaultValue={defaultProjectId ?? ""} required>
              <option value="">— choose site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Team members *</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="checkbox" name="memberId" value={m.id} defaultChecked={defaultMemberIds.includes(m.id)} className="h-4 w-4 accent-[var(--brand)]" />
                <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                <span className="text-xs text-muted">{m.role}</span>
              </label>
            ))}
            {members.length === 0 && <p className="text-sm text-muted">Add team members first.</p>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From *">
            <Input name="from" type="date" defaultValue={date} required />
          </Field>
          <Field label="To" hint="blank = one day">
            <Input name="to" type="date" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="skipSundays" defaultChecked className="h-4 w-4 accent-[var(--brand)]" /> Skip Sundays
        </label>
        <Field label="Note for the crew" hint="optional">
          <Textarea name="note" rows={2} placeholder="e.g. Structure fabrication, bring drill + welding set" />
        </Field>
        <p className="text-xs text-muted">Past dates are recorded as “worked”; future dates are plans. Anyone already on another site that day is skipped and reported.</p>
      </div>
    </ActionForm>
  );
}
