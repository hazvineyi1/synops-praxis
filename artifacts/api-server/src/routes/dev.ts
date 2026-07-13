/**
 * Development-only routes for demo and testing.
 * Guarded by NODE_ENV check — returns 404 in production.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const isDev = process.env.NODE_ENV !== "production";

// POST /dev/set-role — change your own role (dev only)
router.post("/dev/set-role", requireAuth, async (req, res) => {
  if (!isDev) { res.status(404).json({ error: "Not found" }); return; }
  const { role } = req.body;
  const validRoles = ["super_admin", "partner_admin", "org_admin", "coach", "learner"];
  if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  // For demo purposes: also set a relevant partnerId/orgId based on role
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
    id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName,
    lastName: usersTable.lastName, role: usersTable.role,
  }).from(usersTable).orderBy(usersTable.role);
  res.json(users);
});

// POST /dev/promote — promote your account to match a seed user's role/partner/org (dev only)
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
