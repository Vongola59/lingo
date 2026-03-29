import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { challengeOptions } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ challengeOptionId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeOptionId = Number(params.challengeOptionId);
  const data = await db.query.challengeOptions.findFirst({
    where: eq(challengeOptions.id, challengeOptionId),
  });

  return NextResponse.json(data);
};

export const PUT = async (
  req: Request,
  context: { params: Promise<{ challengeOptionId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeOptionId = Number(params.challengeOptionId);
  const body = await req.json();
  const data = await db.update(challengeOptions).set({
    ...body,
  }).where(eq(challengeOptions.id, challengeOptionId)).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ challengeOptionId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeOptionId = Number(params.challengeOptionId);

  const data = await db.delete(challengeOptions)
    .where(eq(challengeOptions.id, challengeOptionId)).returning();

  return NextResponse.json(data[0]);
};
