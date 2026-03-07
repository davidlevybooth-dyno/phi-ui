import { ThemeToggle } from "@/components/theme-toggle";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          © 2026 Dyno Therapeutics. All rights reserved.
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
