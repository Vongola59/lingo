import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import {
  challengeProgress,
  courses,
  lessons,
  units,
  userProgress,
  userSubscription,
} from "@/db/schema";
import { unstable_cache } from "next/cache";

export const getUserProgress = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  // 用户进度相对频繁变动，且查询成本较高，使用unstable_cache进行全局缓存，减少重复查询
  const cachedGetUserProgress = unstable_cache(
    async (uid) => {//缓存函数入参uid：接收外层的userId，避免闭包变量导致的缓存问题
      return db.query.userProgress.findFirst({
        where: eq(userProgress.userId, uid),// 按userId过滤，保证用户数据隔离
        with: { activeCourse: true },// 关联查询userProgress表的activeCourseId对应的courses表数据，避免后续查询课程信息时的额外查询成本
      });
    },
    ["user-progress", userId], // 按userId隔离，避免跨用户共享
    { revalidate: 30, tags: ["user-progress"] } // 30s过期 + 标签用于主动刷新
  );
  return cachedGetUserProgress(userId);
});

export const getUnits = cache(async () => {
  const { userId } = await auth();
  const userProgress = await getUserProgress();
  if (!userId || !userProgress?.activeCourseId) {
    return [];
  }
  const courseId = userProgress.activeCourseId;
  const cachedGetUnits = unstable_cache(
    async (uid, cid) => {//入参：uid=userId（用户隔离），cid=courseId（课程隔离）
      // 数据库多层关联查询：查询指定课程的所有单元，按order正序排列
      const data = await db.query.units.findMany({
        orderBy: (units, { asc }) => [asc(units.order)],// 单元按业务排序字段order正序排列
        where: eq(units.courseId, cid),
        with: {// 关联查询：单元→课时→挑战→挑战进度
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
            with: {
              challenges: {
                orderBy: (challenges, { asc }) => [asc(challenges.order)],
                with: {
                  challengeProgress: {
                    where: eq(
                      challengeProgress.userId,
                      uid,
                    ),
                  },
                },
              },
            },
          },
        },
      });
      // 数据标准化：为每个课时补全completed完成状态，业务层直接使用，避免前端重复计算
      const normalizedData = data.map((unit) => {
        const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
          if (
            lesson.challenges.length === 0
          ) {// 课时无挑战，默认标记为未完成
            return { ...lesson, completed: false };
          }
          // 课时完成条件：所有挑战均被当前用户完成
          const allCompletedChallenges = lesson.challenges.every((challenge) => {
            return challenge.challengeProgress// 存在挑战进度记录
              && challenge.challengeProgress.length > 0// 进度记录非空
              && challenge.challengeProgress.every((progress) => progress.completed);// 所有进度记录均为完成
          });
          return { ...lesson, completed: allCompletedChallenges };// 为课时添加completed字段
        });
        return { ...unit, lessons: lessonsWithCompletedStatus };// 替换单元下的课时为带完成状态的课时
      });
      return normalizedData;
    },
    ["units", userId, String(courseId)], // 按用户+课程隔离，跨课程不共享缓存
    { revalidate: 30, tags: ["course-progress", `course-${courseId}`] } // 课程进度标签
  );

  return cachedGetUnits(userId, courseId);
});

export const getCourses = cache(async () => {
  const cachedGetCourses = unstable_cache(
    async () => {
      // 显式指定返回字段，仅返回前端课程列表展示所需字段，减少数据传输
      return db.query.courses.findMany({
        columns: {
          id: true,
          title: true,
          imageSrc: true, 
        },
        orderBy: (courses, { asc }) => [asc(courses.id)], // 按业务排序，前端无需再排序
      });
    },
    ["courses-all"], // 全局缓存键，所有用户共享
    { revalidate: 300, tags: ["courses"] } // 5分钟长过期，课程增删改时通过tag主动刷新
  );
  return cachedGetCourses();
});

export const getCourseById = cache(async (courseId: number) => {
  const cachedGetCourseById = unstable_cache(
    async (cid) => {
      return db.query.courses.findFirst({
        where: eq(courses.id, cid),
        with: {
          units: {
            orderBy: (units, { asc }) => [asc(units.order)],
            with: {
              lessons: {
                orderBy: (lessons, { asc }) => [asc(lessons.order)],
              },
            },
          },
        },
      });
    },
    ["course-by-id", String(courseId)], // 按课程ID隔离缓存
    { revalidate: 300, tags: ["courses"] } // 5分钟过期，课程标签用于主动刷新
  );
  return cachedGetCourseById(courseId);
});

export const getCourseProgress = cache(async () => {
  const unitsData = await getUnits();
  if (!unitsData.length) {
   return null;
  }
  
  const firstUncompletedLesson = unitsData
    .flatMap((unit) => unit.lessons)
    .find((lesson) => !lesson.completed);

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = await auth();
  const userProgressData = await getUserProgress(); // 复用已缓存的用户进度
  if (!userId || !userProgressData?.activeCourseId) {
    return null;
  }
  const lessonId = id ?? (await getCourseProgress())?.activeLessonId;
  if (!lessonId) {
    return null;
  }

  const cachedGetLesson = unstable_cache(
    async (uid, lid) => {
      // 数据库查询：按课时ID查找，关联挑战→挑战选项→挑战进度
      const data = await db.query.lessons.findFirst({
        where: eq(lessons.id, lid),
        with: {
          challenges: {
            orderBy: (challenges, { asc }) => [asc(challenges.order)],
            with: {
              challengeOptions: true,// 关联挑战的所有选项（答题类业务核心数据）
              challengeProgress: {
                where: eq(challengeProgress.userId, uid),
              },
            },
          },
        },
      });

      if (!data || !data.challenges) {
        return null;
      }
      // 数据标准化：为每个挑战补全completed完成状态，业务层直接使用，避免前端重复计算
      const normalizedChallenges = data.challenges.map((challenge) => {
        const completed = challenge.challengeProgress// 存在挑战进度记录
          && challenge.challengeProgress.length > 0// 进度记录非空
          && challenge.challengeProgress.every((progress) => progress.completed)// 所有进度记录均为完成

        return { ...challenge, completed };
      });

      return { ...data, challenges: normalizedChallenges }
    },
    ["lesson", userId, String(lessonId)], // 按用户+课程隔离缓存
    { revalidate: 30, tags: ["course-progress", `lesson-${lessonId}`] } // 30s过期 + 课程进度标签
  );
  return cachedGetLesson(userId, lessonId);
});

export const getLessonPercentage = cache(async () => {
  const { userId } = await auth();
  if (!userId) return 0;
  const courseProgress = await getCourseProgress();
  const lessonId = courseProgress?.activeLessonId;
  if (!lessonId) return 0;
 
  const cachedGetLessonPercentage = unstable_cache(
    async (uid, lid) => {
      const data = await db.query.lessons.findFirst({
        where: eq(lessons.id, lid),
        columns: { id: true },
        with: {
          challenges: {
            columns: { id: true },
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, uid),
                columns: { completed: true },
              },
            },
          },
        },
      });

      if (!data || data.challenges.length === 0) return 0;

      const completed = data.challenges.filter((challenge) => {
        return (
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      }).length;

      return Math.round((completed / data.challenges.length) * 100);
    },
    ["lesson-percentage", userId, String(lessonId)],
    { revalidate: 30, tags: ["course-progress", `lesson-${lessonId}`] }
  );

  return cachedGetLessonPercentage(userId, lessonId);
});


const DAY_IN_MS = 86_400_000; // 定义一天的毫秒数：24*60*60*1000，用于订阅有效性判断的缓冲期
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
export const getUserSubscription = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;
 const cachedGetUserSubscription=unstable_cache(
    async (uid) => {
      // 数据库查询：按userId查找订阅信息，仅返回核心字段（减少数据传输）
      const data = await db.query.userSubscription.findFirst({
        where: eq(userSubscription.userId, uid),
        columns: {// 显式指定返回字段，剔除冗余字段
          id: true,
          userId: true,
          stripePriceId: true,
          stripeCustomerId: true,
          stripeStatus: true,
          stripeCancelAtPeriodEnd: true,
          stripeCurrentPeriodEnd: true,
        },
      });

      if (!data) return null;
      // 核心业务逻辑：判断订阅是否有效
      const isActive =
        !!data.stripePriceId && // 存在Stripe价格ID（排除免费订阅/测试订阅）
        ACTIVE_SUBSCRIPTION_STATUSES.has(data.stripeStatus || "") && // 只给活跃/试用状态提供权益
        data.stripeCurrentPeriodEnd!.getTime() + DAY_IN_MS > Date.now();// 订阅到期时间+1天缓冲期 > 当前时间：避免到期当天立即失效，提升用户体验
      // 返回订阅信息+是否有效标识，业务层直接使用isActive判断权益
      return {
        ...data,
        isActive,
      };
    },
    //缓存键：按 userId 区分
    ["user-subscription", userId],
    {
      revalidate: 5,// 缓存5秒（提升订阅变更后的前端响应速度）
      tags: ["subscription"],// 缓存标签，用于主动失效
    }
  );
  return cachedGetUserSubscription(userId);
});
export const getTopTenUsers = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }
  const cachedGetTopTen = unstable_cache(
    async () => {
      // 数据库查询：按积分倒序排列，限制返回前10条，仅返回核心展示字段（减少数据传输）
      return db.query.userProgress.findMany({
        orderBy: (userProgress, { desc }) => [desc(userProgress.points)], // 按points积分倒序排列
        limit: 10,// 限制返回10条，提升查询性能，避免全表扫描
        columns: {// 仅返回排行榜所需字段，数据脱敏/减少传输
          userId: true,
          userName: true,
          userImageSrc: true,
          points: true,
        },
      });
    },
    ["top-ten-users"], // 全局缓存，所有用户共享排行榜
    { revalidate: 300, tags: ["leaderboard"] } // 300s过期，排行榜无需实时
  );
  return cachedGetTopTen();
});

//采用「React cache 包裹 Next.js unstable_cache」的双层缓存策略，这么设计的核心原因是什么？两者单独使用各有什么问题？
//双层缓存的核心价值
// 1. React cache 保证单次请求内的重复调用不重复执行（轻量、无额外成本），适合函数内部多次调用同一查询的场景，避免函数内重复查询导致的性能问题。
// 2. Next.js unstable_cache 保证跨请求的全局缓存，减少数据库重复查询，适合高成本查询的结果缓存，提升整体性能和响应速度。
// 3. 两者结合能覆盖所有服务端查询的缓存场景，兼顾「单次请求性能」和「跨请求性能」，实现更细粒度的缓存控制，提升用户体验和系统效率。
//单独使用的问题
// 1. 仅使用 React cache：只能保证单次请求内的缓存，跨请求（如页面刷新）仍会重复查询，无法提升整体性能，尤其是高频访问的查询（如课程列表、排行榜）会导致数据库压力过大。
// 2. 仅使用 unstable_cache：虽然能实现跨请求缓存，但无法避免函数内部的重复查询，尤其是在一个请求内多次调用同一查询时，会导致不必要的性能损失（如getCourseProgress内部多次调用getUserProgress）。

//为什么getCourses/getCourseById用 300s 长缓存，而getUserProgress/getLesson只用 30s 短缓存？缓存过期时间（revalidate）的设计原则是什么？
//时效差异的核心原因：根据数据变更频率和业务实时性要求划分，贴合学习类产品的业务特性：长缓存（300s/5 分钟）：getCourses/getCourseById查询的是课程基础数据，属于静态公共数据，仅在后台增删改课程时变更，低频且无实时性要求，长缓存能大幅提升缓存命中率；短缓存（30s）：getUserProgress/getLesson查询的是用户专属动态数据，爱心、积分、挑战完成状态会随用户操作频繁变更，学习页 / 挑战页需要实时展示最新进度，30s 是「性能」和「数据新鲜度」的最优平衡点。「付费 / 权益核心数据」：即使变更低频（如getUserSubscription），也用短缓存（30s），避免用户续费后长时间无法享受权益。


//缓存键（如["units", userId, String(courseId)]）为什么要拼接userId和业务ID？
//实现精细化缓存隔离，杜绝「缓存污染」和「数据泄露」：加userId：保证用户专属数据（如进度、课时完成状态）不跨用户共享，避免 A 用户查到 B 用户的学习数据；加业务 ID（courseId/lessonId）：保证同一用户的不同业务数据（如课程 A / 课程 B 的单元）不共享缓存，避免切换课程后展示旧数据。

//代码中为每个函数配置了tags,这个标签的核心作用是什么？
//缓存标签的核心作用：实现缓存的精准主动刷新，解决「缓存过期前数据已变更」的问题，平衡「长缓存性能」和「数据实时性」。若无 tags，缓存只能等待revalidate时间到期后自动失效，若数据在过期前变更（如用户完成挑战、课程更新），前端会展示「脏数据」；配置 tags 后，在数据修改的业务函数中调用revalidateTag("标签名")，可立即让对应缓存失效，下次请求会重新查询最新数据。