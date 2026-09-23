import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB safety cap even though client resizes first

/** Uploads a (already client-resized) vehicle photo for a job card to Vercel Blob. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;

  const jobCard = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
  if (!jobCard) return NextResponse.json({ error: "Job card not found" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image too large." }, { status: 400 });
  }

  const blob = await put(`jobcards/${jobCardId}/${Date.now()}.jpg`, file, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });

  const image = await prisma.jobCardImage.create({
    data: { jobCardId, url: blob.url },
  });

  return NextResponse.json(image, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const imageId = request.nextUrl.searchParams.get("imageId");
  if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });

  const image = await prisma.jobCardImage.findUnique({ where: { id: imageId } });
  if (!image || image.jobCardId !== jobCardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.jobCardImage.delete({ where: { id: imageId } });
  await del(image.url).catch(() => {});

  return NextResponse.json({ ok: true });
}
