import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { courses } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ courseId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params
  const courseId = Number(params.courseId)

  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })

  return NextResponse.json(data);
}

export const PUT = async (
  req: Request,
  context: { params: Promise<{ courseId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const params = await context.params;
  const data = await db.update(courses).set({
    ...body,
  }).where(eq(courses.id, Number(params.courseId))).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ courseId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;

  const data = await db.delete(courses)
    .where(eq(courses.id,  Number(params.courseId))).returning();

  return NextResponse.json(data[0]);
};
