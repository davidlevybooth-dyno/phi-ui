import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          © 2026 Dyno Therapeutics. All rights reserved.
        </p>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
          <Link href="/open-source" className="hover:text-foreground transition-colors">Open Source</Link>
        </nav>
        <ThemeToggle />
      </div>
    </footer>
  );
}
