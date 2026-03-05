import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Download, Code, Terminal, Zap } from "lucide-react";

const skills = [
  {
    name: "Protein Structure Analysis",
    description: "Analyze and predict protein structures using our API directly from Claude Code.",
    icon: Code,
    filename: "protein-structure.json",
  },
  {
    name: "Enzyme Design Assistant",
    description: "Design and optimize enzymes for specific catalytic reactions.",
    icon: Zap,
    filename: "enzyme-design.json",
  },
  {
    name: "Gene Circuit Builder",
    description: "Create and simulate synthetic gene circuits with regulatory elements.",
    icon: Terminal,
    filename: "gene-circuit.json",
  },
];

export function ClaudeSkillsSection() {
  const downloadSkill = (filename: string) => {
    // Create a mock skill file
    const skillData = {
      name: filename.replace(".json", ""),
      description: "BioDesign AI Claude Code Skill",
      version: "1.0.0",
      api_endpoint: "https://api.biodesign.ai/v1",
      authentication: {
        type: "bearer",
        token_env: "BIODESIGN_API_KEY",
      },
      capabilities: [
        "Biological sequence analysis",
        "Structure prediction",
        "Optimization suggestions",
      ],
    };

    const blob = new Blob([JSON.stringify(skillData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="text-4xl">Claude Skills</h2>
        <p className="text-muted-foreground">
          Download Claude Code skills to access our API directly from your local development environment.
        </p>
      </div>

      <Card className="p-6 space-y-4 bg-muted/30">
        <h3>Getting Started</h3>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>Generate an API token from the API Access tab</li>
          <li>Set the token as an environment variable: <code className="bg-background px-2 py-1 rounded">BIODESIGN_API_KEY</code></li>
          <li>Download the Claude skill(s) you want to use</li>
          <li>Import the skill into Claude Code on your local machine</li>
          <li>Start using biological design AI in your workflow!</li>
        </ol>
      </Card>

      <div className="space-y-4">
        {skills.map((skill) => {
          const Icon = skill.icon;
          return (
            <Card key={skill.name} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3>{skill.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {skill.description}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => downloadSkill(skill.filename)}
                  className="gap-2 flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 space-y-4">
        <h3>Example Usage</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">After importing the skill, you can use it in Claude Code like this:</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className="text-sm">{`# In your Claude Code conversation:
"Analyze this protein sequence and predict its structure:
MKTAYIAKQRQISFVKSHFSRQLANLRLLTHVSEEDLKRQT"

# Claude Code will automatically use the BioDesign API
# to analyze the sequence and provide insights`}</code>
            </pre>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm mb-2">The skill will handle:</p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Automatic API authentication using your environment variable</li>
              <li>Input validation and formatting</li>
              <li>Response parsing and presentation</li>
              <li>Error handling and retry logic</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
