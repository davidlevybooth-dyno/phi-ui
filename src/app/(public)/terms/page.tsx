import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service — Dyno Phi",
  description: "Terms of Service for the design.dynotx.com platform operated by Dyno Therapeutics, Inc.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: 2026-03-07</p>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground">

          <p>
            These Terms of Service govern access to and use of the design.dynotx.com platform
            operated by Dyno Therapeutics, Inc. ("Dyno," "we," "us," or "our").
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">1. Description of Service</h2>
            <p>
              The platform provides computational tools, APIs, and AI-assisted workflows for
              protein design, scoring, filtering, and analysis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">2. User Accounts</h2>
            <p>
              Users must create an account and are responsible for safeguarding credentials
              and API keys.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">3. User Content</h2>
            <p>
              Users may upload biological sequences, molecular structures, or related research
              data. Users retain ownership of such content. Dyno receives a limited license to
              process the content in order to operate the platform. Dyno retains all rights in
              the platform, software, models, and related technology.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">4. Outputs</h2>
            <p>
              The platform generates computational predictions and analytical outputs. Unless
              otherwise specified, users own results generated from their inputs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">5. Research Use Only</h2>
            <p>
              The platform is intended for research use only. Outputs are computational
              predictions and require experimental validation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">6. Acceptable Use</h2>
            <p>
              Users may not use the platform for illegal biological research, development of
              biological weapons, or activities that violate biosafety or biosecurity
              regulations. See the{" "}
              <Link href="/acceptable-use" className="underline underline-offset-2">
                Acceptable Use Policy
              </Link>{" "}
              for the full list of prohibited activities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">7. Disclaimer</h2>
            <p>
              The service is provided "as is" without warranties regarding accuracy or fitness
              for any purpose.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">8. Limitation of Liability</h2>
            <p>
              Dyno shall not be liable for indirect damages or scientific outcomes resulting
              from use of the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, without regard to
              conflict of law principles.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
