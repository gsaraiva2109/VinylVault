import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js 15 Static Export compatibility:
// This MUST be a literal string for static analysis. 
// For the Web (standalone), we use force-dynamic.
// For Tauri (export), the CI pipeline will sed this to force-static.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
