import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing env vars. Got:", { url: !!url, key: !!key });
  process.exit(1);
}

console.log("URL :", url);
console.log("Key :", key.slice(0, 12) + "..." + key.slice(-4));

const supabase = createClient(url, key);

const t0 = Date.now();
const { data, error } = await supabase.auth.getSession();
const ms = Date.now() - t0;

if (error) {
  console.error(`auth.getSession() FAILED in ${ms}ms:`, error);
  process.exit(1);
}

console.log(`auth.getSession() OK in ${ms}ms. Session:`, data.session ?? "(none, expected for anon client)");

const probe = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log(`REST /rest/v1/ HTTP ${probe.status} ${probe.statusText}`);

if (probe.status >= 200 && probe.status < 500) {
  console.log("\nSmoke test PASSED — env vars are valid and project is reachable.");
} else {
  console.error("\nSmoke test FAILED — unexpected REST response.");
  process.exit(1);
}
