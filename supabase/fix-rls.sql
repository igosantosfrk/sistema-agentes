-- Desabilitar RLS completamente (acesso público total)
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies antigas
DROP POLICY IF EXISTS "Allow public read access" ON agents;
DROP POLICY IF EXISTS "Allow public insert access" ON agents;
DROP POLICY IF EXISTS "Allow public update access" ON agents;
DROP POLICY IF EXISTS "Allow public delete access" ON agents;
DROP POLICY IF EXISTS "Allow public read" ON agents;
DROP POLICY IF EXISTS "Allow public insert" ON agents;
DROP POLICY IF EXISTS "Allow public update" ON agents;
DROP POLICY IF EXISTS "Allow public delete" ON agents;

-- Verificar se funcionou
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'agents';
