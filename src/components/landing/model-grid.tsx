import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODELS, type ModelInfo } from "@/lib/models-data";

function ModelCard({ model }: { model: ModelInfo }) {
  return (
    <Link key={model.id} href={`/models/${model.id}`}>
      <Card className="p-5 h-full flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-mono font-semibold">
              {model.shortName}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium leading-none">{model.name}</p>
                <Badge
                  variant={model.tier === "exclusive" ? "default" : "outline"}
                  className="text-[10px] font-normal px-1.5 py-0 shrink-0"
                >
                  {model.tier === "exclusive" ? "Exclusive" : "Community"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{model.license}</p>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground/50 shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed flex-1">
          {model.tagline}
        </p>

        <div className="flex flex-wrap gap-1">
          {model.metrics.slice(0, 3).map((m) => (
            <Badge key={m} variant="secondary" className="text-xs font-normal px-1.5 py-0.5">
              {m}
            </Badge>
          ))}
          {model.metrics.length > 3 && (
            <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5">
              +{model.metrics.length - 3}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function ModelGrid() {
  const visible = MODELS.filter((m) => !m.hidden);
  const community = visible.filter((m) => m.tier === "community");
  const exclusive = visible.filter((m) => m.tier === "exclusive");

  return (
    <div className="space-y-10">
      <section>
        <hr className="border-muted-foreground/20 mb-4" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Community models
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {community.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </section>
    </div>
  );
}
