import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy — Dyno Phi",
  description: "Privacy Policy for the design.dynotx.com platform operated by Dyno Therapeutics, Inc.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: 2026-03-07</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">

          <p>
            Dyno Therapeutics, Inc. ("Dyno," "we," "us," or "our") operates the
            design.dynotx.com platform (the "Service"). This Privacy Policy describes how we
            collect, use, and protect information when users access or use the Service.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">1. Information Collected</h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc list-outside ml-5 space-y-1 text-muted-foreground">
              <li>Account information such as name and email address</li>
              <li>API usage logs and job metadata</li>
              <li>Uploaded biological sequences and structures</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">2. How Information Is Used</h2>
            <p>Information is used for the following purposes:</p>
            <ul className="list-disc list-outside ml-5 space-y-1 text-muted-foreground">
              <li>Operating the platform</li>
              <li>Running computational jobs</li>
              <li>Improving system performance</li>
              <li>Maintaining security</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">3. Service Providers</h2>
            <p>
              Information may be processed by Dyno's service providers that support operation
              of the platform, including cloud infrastructure providers and authentication
              services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">4. Data Security</h2>
            <p>
              Dyno implements safeguards such as encrypted communications, authenticated API
              access, and secure storage systems.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">5. User Rights</h2>
            <p>
              Users may request access or deletion of personal data by contacting Dyno at{" "}
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
