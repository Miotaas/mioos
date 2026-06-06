export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
