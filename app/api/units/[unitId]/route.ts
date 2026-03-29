import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { units } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ unitId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const unitId = Number(params.unitId);
  const data = await db.query.units.findFirst({
    where: eq(units.id, unitId),
  });

  return NextResponse.json(data);
};

export const PUT = async (
  req: Request,
  context: { params: Promise<{ unitId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const unitId = Number(params.unitId);
  const body = await req.json();
  const data = await db.update(units).set({
    ...body,
  }).where(eq(units.id, unitId)).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ unitId: string }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const unitId = Number(params.unitId);
  const data = await db.delete(units)
    .where(eq(units.id, unitId)).returning();

  return NextResponse.json(data[0]);
};
