import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { lessons } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ lessonId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const lessonId = Number(params.lessonId);
  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  return NextResponse.json(data);
};

export const PUT = async (
  req: Request,
  context: { params: Promise<{ lessonId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const lessonId = Number(params.lessonId);
  const body = await req.json();
  const data = await db.update(lessons).set({
    ...body,
  }).where(eq(lessons.id, lessonId)).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ lessonId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const lessonId = Number(params.lessonId);
  const data = await db.delete(lessons)
    .where(eq(lessons.id, lessonId)).returning();

  return NextResponse.json(data[0]);
};
