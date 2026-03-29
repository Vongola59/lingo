import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { guardAdminApi } from "@/lib/admin";
import { courses } from "@/db/schema";

export const GET = async () => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const data = await db.query.courses.findMany();
  return NextResponse.json(data);
};

export const POST = async (req: Request) => {
  const guard = await guardAdminApi();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const data = await db.insert(courses).values({
    ...body,
  }).returning();

  return NextResponse.json(data[0]);
};
