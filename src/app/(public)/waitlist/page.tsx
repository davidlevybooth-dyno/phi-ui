"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Waitlist } from "@clerk/nextjs";
import { DynoLogo } from "@/components/shared/dyno-logo";

/**
 * Waitlist page — shown to prospective users during the pre-launch period.
 * Clerk's <Waitlist /> handles form submission and confirmation state.
 * Once approved via the Clerk Dashboard, users receive an email with access instructions.
 */
export default function WaitlistPage() {
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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
        className="flex flex-col items-center gap-3"
      >
        <Waitlist />
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          We&apos;re preparing for launch. Join the waitlist and we&apos;ll reach out when your spot is ready.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Already have access?{" "}
          <Link href="/login" className="underline underline-offset-2 text-foreground hover:text-foreground/70">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
