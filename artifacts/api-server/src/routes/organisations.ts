import { Router } from "express";
import { db } from "@workspace/db";
import { organisationsTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function toOrgResponse(o: typeof organisationsTable.$inferSelect) {
  return {
    id: o.id,
    name: o.name,
    partnerId: o.partnerId,
    industry: o.industry,
    memberCount: o.memberCount,
    createdAt: o.createdAt.toISOString(),
  };
}

function toUserResponse(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    partnerId: u.partnerId,
    organisationId: u.organisationId,
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /organisations
router.get("/organisations", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  let orgs;
  if (user.role === "super_admin") {
    orgs = await db.select().from(organisationsTable);
  } else if (user.partnerId) {
    orgs = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.partnerId, user.partnerId));
  } else {
    orgs = [];
  }
  res.json(orgs.map(toOrgResponse));
});

// POST /organisations
router.post("/organisations", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  if (!["super_admin", "partner_admin"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, industry } = req.body;
  const partnerId = user.partnerId!;
  const [org] = await db
    .insert(organisationsTable)
    .values({ name, industry, partnerId })
    .returning();
  res.status(201).json(toOrgResponse(org));
});

// GET /organisations/:orgId
router.get("/organisations/:orgId", requireAuth, async (req, res) => {
  const org = await db.query.organisationsTable.findFirst({
    where: eq(organisationsTable.id, req.params.orgId),
  });
  if (!org) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toOrgResponse(org));
});

// PATCH /organisations/:orgId
router.patch("/organisations/:orgId", requireAuth, async (req, res) => {
  const { name, industry } = req.body;
  const [updated] = await db
    .update(organisationsTable)
    .set({ name, industry, updatedAt: new Date() })
    .where(eq(organisationsTable.id, req.params.orgId))
    .returning();
  res.json(toOrgResponse(updated));
});

// GET /organisations/:orgId/members
router.get("/organisations/:orgId/members", requireAuth, async (req, res) => {
  const members = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.organisationId, req.params.orgId));
  res.json(members.map(toUserResponse));
});

// POST /organisations/:orgId/members
router.post("/organisations/:orgId/members", requireAuth, async (req, res) => {
  const { email, role } = req.body;
  const user = req.dbUser!;
  // Find or create user by email (in production you'd send an invite)
  let member = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!member) {
    // Create placeholder — real invite flow would use Clerk invitations
    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId: `placeholder_${Date.now()}`,
        email,
        role,
        partnerId: user.partnerId,
        organisationId: req.params.orgId,
      })
      .returning();
    member = created;
  } else {
    const [updated] = await db
      .update(usersTable)
      .set({ role, organisationId: req.params.orgId, partnerId: user.partnerId })
      .where(eq(usersTable.id, member.id))
      .returning();
    member = updated;
  }
  res.status(201).json(toUserResponse(member));
});

// GET /organisations/:orgId/stats
router.get("/organisations/:orgId/stats", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const [memberCount] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.organisationId, orgId));

  res.json({
    orgId,
    totalMembers: Number(memberCount.count),
    activeEnrolments: 0,
    completions: 0,
    credentialsIssued: 0,
    avgMasteryScore: 0,
    competencyGaps: [],
  });
});

export default router;
