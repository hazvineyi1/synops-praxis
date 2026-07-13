import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Extend request with our user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

/**
 * Verify Clerk session and load our local user record.
 * Creates a local user record (JIT) if one doesn't exist yet.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });

    // JIT provision: first time this Clerk user hits the API
    if (!user) {
      const [created] = await db
        .insert(usersTable)
        .values({
          clerkId,
          email: auth.sessionClaims?.email as string ?? `${clerkId}@unknown.local`,
          role: "learner",
        })
        .returning();
      user = created;
    }

    req.userId = user.id;
    req.dbUser = user;
    next();
  } catch (err) {
    req.log.error({ err }, "requireAuth error");
    res.status(500).json({ error: "Internal server error" });
  }
};

/** Shorthand for role checks */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.dbUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
};
