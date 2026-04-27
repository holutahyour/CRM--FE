import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

/**
 * Attempts to refresh the Azure AD access token using a refresh token.
 * Returns the updated token on success, or a token with `error` set on failure.
 */
async function refreshAccessToken(token: any) {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      scope: `openid profile email offline_access ${process.env.AZURE_SCOPE}`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Token refresh failed:", refreshedTokens);
      throw refreshedTokens;
    }

    console.log("Access token refreshed successfully.");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      // expires_in is in seconds — convert to an absolute timestamp (ms)
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Use the new refresh token if provided, otherwise keep the old one
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: `openid profile email offline_access ${process.env.AZURE_SCOPE}`,
        },
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens and expiry from Azure AD
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          // expires_at is a Unix timestamp in seconds
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
        };
      }

      // Token is still valid — return it as-is
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token has expired — attempt a refresh
      console.log("Access token expired, refreshing...");
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        (session as any).accessToken = token.accessToken;
        (session.user as any).id = token.sub;
        (session.user as any).roles = (token as any).roles || [];
      }
      // Expose the error to the client so it can trigger a re-login
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
