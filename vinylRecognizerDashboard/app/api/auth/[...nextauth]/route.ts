import NextAuth, { type NextAuthOptions } from "next-auth"
import AuthentikProvider from "next-auth/providers/authentik"

export const authOptions: NextAuthOptions = {
  providers: [
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Forward the OIDC access token to our token object
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Expose the raw access token so the frontend can send it to our API
      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
      }
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
