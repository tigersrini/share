"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  createdAt: string;
}

export default function StaffList({
  initialStaff,
  currentUserId,
}: {
  initialStaff: StaffMember[];
  currentUserId: string;
}) {
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {initialStaff.map((member) => (
        <StaffRow key={member.id} member={member} isSelf={member.id === currentUserId} />
      ))}
    </ul>
  );
}

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  async function patch(data: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${member.name}'s account?`)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Delete failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    await patch({ newPassword });
    setNewPassword("");
    setResetting(false);
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            {member.name} {isSelf && <span className="text-xs text-zinc-500">(you)</span>}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{member.email}</div>
          <div className="mt-1 text-xs text-zinc-400">Added {formatDate(member.createdAt)}</div>
        </div>
        <div className="flex items-center gap-2">
          {!member.active && <Badge tone="red">deactivated</Badge>}
          <Select
            value={member.role}
            disabled={busy || isSelf}
            onChange={(e) => patch({ role: e.target.value })}
            className="w-auto"
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || isSelf}
            onClick={() => patch({ active: !member.active })}
          >
            {member.active ? "Deactivate" : "Reactivate"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setResetting((r) => !r)}>
            Reset password
          </Button>
          <Button type="button" variant="danger" disabled={busy || isSelf} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
      {resetting && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
          <Button type="button" onClick={handleResetPassword} disabled={busy}>
            Save
          </Button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
