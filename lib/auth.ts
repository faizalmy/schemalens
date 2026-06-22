import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, sessions, accounts, verifications } from "./db/schema";

// Use plural keys matching better-auth internal model names.
// usePlural: true converts them to table names in queries.
const authSchema = {
  users,
  sessions,
  accounts,
  verifications,
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    async sendResetPassword(url) {
      // Stub: better-auth requires this callback. Implement email sending for production.
      // eslint-disable-next-line no-console
      console.log("[sendResetPassword]", url);
    },
  },
});
