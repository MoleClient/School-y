#!/usr/bin/env node
/**
 * timeout-user — mute a School-y user for a given number of minutes
 * Usage:  node scripts/timeout-user.mjs <username> <minutes>
 *         node scripts/timeout-user.mjs <username> 0     ← clears timeout
 */

import pg from "pg";

const { Client } = pg;

const [username, minsArg] = process.argv.slice(2);

if (!username || minsArg === undefined) {
  console.error("Usage: node scripts/timeout-user.mjs <username> <minutes>");
  console.error("       Use 0 minutes to clear an existing timeout.");
  process.exit(1);
}

const minutes = Number(minsArg);
if (isNaN(minutes) || minutes < 0) {
  console.error("Minutes must be a non-negative number.");
  process.exit(1);
}

const db = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await db.connect();

  const { rows } = await db.query(
    `SELECT id, username, display_name, timed_out_until FROM users WHERE username = $1`,
    [username]
  );

  if (rows.length === 0) {
    console.error(`No user found with username: "${username}"`);
    await db.end();
    process.exit(1);
  }

  const user = rows[0];

  if (minutes === 0) {
    await db.query(`UPDATE users SET timed_out_until = NULL WHERE id = $1`, [user.id]);
    console.log(`Cleared timeout for "${user.username}" — they can message again immediately.`);
  } else {
    const until = new Date(Date.now() + minutes * 60 * 1000);
    await db.query(`UPDATE users SET timed_out_until = $1 WHERE id = $2`, [until, user.id]);
    const label = minutes === 1 ? "1 minute" : `${minutes} minutes`;
    console.log(`"${user.username}" is timed out for ${label}.`);
    console.log(`Timeout expires: ${until.toLocaleString()}`);
  }

  await db.end();
}

run().catch(async (err) => {
  console.error("Error:", err.message);
  await db.end().catch(() => {});
  process.exit(1);
});
