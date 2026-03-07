import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODELS } from "@/lib/models-data";
import { ModelPlayground } from "@/components/model-page/model-playground";
import { ModelCardTab } from "@/components/model-page/model-card-tab";
import { ModelSchema } from "@/components/model-page/model-schema";
import { ModelCliTab } from "@/components/model-page/model-cli-tab";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return MODELS.map((m) => ({ slug: m.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const model = MODELS.find((m) => m.id === slug);
  if (!model) return {};
  return {
    title: `${model.name} — Dyno Phi`,
    description: model.description,
  };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = MODELS.find((m) => m.id === slug);
  if (!model) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/">
                <ArrowLeft className="mr-1 size-3.5" />
                Models
              </Link>
            </Button>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">{model.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">{model.license}</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Model hero */}
        <div className="mb-8 pb-8 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-mono font-semibold">
                  {model.shortName}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{model.name}</h1>
                  <p className="text-sm text-muted-foreground">{model.citation}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {model.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {model.metrics.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs font-normal font-mono">
                {m}
              </Badge>
            ))}
          </div>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="experience">
          <div className="flex justify-center mb-10">
            <TabsList className="h-9 p-1 gap-0.5">
              <TabsTrigger value="experience" className="px-5">Experience</TabsTrigger>
              <TabsTrigger value="modelcard" className="px-5">Model Card</TabsTrigger>
              <TabsTrigger value="schema" className="px-5">Schema</TabsTrigger>
              <TabsTrigger value="cli" className="px-5">CLI &amp; Skills</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="experience" className="mt-0">
            <ModelPlayground model={model} />
          </TabsContent>

          <TabsContent value="modelcard" className="mt-0">
            <ModelCardTab model={model} />
          </TabsContent>

          <TabsContent value="schema" className="mt-0">
            <ModelSchema model={model} />
          </TabsContent>

          <TabsContent value="cli" className="mt-0">
            <ModelCliTab model={model} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
