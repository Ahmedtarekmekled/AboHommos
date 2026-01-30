import { createClient } from "@supabase/supabase-js";
import { Database } from "./types/database";

const sb = createClient<Database>("", "");

async function test() {
  // Profiles has Relationships: [] now.
  await sb.from("profiles").insert({ id: "123", role: "CUSTOMER", email: "test", full_name: "test" });
}
