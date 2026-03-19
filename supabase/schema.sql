-- Criar tabela de agentes
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar por status
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Index para buscar por tipo
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- Habilitar Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read access" ON agents
  FOR SELECT USING (true);

-- Política para permitir insert público
CREATE POLICY "Allow public insert access" ON agents
  FOR INSERT WITH CHECK (true);

-- Política para permitir update público
CREATE POLICY "Allow public update access" ON agents
  FOR UPDATE USING (true);

-- Política para permitir delete público
CREATE POLICY "Allow public delete access" ON agents
  FOR DELETE USING (true);
