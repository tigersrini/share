import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sanacara_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

export type UserRole = "ADMIN" | "STAFF" | "FIELD";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "STAFF" && payload.role !== "FIELD")
    ) {
      return null;
    }
    return { userId: payload.userId, email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie in a Server Component, Action or Route Handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** For Server Actions: the caller must be signed in (the proxy also guards every route). */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For office Server Actions (everything with money, customers or settings): crew logins are refused. */
export async function requireStaff(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role === "FIELD") throw new Error("Not available for field logins.");
  return session;
}

/** For admin-only Server Actions. Throws so the action fails loudly for non-admins. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireStaff();
  if (session.role !== "ADMIN") throw new Error("Only an admin can do this.");
  return session;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
