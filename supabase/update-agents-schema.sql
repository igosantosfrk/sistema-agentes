-- Adicionar campos de configuração individual por agente
ALTER TABLE agents ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS database_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_config JSONB DEFAULT '{
  "auto_start": false,
  "max_leads_per_day": 50,
  "interval_minutes": 30
}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_execution TIMESTAMP WITH TIME ZONE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;

-- Criar tabela de logs por agente
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar logs por agente
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- Desabilitar RLS nas novas tabelas
ALTER TABLE agent_logs DISABLE ROW LEVEL SECURITY;

-- Verificar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agents'
ORDER BY ordinal_position;
