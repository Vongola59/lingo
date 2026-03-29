import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { units } from "@/db/schema";
import { guardAdminApi } from "@/lib/admin";

export const GET = async (
  req: Request,
  context: { params: Promise<{ unitId: number }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const data = await db.query.units.findFirst({
    where: eq(units.id, params.unitId),
  });

  return NextResponse.json(data);
};

export const PUT = async (
  req: Request,
  context: { params: Promise<{ unitId: number }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const body = await req.json();
  const data = await db.update(units).set({
    ...body,
  }).where(eq(units.id, params.unitId)).returning();

  return NextResponse.json(data[0]);
};

export const DELETE = async (
  req: Request,
  context: { params: Promise<{ unitId: number }> }
) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const data = await db.delete(units)
    .where(eq(units.id, params.unitId)).returning();

  return NextResponse.json(data[0]);
};
