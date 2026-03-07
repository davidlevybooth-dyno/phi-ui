import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODELS } from "@/lib/models-data";

export const metadata = {
  title: "Open Source Notices — Dyno Phi",
  description: "Open source and third-party software notices for the design.dynotx.com platform.",
};

const FRAMEWORK_DEPS = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "shadcn/ui", license: "MIT", url: "https://github.com/shadcn-ui/ui" },
  { name: "Framer Motion", license: "MIT", url: "https://github.com/framer/motion" },
  { name: "Clerk", license: "Commercial (Clerk Inc.)", url: "https://clerk.com" },
  { name: "Zod", license: "MIT", url: "https://github.com/colinhacks/zod" },
  { name: "Shiki", license: "MIT", url: "https://github.com/shikijs/shiki" },
  { name: "Lucide React", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
];

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">Open Source Notices</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: 2026-03-07</p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground">

          <p>
            Dyno Therapeutics, Inc. ("Dyno," "we," "us," or "our") operates the
            design.dynotx.com platform. The platform incorporates open-source software and
            machine learning models distributed under various licenses including MIT, Apache
            2.0, and Creative Commons licenses. These components remain subject to their
            original licenses. Dyno provides attribution where required.
          </p>

          {/* Third-party ML models */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Third-Party Machine Learning Models</h2>
            <p className="text-muted-foreground">
              The following models are hosted and served via the Dyno Phi API. Each model is
              the work of its respective authors and is subject to its original license.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Model</th>
                  <th className="py-2 pr-4 font-medium">Citation</th>
                  <th className="py-2 font-medium">License</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((model) => (
                  <tr key={model.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{model.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{model.citation}</td>
                    <td className="py-2.5 text-muted-foreground">{model.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Framework and infrastructure dependencies */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Platform Software</h2>
            <p className="text-muted-foreground">
              The web interface and CLI are built using the following open-source packages.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Package</th>
                  <th className="py-2 font-medium">License</th>
                </tr>
              </thead>
              <tbody>
                {FRAMEWORK_DEPS.map((dep) => (
                  <tr key={dep.name} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {dep.name}
                      </a>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{dep.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              For license-related inquiries, contact{" "}
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
