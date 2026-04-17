import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// In static export mode (Tauri), this route has no server to run on.
// Returning [] excludes it from the export while keeping it functional
// in Docker/standalone (server) mode where generateStaticParams is ignored.
export function generateStaticParams() {
  return [];
}

// force-dynamic is required so NextAuth can access cookies and request headers.
// In export mode (Tauri), generateStaticParams returning [] excludes this route
// from the static export, so force-dynamic never conflicts with output: 'export'.
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
