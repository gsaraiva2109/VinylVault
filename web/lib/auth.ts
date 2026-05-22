import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

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

async function getTokenEndpoint(issuer: string): Promise<string> {
  try {
    const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const res = await fetch(discoveryUrl);
    if (res.ok) {
      const config = await res.json();
      return config.token_endpoint;
    }
  } catch { /* discovery failed, fall back to constructing URL */ }

  // Fallback: construct token endpoint from issuer (Authentik pattern)
  return new URL(issuer).origin + "/application/o/token/";
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const tokenEndpoint = await getTokenEndpoint(process.env.OIDC_ISSUER!);

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
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
    {
      id: "oidc",
      name: "OIDC",
      type: "oauth",
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      wellKnown: `${process.env.OIDC_ISSUER!}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      checks: ["pkce", "state"],
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
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
