import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Acceptable Use Policy — Dyno Phi",
  description: "Acceptable Use Policy for the design.dynotx.com platform operated by Dyno Therapeutics, Inc.",
};

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Acceptable Use Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: 2026-03-07</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">

          <p>
            This Acceptable Use Policy governs use of the design.dynotx.com platform operated
            by Dyno Therapeutics, Inc. ("Dyno," "we," "us," or "our").
          </p>

          <p>
            By using the platform, users agree not to engage in activities that violate
            applicable laws, biosafety standards, or these policies.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Prohibited Uses</h2>
            <p>Users may not use the platform to:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-muted-foreground">
              <li>Develop biological weapons</li>
              <li>Design pathogens or toxins for harmful purposes</li>
              <li>Violate biosafety regulations</li>
              <li>Attempt to reverse engineer proprietary systems</li>
              <li>Disrupt platform operations</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Enforcement</h2>
            <p>
              Dyno may suspend or terminate access to the platform if a user violates this
              Acceptable Use Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Related Policies</h2>
            <p>
              This policy should be read together with the{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms of Service
              </Link>
              . For questions, contact{" "}
              <a href="mailto:legal@dynotx.com" className="underline underline-offset-2">
                legal@dynotx.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
