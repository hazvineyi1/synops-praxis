import { pgTable, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "partner_admin",
  "org_admin",
  "coach",
  "learner",
]);

export const coachPersonalityEnum = pgEnum("coach_personality", [
  "socratic_mentor",
  "drill_sergeant",
  "warm_encourager",
  "strategic_analyst",
]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("learner"),
  partnerId: text("partner_id"),
  organisationId: text("organisation_id"),
  // Learner personalisation (Coach-inspired)
  coachPersonality: coachPersonalityEnum("coach_personality").notNull().default("socratic_mentor"),
  learningStyle: text("learning_style"), // VARK: visual | auditory | kinesthetic | reading_writing
  accommodations: text("accommodations").array().notNull().default([]),
  // WhatsApp two-way channel
  phone: text("phone"),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
