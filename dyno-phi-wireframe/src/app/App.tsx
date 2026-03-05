import { useState } from "react";
import { Header } from "./components/header";
import { ApiSection } from "./components/api-section";
import { DocsSection } from "./components/docs-section";
import { ClaudeSkillsSection } from "./components/claude-skills-section";
import { LoginDialog } from "./components/login-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";

export default function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLoginClick={() => setShowLogin(true)} />

      <main className="flex-1 container mx-auto px-6 py-12">
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="mb-8 w-full max-w-md mx-auto grid grid-cols-3">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="skills">
              Claude Skills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="mt-0">
            <ApiSection />
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            <DocsSection />
          </TabsContent>

          <TabsContent value="skills" className="mt-0">
            <ClaudeSkillsSection />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>
            © 2026 Dyno Psi-Phi. Advancing biological design
            grounded by real-world experimental data.
          </p>
        </div>
      </footer>

      <LoginDialog
        open={showLogin}
        onOpenChange={setShowLogin}
      />
    </div>
  );
}