import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
}

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditAgentDialog = ({ agent, open, onOpenChange }: EditAgentDialogProps) => {
  const [name, setName] = useState(agent.name);
  const [type, setType] = useState(agent.type);
  const [description, setDescription] = useState(agent.description || "");
  const [status, setStatus] = useState(agent.status);
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(agent.name);
    setType(agent.type);
    setDescription(agent.description || "");
    setStatus(agent.status);
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("agents")
        .update({
          name,
          type,
          description,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agente atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar agente");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Agente</DialogTitle>
          <DialogDescription>
            Atualize as configurações do agente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Agente</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Tipo</Label>
            <select
              id="edit-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="chatbot">Chatbot</option>
              <option value="automation">Automação</option>
              <option value="analytics">Analytics</option>
              <option value="support">Suporte</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="paused">Pausado</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentDialog;
