import { NextRequest, NextResponse } from "next/server";

/** Parses a request's JSON body, returning null (and never throwing) if the
 * body is missing or not valid JSON so callers can respond with a clean 400
 * instead of an unhandled exception turning into a 500. */
export async function readJsonBody(request: NextRequest): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function invalidJsonResponse() {
  return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
}
