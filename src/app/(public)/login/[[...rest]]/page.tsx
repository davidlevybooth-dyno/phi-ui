"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignIn } from "@clerk/nextjs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynoLogo } from "@/components/shared/dyno-logo";
import { TOS_KEY, CONTACT_OPT_IN_KEY } from "@/lib/auth/constants";

/**
 * Login page — Clerk's <SignIn /> handles Google OAuth, email/password,
 * MFA, and the "create account" flow.
 *
 * forceRedirectUrl overrides any Clerk redirect_url param so users always
 * land on /dashboard. This matches NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
 * but is set here explicitly as a belt-and-suspenders guard.
 *
 * A clickwrap ToS checkbox is required before the Clerk widget renders.
 * A separate optional checkbox captures user consent to be contacted
 * about their use case. Both preferences are persisted in localStorage;
 * the contact opt-in is synced to Clerk privateMetadata by AuthProvider
 * on first sign-in.
 */

export default function LoginPage() {
  const [tosChecked, setTosChecked] = useState(false);
  const [contactOptIn, setContactOptIn] = useState(false);
  const [proceeded, setProceeded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TOS_KEY) === "true";
  });

  function handleTosChange(v: boolean | "indeterminate") {
    setTosChecked(v === true);
  }

  function handleContactOptIn(v: boolean | "indeterminate") {
    setContactOptIn(v === true);
  }

  function handleContinue() {
    localStorage.setItem(TOS_KEY, "true");
    if (contactOptIn) localStorage.setItem(CONTACT_OPT_IN_KEY, "true");
    else localStorage.removeItem(CONTACT_OPT_IN_KEY);
    setProceeded(true);
  }

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
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-xl font-semibold tracking-tight">Dyno Phi</h1>
            <Badge variant="secondary" className="text-xs font-normal">Early Access</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Protein Design Platform
          </p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!proceeded ? (
          <motion.div
            key="clickwrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 w-full max-w-sm"
          >
            <div className="w-full border rounded-xl bg-card px-5 py-5 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-center">Before you continue</p>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Dyno Phi is in early access. Features and APIs may change.
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="terms"
                    checked={tosChecked}
                    onCheckedChange={handleTosChange}
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
                    . <span className="text-foreground/70">(Required)</span>
                  </label>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="contact-optin"
                    checked={contactOptIn}
                    onCheckedChange={handleContactOptIn}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor="contact-optin"
                    className="text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    Dyno may contact me to learn more about my use case and how to
                    improve the platform. <span className="text-foreground/70">(Optional)</span>
                  </label>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!tosChecked}
                onClick={handleContinue}
              >
                Continue
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Accept the Terms of Service above to sign in or create an account.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <SignIn
              forceRedirectUrl="/dashboard"
              signUpForceRedirectUrl="/dashboard"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
