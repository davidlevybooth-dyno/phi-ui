"use client";

import { motion } from "framer-motion";
import { SignIn } from "@clerk/nextjs";
import { DynoLogo } from "@/components/shared/dyno-logo";

/**
 * Login page — Clerk's <SignIn /> handles Google OAuth, email/password,
 * MFA, and the "create account" flow.
 *
 * forceRedirectUrl overrides any Clerk redirect_url param so users always
 * land on /dashboard. This matches NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
 * but is set here explicitly as a belt-and-suspenders guard.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col items-center gap-3"
      >
        <DynoLogo className="size-10" />
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Dyno Phi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Protein Design Platform
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.18 }}
      >
        <SignIn forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" />
      </motion.div>
    </div>
  );
}
