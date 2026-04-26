import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import AuthentikProvider from "next-auth/providers/authentik";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    error?: "RefreshAccessTokenError";
    groups?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: "RefreshAccessTokenError";
    groups?: string[];
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // Authentik token endpoint: derive from issuer
    // e.g. https://auth.example.com/application/o/my-app/ → https://auth.example.com/application/o/token/
    const tokenEndpoint =
      new URL(process.env.AUTHENTIK_ISSUER!).origin + "/application/o/token/";

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTHENTIK_CLIENT_ID!,
        client_secret: process.env.AUTHENTIK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw new Error(refreshed.error_description ?? "Token refresh failed");

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in as number),
      error: undefined,
    };
  } catch (e) {
    console.error("[auth] Token refresh failed:", e);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
    }),
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 60 * 60, // re-issue session cookie every hour
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign-in — store access token, refresh token, and expiry
      if (account) {
        const profileGroups = Array.isArray(
          (profile as { groups?: unknown } | undefined)?.groups
        )
          ? ((profile as { groups: unknown[] }).groups.map(String))
          : undefined;
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          groups: profileGroups ?? token.groups,
        };
      }

      // Token still valid (with 300s buffer) — return as-is
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 300) {
        return token;
      }

      // No refresh token available — can't recover
      if (!token.refreshToken) {
        return { ...token, error: "RefreshAccessTokenError" };
      }

      // Access token expired — silently refresh using the refresh token
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.groups = token.groups;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
