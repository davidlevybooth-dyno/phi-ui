import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type ModelInfo } from "@/lib/models-data";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </div>
  );
}

export function ModelCardTab({ model }: { model: ModelInfo }) {
  const { modelCard } = model;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Overview */}
      <Section title="Overview">
        <p className="text-sm text-muted-foreground leading-relaxed">{modelCard.overview}</p>
      </Section>

      {/* Use cases */}
      <Section title="Use cases">
        <ul className="space-y-1.5">
          {modelCard.useCases.map((uc) => (
            <li key={uc} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 rounded-full bg-foreground/30 shrink-0" />
              {uc}
            </li>
          ))}
        </ul>
      </Section>

      {/* Output metrics */}
      <Section title="Output metrics">
        <div className="flex flex-wrap gap-1.5">
          {model.metrics.map((m) => (
            <Badge key={m} variant="secondary" className="font-mono text-xs font-normal">
              {m}
            </Badge>
          ))}
        </div>
      </Section>

      {/* Performance notes */}
      <Section title="Performance notes">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{modelCard.performanceNotes}</p>
        </Card>
      </Section>

      {/* License + citation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Section title="License">
          <p className="text-sm text-muted-foreground">{model.license}</p>
        </Section>
        <Section title="Citation">
          <p className="text-sm text-muted-foreground font-mono text-xs leading-relaxed">{model.citation}</p>
        </Section>
      </div>

      {/* Third-party note */}
      {modelCard.thirdPartyNote && (
        <Section title="Third-party model">
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-4 py-3">
            <ExternalLink className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{modelCard.thirdPartyNote}</p>
          </div>
        </Section>
      )}
    </div>
  );
}
