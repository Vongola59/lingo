import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),//自增主键
  title: text("title").notNull(),//非空
  imageSrc: text("image_src").notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), 
  description: text("description").notNull(), 
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),//外键，级联删除
  order: integer("order").notNull(),
},
  (table) => [
    index("units_course_order_idx").on(table.courseId, table.order),
  ]
);

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {//一对一关系
    fields: [units.courseId],// 当前表的关联字段
    references: [courses.id],// 目标表的关联字段
  }),
  lessons: many(lessons),//一对多关系
}));

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),  
  title: text("title").notNull(),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "cascade" }).notNull(),//外键，级联删除
  order: integer("order").notNull(),
},
  (table) => [
    index("lessons_unit_order_idx").on(table.unitId, table.order),
  ]
);

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  type: challengesEnum("type").notNull(),
  question: text("question").notNull(),
  order: integer("order").notNull(),
},
  (table) => [
    index("challenges_lesson_order_idx").on(table.lessonId, table.order),
  ]
);

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
}));

export const challengeOptions = pgTable("challenge_options", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  correct: boolean("correct").notNull(),
  imageSrc: text("image_src"),
  audioSrc: text("audio_src"),
},
  (table) => [
    index("challenge_options_challenge_idx").on(table.challengeId),
  ]
);

export const challengeOptionsRelations = relations(challengeOptions, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeOptions.challengeId],
    references: [challenges.id],
  }),
}));

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
  completed: boolean("completed").notNull().default(false),
 },
  (table) => [
    uniqueIndex("challenge_progress_user_challenge_uidx").on(table.userId, table.challengeId),
    index("challenge_progress_user_idx").on(table.userId),
    index("challenge_progress_challenge_idx").on(table.challengeId),
  ]
);

export const challengeProgressRelations = relations(challengeProgress, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeProgress.challengeId],
    references: [challenges.id],
  }),
}));

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("User"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, { onDelete: "cascade" }),
  hearts: integer("hearts").notNull().default(5),
  points: integer("points").notNull().default(0),
},
  (table) => [
    index("user_progress_points_idx").on(table.points),
  ]
);

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
  stripeStatus: text("stripe_status"),
  stripeCancelAtPeriodEnd: boolean("stripe_cancel_at_period_end"),
});

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  data: text("data"), // JSON string of the event data
});

export const roleEnum = pgEnum("role", ["ADMIN", "EDITOR", "USER"]);

export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_roles_user_role_uidx").on(table.userId, table.role),
    index("user_roles_user_idx").on(table.userId),
  ]
);
