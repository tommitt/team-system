import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` is a Next.js build-time guard that throws when bundled
      // into a client component. It has no meaning under vitest (plain Node),
      // so stub it out to let server modules be unit-tested directly.
      "server-only": new URL("./test/stubs/server-only.ts", import.meta.url)
        .pathname,
    },
  },
});
