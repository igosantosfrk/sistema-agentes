import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import CreateAgentDialog from "@/components/CreateAgentDialog";
import EditAgentDialog from "@/components/EditAgentDialog";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  created_at: string;
}

const Index = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const queryClient = useQueryClient();

  // Buscar agentes
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Agent[];
    },
  });

  // Deletar agente
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agente deletado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao deletar agente");
    },
  });

  const activeAgents = agents?.filter((a) => a.status === "active").length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold">
                  Sistema de Agentes IA
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  {activeAgents} agentes ativos
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Criar Agente
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Agentes */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Carregando...</p>
              </CardContent>
            </Card>
          ) : agents && agents.length > 0 ? (
            agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{agent.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {agent.type}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditAgent(agent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteMutation.mutate(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {agent.description || "Sem descrição"}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum agente criado ainda.
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4"
                >
                  Criar Primeiro Agente
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editAgent && (
        <EditAgentDialog
          agent={editAgent}
          open={!!editAgent}
          onOpenChange={(open) => !open && setEditAgent(null)}
        />
      )}
    </div>
  );
};

export default Index;
