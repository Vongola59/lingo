"use server";

import { POINTS_TO_REFILL } from "@/constants";
import db from "@/db/drizzle";
import { getCourseById, getUserProgress, getUserSubscription } from "@/db/queries";
import { challengeProgress, challenges, userProgress } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { HEART_POINT_RELATED_PATHS } from "@/constants";
import { redirect } from "next/navigation";
//新增或更新用户进度(切换、选择课程时调用)
export const upsertUserProgress = async (courseId: number) => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    throw new Error("Unauthorized");
  }
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  await db.insert(userProgress)
  .values({
    userId, // 主键，作为冲突判断依据
    activeCourseId: courseId,
    userName: user.firstName || "User",
    userImageSrc: user.imageUrl || "/mascot.svg",
  })
  .onConflictDoUpdate({
    target: userProgress.userId, // 冲突判断：主键userId重复时触发更新
    set: {
      // 冲突时更新的字段（与插入字段一致，同步Clerk信息+更新活跃课程）
      activeCourseId: courseId,
      userName: user.firstName || "User",
      userImageSrc: user.imageUrl || "/mascot.svg",
    },
  });
  //课程切换后需要重新验证相关页面数据并重定向到学习页面
  revalidatePath("/courses");
  revalidatePath("/learn");
  redirect("/learn");
};

//扣减用户爱心（普通用户首次参与挑战时触发）
export const reduceHearts = async (challengeId: number) => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const currentUserProgress = await getUserProgress();
  const userSubscription = await getUserSubscription();

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId)
  });
  if (!challenge) {
    throw new Error("Challenge not found");
  }
  const lessonId = challenge.lessonId;
  const existingChallengeProgress = await db.query.challengeProgress.findFirst({
    where: and(
      eq(challengeProgress.userId, userId),
      eq(challengeProgress.challengeId, challengeId)
    )
  });
  const isPractice = !!existingChallengeProgress;
  //业务规则校验（按优先级判断，不满足则返回错误对象，前端做提示）
  if (isPractice) {
    return { error: "practice" };//如果是练习挑战，直接返回错误提示用户无需扣心
  }
  if (!currentUserProgress) {
    throw new Error("User progress not found");//正常情况下用户进度应该始终存在，这里做个兜底
  }
  if (currentUserProgress.hearts === 0) {
    return { error: "hearts" };//如果没有爱心了，返回错误提示用户爱心不足
  }
  if (userSubscription?.isActive) {
    return { error: "subscription" };//如果用户是付费订阅者，返回错误提示用户无需扣心
  }

  //执行扣减：爱心-1，最低为0（避免负数）
  await db.update(userProgress).set({
    hearts: sql`GREATEST(${userProgress.hearts} - 1, 0)`,
  }).where(
    eq(userProgress.userId, userId)
  );
  //刷新缓存：商城、学习页、任务、排行榜、当前挑战所属课时页
  HEART_POINT_RELATED_PATHS.forEach(path => revalidatePath(path));
  revalidatePath(`/lesson/${lessonId}`);
  updateTag("user-progress");
  updateTag(`lesson-${lessonId}`);
}
//通过积分换心（用户在挑战失败后选择用积分换心时触发）
export const refillHearts = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const currentUserProgress = await getUserProgress();
  if (!currentUserProgress || currentUserProgress.userId !== userId) {
    throw new Error("User progress not found");
  }
  // 2. 业务规则校验：不满足则抛错（前端需做前置校验，服务端做兜底）
  if (currentUserProgress.hearts === 5) {
    throw new Error("Hearts are already full");// 爱心已满（上限5），禁止兑换
  }
  if (currentUserProgress.points < POINTS_TO_REFILL) {
    throw new Error("Not enough points");// 积分不足，禁止兑换
  }
  //执行兑换：爱心+1，积分扣减指定数量
    await db.update(userProgress).set({
      hearts: currentUserProgress.hearts + 1,
      points: currentUserProgress.points - POINTS_TO_REFILL,
    }).where(eq(userProgress.userId, currentUserProgress.userId));
  //刷新缓存：与爱心/积分相关的核心页面
  HEART_POINT_RELATED_PATHS.forEach(path => revalidatePath(path));
  updateTag("user-progress");
  updateTag("shop");
}

//reduceHearts中业务规则校验返回错误对象，而refillHearts中校验直接抛错，这种设计的考量是什么？
//在reduceHearts中，用户参与挑战时可能因为多种原因无法扣减爱心（如已经是练习挑战、爱心不足、订阅用户等），这些情况属于业务逻辑上的正常分支，前端需要根据不同的错误类型给出相应的提示，因此选择返回一个包含错误类型的对象。而在refillHearts中，兑换爱心的操作相对单一，主要是检查用户是否满足兑换条件（爱心未满、积分足够）。如果不满足条件，这些情况可以被视为异常情况，前端必须做前置校验（如兑换按钮在爱心满 / 积分不足时置灰），服务端的抛错是兜底拦截，用于处理前端校验失效的异常请求（如恶意模拟请求），这类错误无需前端做个性化提示，只需捕获通用错误即可；

//爱心规则的联动逻辑
//reduceHearts是爱心扣减的执行入口：普通用户首次参与挑战时，先调用该函数扣减爱心，扣减成功后才会执行challenge-progress.ts的挑战进度更新；challenge-progress.ts是爱心返还的执行入口：普通用户练习模式完成挑战时，在该文件中返还爱心（Math.min(hearts+1,5)），同时做爱心上限控制；