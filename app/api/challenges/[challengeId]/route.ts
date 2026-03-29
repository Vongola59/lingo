import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { challenges } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ challengeId: string }> },
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeId = Number(params.challengeId);
  const data = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  return NextResponse.json(data);
};

export const PUT = async (
  req: Request,
  context: { params: Promise<{ challengeId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeId = Number(params.challengeId);
  const body = await req.json();
  const data = await db.update(challenges).set({
    ...body,
  }).where(eq(challenges.id, challengeId)).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ challengeId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const challengeId = Number(params.challengeId);
  const data = await db.delete(challenges)
    .where(eq(challenges.id, challengeId)).returning();

  return NextResponse.json(data[0]);
};
