import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
  int,
  json,
  datetime,
} from "drizzle-orm/mysql-core";

// ─── OAuth Users ───
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Local Users (email/password auth) ───
export const localUsers = mysqlTable("local_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

// ─── Categories ───
export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  userType: mysqlEnum("userType", ["oauth", "local"]),
  name: varchar("name", { length: 50 }).notNull(),
  label: varchar("label", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }).default("calendar"),
  color: varchar("color", { length: 7 }).default("#7d8a74"),
  isSystem: boolean("isSystem").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ─── Schedules ───
export const schedules = mysqlTable("schedules", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userType: mysqlEnum("userType", ["oauth", "local"]).default("oauth").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: datetime("startTime").notNull(),
  endTime: datetime("endTime").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("local"),
  categoryId: bigint("categoryId", { mode: "number", unsigned: true }),
  color: varchar("color", { length: 7 }).default("#fffefa"),
  isRepeating: boolean("isRepeating").default(false),
  repeatPattern: json("repeatPattern"),
  repeatSourceId: bigint("repeatSourceId", { mode: "number", unsigned: true }),
  alarmMinutes: int("alarmMinutes").default(15),
  isCompleted: boolean("isCompleted").default(false),
  source: mysqlEnum("source", ["manual", "excel", "notion", "markdown", "text"]).default("manual"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// ─── Schedule Repeat Suggestions ───
export const scheduleSuggestions = mysqlTable("schedule_suggestions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userType: mysqlEnum("userType", ["oauth", "local"]).default("oauth").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  detectedPattern: varchar("detectedPattern", { length: 50 }).notNull(),
  sampleScheduleIds: json("sampleScheduleIds"),
  suggestionText: varchar("suggestionText", { length: 500 }),
  isAccepted: boolean("isAccepted").default(false),
  isDismissed: boolean("isDismissed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleSuggestion = typeof scheduleSuggestions.$inferSelect;

// ─── Guru Conversations ───
export const guruConversations = mysqlTable("guru_conversations", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userType: mysqlEnum("userType", ["oauth", "local"]).default("oauth").notNull(),
  guruType: mysqlEnum("guruType", ["student", "worker", "doctor", "lawyer", "freelancer", "general"]).default("general"),
  messages: json("messages").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type GuruConversation = typeof guruConversations.$inferSelect;

// ─── App Settings ───
export const appSettings = mysqlTable("app_settings", {
  id: serial("id").primaryKey(),
  authEnabled: boolean("authEnabled").default(true),
  defaultTheme: mysqlEnum("defaultTheme", ["modern", "classic", "dark"]).default("modern"),
  guruEnabled: boolean("guruEnabled").default(true),
  guruFreeMessages: int("guruFreeMessages").default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;
