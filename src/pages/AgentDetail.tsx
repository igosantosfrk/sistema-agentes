import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Play, Pause, History } from "lucide-react";
import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  whatsapp_token: string;
  whatsapp_url: string;
  database_config: any;
  execution_config: any;
  last_execution: string;
  execution_count: number;
}

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [dbHost, setDbHost] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");

  // Buscar agente
  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Preencher campos
      const agentData = data as Agent;
      setWhatsappToken(agentData.whatsapp_token || "");
      setWhatsappUrl(agentData.whatsapp_url || "");
      
      const dbConfig = agentData.database_config || {};
      setDbHost(dbConfig.host || "");
      setDbName(dbConfig.database || "");
      setDbUser(dbConfig.user || "");
      setDbPassword(dbConfig.password || "");
      
      return agentData;
    },
  });

  // Buscar logs do agente
  const { data: logs } = useQuery({
    queryKey: ["agent-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("agent_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Salvar configurações
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("agents")
        .update({
          whatsapp_token: whatsappToken,
          whatsapp_url: whatsappUrl,
          database_config: {
            host: dbHost,
            database: dbName,
            user: dbUser,
            password: dbPassword,
          },
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", id] });
      toast.success("Configurações salvas!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    },
  });

  // Executar agente
  const executeMutation = useMutation({
    mutationFn: async () => {
      toast.info("Executando agente...");
      
      // Chamar API via proxy Nginx
      const response = await fetch(`http://89.116.225.95:8081/api/execute/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro na execução');
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent", id] });
      queryClient.invalidateQueries({ queryKey: ["agent-logs", id] });
      
      if (data.messages_sent === 0) {
        toast.info(data.message || 'Nenhum lead para prospectar');
      } else {
        toast.success(`${data.messages_sent} mensagens enviadas para ${data.leads_processed} leads!`);
      }
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <p>Agente não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <div>
                  <CardTitle className="text-2xl">{agent.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {agent.type} • {agent.execution_count} execuções
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => executeMutation.mutate()}
                  disabled={executeMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Executar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configurações WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp (Uazapi)</CardTitle>
              <CardDescription>Credenciais de acesso ao WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-url">URL Uazapi</Label>
                <Input
                  id="whatsapp-url"
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  placeholder="https://seudominio.uazapi.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">Token</Label>
                <Input
                  id="whatsapp-token"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  placeholder="seu-token-uazapi"
                  type="password"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configurações Banco de Dados */}
          <Card>
            <CardHeader>
              <CardTitle>Banco de Dados (CRM)</CardTitle>
              <CardDescription>Conexão com base de leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-host">Host</Label>
                  <Input
                    id="db-host"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">Database</Label>
                  <Input
                    id="db-name"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="crm_prospeccao"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-user">Usuário</Label>
                  <Input
                    id="db-user"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    placeholder="postgres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-password">Senha</Label>
                  <Input
                    id="db-password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão Salvar */}
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Histórico de Ações</CardTitle>
            </div>
            <CardDescription>Últimas 50 ações do agente</CardDescription>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        log.status === "success"
                          ? "bg-green-500"
                          : log.status === "running"
                          ? "bg-blue-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum log registrado ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDetail;
