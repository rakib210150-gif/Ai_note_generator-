import { supabaseAdmin } from "./src/lib/supabase.js";

async function main() {
  // Let's test inserting a document with a shared flag or system user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  console.log("Found users:", users?.users.length);

  // Check columns on documents table
  const { data: cols, error: cErr } = await supabaseAdmin
    .from("documents")
    .select("*")
    .limit(1);
  console.log("Documents columns:", cols ? Object.keys(cols[0] || {}) : null, cErr);
}

main().catch(console.error);
