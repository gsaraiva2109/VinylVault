import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// In static export mode (Tauri), this route has no server to run on.
// Returning [] excludes it from the export while keeping it functional
// in Docker/standalone (server) mode where generateStaticParams is ignored.
export function generateStaticParams() {
  return [];
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
