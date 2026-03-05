import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, Check, RefreshCw } from "lucide-react";

export function ApiSection() {
  const [apiToken, setApiToken] = useState("");
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    // Generate a mock API token
    const token = `biodesign_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiToken(token);
  };

  const copyToken = async () => {
    if (apiToken) {
      await navigator.clipboard.writeText(apiToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="text-4xl">API Access</h2>
        <p className="text-muted-foreground">
          Generate your API token to access our biological design models.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-token">Your API Token</Label>
            <div className="flex gap-2">
              <Input
                id="api-token"
                value={apiToken}
                readOnly
                placeholder="Click 'Generate Token' to create your API key"
                className="font-mono text-sm"
              />
              <Button
                onClick={copyToken}
                variant="outline"
                size="icon"
                disabled={!apiToken}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Button onClick={generateToken} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Generate Token
          </Button>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4">Quick Start</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">Set your API token as an environment variable:</p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">export BIODESIGN_API_KEY="your_token_here"</code>
              </pre>
            </div>

            <div>
              <p className="text-sm mb-2">Example API call:</p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{`curl -X POST https://api.biodesign.ai/v1/design \\
  -H "Authorization: Bearer $BIODESIGN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "protein-fold-v1",
    "sequence": "MKTAYIAKQRQISFVKSHFSRQ"
  }'`}</code>
              </pre>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="mb-2">Protein Folding</h3>
          <p className="text-sm text-muted-foreground">
            Predict 3D structure from amino acid sequences
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="mb-2">Enzyme Design</h3>
          <p className="text-sm text-muted-foreground">
            Generate custom enzymes for specific reactions
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="mb-2">DNA Synthesis</h3>
          <p className="text-sm text-muted-foreground">
            Optimize genetic sequences for expression
          </p>
        </Card>
      </div>
    </div>
  );
}
