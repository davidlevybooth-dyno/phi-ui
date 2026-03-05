import { Card } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { BookOpen, Dna, FlaskConical, Microscope } from "lucide-react";

export function DocsSection() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="text-4xl">Documentation</h2>
        <p className="text-muted-foreground">
          Learn about our AI models for biological design and how to use them effectively.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Dna className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3>Protein Structure Prediction</h3>
              <p className="text-sm text-muted-foreground">
                Our AlphaFold-based model predicts protein structures with atomic-level accuracy. 
                Trained on millions of protein sequences and structures from the Protein Data Bank.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3>Enzyme Engineering</h3>
              <p className="text-sm text-muted-foreground">
                Design novel enzymes or optimize existing ones for improved catalytic efficiency. 
                Supports directed evolution and rational design approaches.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Microscope className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3>Gene Circuit Design</h3>
              <p className="text-sm text-muted-foreground">
                Create synthetic gene circuits with predictable behavior. Model transcription, 
                translation, and regulatory interactions in bacterial and mammalian systems.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3>Molecular Dynamics</h3>
              <p className="text-sm text-muted-foreground">
                Simulate molecular interactions and predict binding affinities. 
                GPU-accelerated simulations for drug discovery and protein engineering.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-6">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>What models are available?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              We offer a suite of models including protein structure prediction (based on AlphaFold), 
              enzyme design, gene circuit optimization, and molecular dynamics simulations. Each model 
              is optimized for specific biological design tasks.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>How accurate are the predictions?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Our protein structure prediction model achieves &gt;90% accuracy on benchmark datasets. 
              Enzyme design predictions have been validated experimentally with 70-80% success rates. 
              All models are continuously improved with new training data.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>What are the rate limits?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Free tier: 100 API calls per day. Professional tier: 10,000 calls per day. 
              Enterprise tier: Custom limits. Rate limits reset at midnight UTC.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>Can I use this for commercial purposes?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Yes, our API can be used for commercial research and development. Professional and 
              Enterprise plans include commercial usage rights. Please review our terms of service 
              for specific licensing details.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>How do I cite your models in publications?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Please cite our work as: "BioDesign AI Platform (2026). https://biodesign.ai". 
              Specific model citations are available in our documentation. We appreciate acknowledgment 
              in any publications that use our tools.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
