import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js 15 Static Export compatibility:
// This MUST be a literal string for static analysis. 
// For the Web (standalone), we use force-dynamic.
// For Tauri (export), the CI pipeline will sed this to force-static.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  // Only generate static params when compiling for Tauri (static export).
  // In dev and prod (standalone), return empty array so all routes remain fully dynamic.
  if (process.env.NEXT_OUTPUT === "standalone" || process.env.NODE_ENV === "development") {
    return [];
  }
  return [{ nextauth: ["callback"] }];
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
