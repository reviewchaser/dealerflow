import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import config from "@/config";
import connectMongo from "@/libs/mongoose";

export const authOptions = {
  // Set any random key in .env.local
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // Credentials provider for email/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Login failed: missing email or password");
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();

        try {
          // Connect to MongoDB using shared connection util
          await connectMongo();

          // Import User model dynamically to avoid circular deps
          const User = (await import("@/models/User")).default;

          // Find user with password hash
          const user = await User.findByEmailWithPassword(normalizedEmail);

          if (!user) {
            console.log(`[Auth] Login failed: user not found for email ${normalizedEmail}`);
            // Dev login: create user with test password (only when ENABLE_DEV_LOGIN=true)
            const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";
            if (devLoginEnabled && credentials.password === "test123") {
              console.log(`[Auth] Dev login: creating new user for ${normalizedEmail}`);
              const newUser = await User.create({
                email: normalizedEmail,
                name: normalizedEmail.split("@")[0],
                fullName: normalizedEmail.split("@")[0],
              });
              return {
                id: newUser._id.toString(),
                email: newUser.email,
                name: newUser.name,
              };
            }
            return null;
          }

          // Check if user is disabled
          if (user.status === "DISABLED") {
            console.log(`[Auth] Login failed: user ${normalizedEmail} is disabled`);
            return null;
          }

          // If user has password hash, verify it
          if (user.passwordHash) {
            const isValid = await user.comparePassword(credentials.password);
            if (!isValid) {
              console.log(`[Auth] Login failed: bcrypt mismatch for ${normalizedEmail}`);
              return null;
            }
          } else {
            console.log(`[Auth] Login failed: passwordHash missing for ${normalizedEmail}`);
            // User exists but no password - allow dev login with test123
            const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";
            if (devLoginEnabled && credentials.password === "test123") {
              console.log(`[Auth] Dev login: allowing access without password for ${normalizedEmail}`);
              // Dev login fallback - user exists without password
            } else {
              // No password set means can't login with credentials
              return null;
            }
          }

          console.log(`[Auth] Login success for ${normalizedEmail}`);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.fullName || user.name,
          };
        } catch (error) {
          console.error("[CredentialsProvider] Error:", error.message, error.stack);
          return null;
        }
      },
    }),
    // GoogleProvider - only enable if credentials are configured
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        async profile(profile) {
          return {
            id: profile.sub,
            name: profile.given_name ? profile.given_name : profile.name,
            email: profile.email,
            image: profile.picture,
            createdAt: new Date(),
          };
        },
      }),
    ] : []),
  ],
  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      // Handle post-login redirects to tenant-aware URLs
      // If redirecting to /dashboard, check if we should use tenant URL
      if (url === `${baseUrl}/dashboard` || url === "/dashboard") {
        try {
          // We can't access token here, so we'll let the dashboard handle the redirect
          // The dashboard will check dealer context and redirect if needed
          return `${baseUrl}/dashboard`;
        } catch (error) {
          console.error("[Redirect Callback] Error:", error);
        }
      }
      // If redirecting to /admin, allow it
      if (url === `${baseUrl}/admin` || url === "/admin" || url.startsWith("/admin")) {
        return `${baseUrl}/admin`;
      }
      // Allow relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allow same-origin URLs
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to base URL
      return baseUrl;
    },
    jwt: async ({ token, user, account }) => {
      // On sign in, add user info to token
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Fetch dealer context on every JWT refresh
      if (token.sub) {
        try {
          await connectMongo();
          const DealerMembership = (await import("@/models/DealerMembership")).default;
          const Dealer = (await import("@/models/Dealer")).default;
          const User = (await import("@/models/User")).default;

          // Get user's platform role
          const userDoc = await User.findById(token.sub);
          token.platformRole = userDoc?.role || "USER";

          // SUPER_ADMIN users don't need dealer context
          if (userDoc?.role === "SUPER_ADMIN") {
            token.dealerId = null;
            token.role = null;
            token.dealerSlug = null;
            return token;
          }

          // Get user's default dealer or first active membership
          let membership = null;

          if (userDoc?.defaultDealerId) {
            membership = await DealerMembership.findOneActive({
              userId: token.sub,
              dealerId: userDoc.defaultDealerId,
            });
          }

          if (!membership) {
            // Fall back to first active membership
            membership = await DealerMembership.findOneActive({
              userId: token.sub,
            }).sort({ lastActiveAt: -1 });
          }

          if (membership) {
            token.dealerId = membership.dealerId.toString();
            token.role = membership.role;

            // Also fetch dealer slug for middleware redirects
            const dealer = await Dealer.findById(membership.dealerId).select("slug").lean();
            token.dealerSlug = dealer?.slug || null;
          } else {
            token.dealerId = null;
            token.role = null;
            token.dealerSlug = null;
          }
        } catch (error) {
          console.error("[JWT Callback] Error fetching dealer context:", error);
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.dealerId = token.dealerId || null;
        session.user.role = token.role || null;
        session.user.platformRole = token.platformRole || "USER";
        session.user.dealerSlug = token.dealerSlug || null;
      }
      return session;
    },
    signIn: async ({ user, account, profile }) => {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user?.email) {
        try {
          await connectMongo();
          const User = (await import("@/models/User")).default;

          // Find or create user
          let dbUser = await User.findOne({ email: user.email.toLowerCase() });
          if (!dbUser) {
            dbUser = await User.create({
              email: user.email.toLowerCase(),
              name: user.name,
              fullName: user.name,
              image: user.image,
            });
          }

          // Update user ID to match our DB
          user.id = dbUser._id.toString();
        } catch (error) {
          console.error("[SignIn Callback] Error:", error);
        }
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  theme: {
    brandColor: config.colors.main,
    logo: `https://${config.domainName}/logoAndName.png`,
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding/create-dealer", // Redirect new users to create dealer
  },
};
