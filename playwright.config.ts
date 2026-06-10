import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// E2E runs against the local Supabase stack only; the hosted project is the
// shared demo environment. Run `supabase db reset` first for a clean seed.
const env: Record<string, string> = {};
config({ path: ".env.test", processEnv: env });

if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")) {
  throw new Error("E2E tests must run against the local Supabase stack (.env.test)");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  // Dev-server cold compiles of the authenticated app tree can exceed 30s
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Production build: dev-mode cold compiles are too slow for reliable e2e
    // in constrained environments. NEXT_PUBLIC_* values come from .env.test
    // via the env override, which beats .env.local at build time.
    command: "npm run build && npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 300000,
    env,
  },
});
