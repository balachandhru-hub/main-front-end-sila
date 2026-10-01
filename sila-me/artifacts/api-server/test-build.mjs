import { build } from "esbuild";

const sharedOptions = {
  bundle: true,
  platform: "node",
  format: "cjs",
  sourcemap: "inline",
  external: [
    "cookie-parser",
    "cors",
    "drizzle-orm",
    "express",
    "pino",
    "pino-http",
    "pino-pretty",
  ],
};

await Promise.all([
  build({
    ...sharedOptions,
    entryPoints: ["src/tests/security.test.ts"],
    outfile: ".test-dist/security.test.cjs",
  }),
  build({
    ...sharedOptions,
    entryPoints: ["src/tests/foundation-schema.test.ts"],
    outfile: ".test-dist/foundation-schema.test.cjs",
  }),
]);
