// Vercel serverless entry for the Dempo Vidya API.
//
// Imports the PREBUILT, self-contained Express app bundle (produced by the
// api-server esbuild build -> dist/app.mjs). Using a dynamic import when
// DATABASE_URL is configured ensures that a zero-config Vercel deployment
// (before DATABASE_URL / Clerk env vars are added) still serves /api/healthz
// with HTTP 200 instead of crashing on cold start with FUNCTION_INVOCATION_FAILED.

let cachedApp = null;

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    if (req.url && req.url.startsWith("/api/healthz")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "ok",
          mode: "standalone",
          app: "Dempo Vidya LMS",
          region: "bom1",
        }),
      );
      return;
    }
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "Cloud database not configured in Vercel Environment Variables yet. Using standalone interactive LMS mode at /",
      }),
    );
    return;
  }

  if (!cachedApp) {
    const mod = await import("../artifacts/api-server/dist/app.mjs");
    cachedApp = mod.default;
  }
  return cachedApp(req, res);
}
