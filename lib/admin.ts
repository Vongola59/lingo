import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { userRoles } from "@/db/schema";

export const getIsAdmin = async () => {
  const { userId } = await auth();
  if (!userId) return false;

  const role = await db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.role, "ADMIN")),
    columns: { id: true },
  });

  return !!role;
};

export type AdminApiGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export const guardAdminApi = async (): Promise<AdminApiGuardResult> => {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  const role = await db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.role, "ADMIN")),
    columns: { id: true },
  });

  if (!role) {
    return {
      ok: false,
      response: new NextResponse("Forbidden", { status: 403 }),
    };
  }

  return { ok: true, userId };
};