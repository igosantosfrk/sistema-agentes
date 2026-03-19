import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Sistema de Agentes IA
          </CardTitle>
          <CardDescription className="text-center text-lg">
            Plataforma de automação inteligente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="default" size="lg" className="w-full">
              Criar Novo Agente
            </Button>
            <Button variant="outline" size="lg" className="w-full">
              Ver Agentes Ativos
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Powered by AI • Supabase • Vercel
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
