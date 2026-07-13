/**
 * Development-only routes for demo and testing.
 * Guarded by NODE_ENV check — returns 404 in production.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { DEV_SESSION_COOKIE } from "../middlewares/requireAuth";

const router = Router();

const isDev = process.env.NODE_ENV !== "production";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: "/",
};

// POST /dev/impersonate — set a dev session cookie for a seed user (no Clerk required)
router.post("/dev/impersonate", async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const { userId } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.cookie(DEV_SESSION_COOKIE, userId, COOKIE_OPTS);
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } });
});

// DELETE /dev/impersonate — clear the dev session cookie
router.delete("/dev/impersonate", (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  res.clearCookie(DEV_SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// GET /dev/impersonate — check who's currently impersonated
router.get("/dev/impersonate", async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const userId = req.cookies?.[DEV_SESSION_COOKIE];
  if (!userId) { res.json({ impersonating: null }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  res.json({ impersonating: user ?? null });
});

// POST /dev/set-role — change your own role (dev only, requires active session)
router.post("/dev/set-role", requireAuth, async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const { role } = req.body;
  const validRoles = ["super_admin", "partner_admin", "org_admin", "coach", "learner"];
  if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  let partnerId: string | null = req.dbUser!.partnerId ?? null;
  let organisationId: string | null = req.dbUser!.organisationId ?? null;

  if (role === "super_admin") { partnerId = null; organisationId = null; }
  else if (role === "partner_admin") { partnerId = partnerId ?? "partner_talentforge"; organisationId = null; }
  else if (role === "org_admin") { partnerId = partnerId ?? "partner_talentforge"; organisationId = organisationId ?? "org_mtn"; }
  else if (role === "coach") { partnerId = partnerId ?? "partner_talentforge"; organisationId = organisationId ?? "org_mtn"; }

  const [updated] = await db.update(usersTable)
    .set({ role, partnerId, organisationId, updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json({ ok: true, user: { id: updated.id, role: updated.role, partnerId: updated.partnerId, organisationId: updated.organisationId } });
});

// GET /dev/seed-users — list all seed users for reference
router.get("/dev/seed-users", async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    partnerId: usersTable.partnerId,
    organisationId: usersTable.organisationId,
  }).from(usersTable).orderBy(usersTable.role);
  res.json(users);
});

// POST /dev/promote — promote your account to match a seed user's role/partner/org
router.post("/dev/promote", requireAuth, async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const { targetUserId } = req.body;
  const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetUserId) });
  if (!target) { res.status(404).json({ error: "Seed user not found" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ role: target.role, partnerId: target.partnerId, organisationId: target.organisationId, updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json({ ok: true, user: { id: updated.id, role: updated.role, partnerId: updated.partnerId, organisationId: updated.organisationId } });
});

export default router;
