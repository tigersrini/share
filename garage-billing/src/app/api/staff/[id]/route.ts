import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", active: true } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;

  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const demotingOrDeactivatingLastAdmin =
    target.role === "ADMIN" &&
    target.active &&
    ((parsed.data.role && parsed.data.role !== "ADMIN") || parsed.data.active === false);
  if (demotingOrDeactivatingLastAdmin && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: "Can't remove the last active admin." }, { status: 400 });
  }
  if (id === admin.userId && (parsed.data.role === "STAFF" || parsed.data.active === false)) {
    return NextResponse.json({ error: "You can't demote or deactivate your own account." }, { status: 400 });
  }

  const data: { role?: "ADMIN" | "STAFF"; active?: boolean; passwordHash?: string } = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.newPassword) data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;

  if (id === admin.userId) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "ADMIN" && target.active && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: "Can't remove the last active admin." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
