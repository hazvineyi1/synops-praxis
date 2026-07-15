// Set a password for a Praxis admin account in production.
//
// In prod, dev-login is disabled and the seeded users have no password, so there must
// be a way to give the first super_admin a real password. This does exactly that, using
// the SAME hashing Praxis uses (scryptSync -> "salt:derived", both hex). The password is
// read from a prompt on THIS machine and never printed or logged.
//
// Usage (via BOOTSTRAP-ADMIN.bat):  node bootstrap-admin.cjs <email> <password>

const fs = require("fs");
const path = require("path");
const { scryptSync, randomBytes } = require("node:crypto");

const email = (process.argv[2] || "").toLowerCase().trim();
const password = process.argv[3] || "";
if (!email || !password) {
  console.log("Usage: node bootstrap-admin.cjs <email> <password>");
  process.exit(1);
}
if (password.length < 10) {
  console.log("Password must be at least 10 characters.");
  process.exit(1);
}

const repo = __dirname;
const url = fs.readFileSync(path.join(repo, ".praxis-env"), "utf8").trim();

// Match praxis/artifacts/api-server/src/lib/auth.ts hashPassword exactly.
const salt = randomBytes(16).toString("hex");
const derived = scryptSync(password, salt, 64).toString("hex");
const passwordHash = `${salt}:${derived}`;

const pgPath = require.resolve("pg", {
  paths: [path.join(repo, "lib", "db"), path.join(repo, "node_modules", ".pnpm", "pg@8.22.0", "node_modules"), repo],
});
const { Client } = require(pgPath);

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    "update users set password_hash = $1, status = 'active' where lower(email) = $2 returning id, email, role",
    [passwordHash, email],
  );
  if (r.rowCount === 0) {
    console.log(`No user with email ${email}. Nothing changed.`);
  } else {
    console.log(`Password set for ${r.rows[0].email} (role ${r.rows[0].role}). You can now sign in.`);
  }
  await c.end();
})().catch((e) => { console.log("ERROR:", e.message); process.exit(1); });
