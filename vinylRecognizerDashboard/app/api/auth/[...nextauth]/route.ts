import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js 15 Static Export compatibility:
// In Tauri (export mode), we force this route to static and provide no params so it doesn't break the build.
// In Web (standalone mode), it remains dynamic for Authentik OAuth.
export const dynamic = process.env.NEXT_OUTPUT === "standalone" ? "force-dynamic" : "force-static";

export function generateStaticParams() {
  return [];
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
