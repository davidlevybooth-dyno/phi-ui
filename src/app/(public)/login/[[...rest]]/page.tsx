"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignIn } from "@clerk/nextjs";
import { Checkbox } from "@/components/ui/checkbox";
import { DynoLogo } from "@/components/shared/dyno-logo";

/**
 * Login page — Clerk's <SignIn /> handles Google OAuth, email/password,
 * MFA, and the "create account" flow.
 *
 * forceRedirectUrl overrides any Clerk redirect_url param so users always
 * land on /dashboard. This matches NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
 * but is set here explicitly as a belt-and-suspenders guard.
 *
 * A clickwrap checkbox is required before the Clerk widget renders so that
 * acceptance of the Terms of Service and Privacy Policy is affirmatively
 * captured before account creation.
 */
export default function LoginPage() {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-8 px-4">
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

      <AnimatePresence mode="wait">
        {!accepted ? (
          <motion.div
            key="clickwrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 w-full max-w-sm"
          >
            <div className="w-full border rounded-xl bg-card px-5 py-5 space-y-4">
              <p className="text-sm font-medium text-center">Before you continue</p>
              <div className="flex items-start gap-3 text-sm">
                <Checkbox
                  id="terms"
                  onCheckedChange={(v: boolean | "indeterminate") => setAccepted(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="terms"
                  className="text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="underline underline-offset-2 text-foreground">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Check the box above to sign in or create an account.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <SignIn forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
