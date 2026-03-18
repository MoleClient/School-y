#!/usr/bin/env node
/**
 * delete-user — permanently remove a School-y user account
 * Usage:  node scripts/delete-user.mjs <username>
 */

import pg from "pg";
import readline from "readline";

const { Client } = pg;

const username = process.argv[2];
if (!username) {
  console.error("Usage: node scripts/delete-user.mjs <username>");
  process.exit(1);
}

const db = new Client({ connectionString: process.env.DATABASE_URL });

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function run() {
  await db.connect();

  // Find user
  const { rows } = await db.query(
    `SELECT id, username, display_name, bio, created_at FROM users WHERE username = $1`,
    [username]
  );

  if (rows.length === 0) {
    console.error(`No user found with username: "${username}"`);
    await db.end();
    process.exit(1);
  }

  const user = rows[0];
  console.log("\nFound user:");
  console.log(`  ID:           ${user.id}`);
  console.log(`  Username:     ${user.username}`);
  console.log(`  Display name: ${user.display_name || "(none)"}`);
  console.log(`  Bio:          ${user.bio || "(none)"}`);
  console.log(`  Created:      ${user.created_at}`);

  // Count their data
  const [sessions, history, reactions, messages, memberships] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM user_sessions WHERE user_id = $1`, [user.id]),
    db.query(`SELECT COUNT(*) FROM browser_history WHERE user_id = $1`, [user.id]),
    db.query(`SELECT COUNT(*) FROM message_reactions WHERE user_id = $1`, [user.id]),
    db.query(`SELECT COUNT(*) FROM chat_messages WHERE user_id = $1`, [user.id]),
    db.query(`SELECT COUNT(*) FROM conversation_members WHERE user_id = $1`, [user.id]),
  ]);

  console.log("\nAssociated data that will be deleted:");
  console.log(`  Sessions:        ${sessions.rows[0].count}`);
  console.log(`  History items:   ${history.rows[0].count}`);
  console.log(`  Chat messages:   ${messages.rows[0].count}`);
  console.log(`  Reactions:       ${reactions.rows[0].count}`);
  console.log(`  Conversations:   ${memberships.rows[0].count}`);

  const confirm = await ask(`\nType the username to confirm deletion: `);
  if (confirm !== username) {
    console.log("Cancelled — username did not match.");
    await db.end();
    process.exit(0);
  }

  console.log("\nDeleting...");

  await db.query(`DELETE FROM message_reactions WHERE user_id = $1`, [user.id]);
  console.log("  ✓ Reactions deleted");

  await db.query(`DELETE FROM chat_messages WHERE user_id = $1`, [user.id]);
  console.log("  ✓ Messages deleted");

  await db.query(`DELETE FROM conversation_members WHERE user_id = $1`, [user.id]);
  console.log("  ✓ Conversation memberships deleted");

  await db.query(`DELETE FROM browser_history WHERE user_id = $1`, [user.id]);
  console.log("  ✓ Browse history deleted");

  await db.query(`DELETE FROM user_sessions WHERE user_id = $1`, [user.id]);
  console.log("  ✓ Sessions deleted");

  await db.query(`DELETE FROM users WHERE id = $1`, [user.id]);
  console.log("  ✓ User account deleted");

  console.log(`\nDone. "${username}" has been permanently removed.`);
  await db.end();
}

run().catch(async (err) => {
  console.error("Error:", err.message);
  await db.end().catch(() => {});
  process.exit(1);
});
