import NextAuth, { type NextAuthOptions } from "next-auth"
import AuthentikProvider from "next-auth/providers/authentik"
import CredentialsProvider from "next-auth/providers/credentials"
import type { JWT } from "next-auth/jwt"

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`.
 */
async function refreshAccessToken(token: JWT) {
  try {
    const issuer = process.env.AUTHENTIK_ISSUER!.replace(/\/$/, '')
    // Dynamically fetch the official token endpoint from Authentik's OIDC discovery so we never hit a 404/405
    const oidcConfig = await fetch(`${issuer}/.well-known/openid-configuration`).then(r => r.json())
    const url = oidcConfig.token_endpoint
    const response = await fetch(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.AUTHENTIK_CLIENT_ID!,
        client_secret: process.env.AUTHENTIK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    })

    const responseText = await response.text()
    if (!response.ok) {
      throw new Error(`Authentik token error: ${response.status} - ${responseText}`)
    }
    const refreshedTokens = JSON.parse(responseText)

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error("Error refreshing access token", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

const devProvider =
  process.env.NODE_ENV === "development"
    ? [
        CredentialsProvider({
          id: "dev-bypass",
          name: "Dev Login",
          credentials: {
            name: { label: "Name", type: "text", placeholder: "Your name" },
          },
          async authorize(credentials) {
            // Any submission is accepted in dev — no password needed
            return {
              id: "dev-user",
              name: credentials?.name || "Dev User",
              email: "dev@localhost",
              image: null,
            }
          },
        }),
      ]
    : []

const authOptions: NextAuthOptions = {
  providers: [
    ...devProvider,
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
      authorization: {
        params: {
          scope: "openid email profile offline_access",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // Fallback robustly: sometimes OIDC returns expires_in instead of expires_at
        const expiresAt = account.expires_at 
          ? account.expires_at * 1000 
          : account.expires_in 
            ? Date.now() + (account.expires_in as number) * 1000
            : Date.now() + 60 * 60 * 1000 // Safely default to 1 hour if unspecified

        console.log("INITIAL SIGN IN - account payload:", JSON.stringify(account))
        console.log("Computed expiresAt (ms):", expiresAt, "vs Current Date.now():", Date.now())

        return {
          accessToken: account.access_token,
          accessTokenExpires: expiresAt,
          refreshToken: account.refresh_token,
          user,
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      return {
        ...session,
        user: token.user as typeof session.user,
        accessToken: token.accessToken as string | undefined,
        error: token.error,
      }
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
