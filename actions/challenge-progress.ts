"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import db from "@/db/drizzle";
import { getUserSubscription } from "@/db/queries";
import { challengeProgress, challenges, userProgress } from "@/db/schema";

export const upsertChallengeProgress = async (challengeId: number) => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const userSubscription = await getUserSubscription();

  const currentUserProgress = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    columns: {
      userId: true,
      activeCourseId: true,
      hearts: true,
    },
  });
  if (!currentUserProgress) {
    throw new Error("User progress not found");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    columns: {
      id: true,
      lessonId: true,
    },
  });
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const existingChallengeProgress = await db.query.challengeProgress.findFirst({
    where: and(
      eq(challengeProgress.userId, userId),
      eq(challengeProgress.challengeId, challengeId)
    ),
    columns: { id: true },
  });

  const isPractice = !!existingChallengeProgress;

  if (
    currentUserProgress.hearts === 0 &&
    !isPractice &&
    !userSubscription?.isActive
  ) {
    return { error: "hearts" as const };
  }

  if (isPractice) {
    await db
      .update(challengeProgress)
      .set({ completed: true })
      .where(eq(challengeProgress.id, existingChallengeProgress!.id));

    await db
      .update(userProgress)
      .set({
        hearts: sql`LEAST(${userProgress.hearts} + 1, 5)`,
        points: sql`${userProgress.points} + 10`,
      })
      .where(eq(userProgress.userId, userId));
  } else {
    await db
      .insert(challengeProgress)
      .values({
        userId,
        challengeId,
        completed: true,
      })
      .onConflictDoUpdate({
        target: [challengeProgress.userId, challengeProgress.challengeId],
        set: { completed: true },
      });

    await db
      .update(userProgress)
      .set({
        points: sql`${userProgress.points} + 10`,
      })
      .where(eq(userProgress.userId, userId));
  }

  const tags = [
    "user-progress",
    "course-progress",
    `lesson-${challenge.lessonId}`,
    "leaderboard",
  ];

  if (currentUserProgress.activeCourseId) {
    tags.push(`course-${currentUserProgress.activeCourseId}`);
  }
  await Promise.all(tags.map((tag) => updateTag(tag)));
  
  revalidatePath(`/lesson/${challenge.lessonId}`);
};