import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Client } = pg;

const supabase = createClient(
  'https://nfglbjodkujvxlidtlze.supabase.co',
  'sb_publishable_rIkds2Tv25TDRSBRgdtYGA_d1KWEgPC'
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { agentId } = req.query;
  
  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }
  
  try {
    // Buscar dados do agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    
    // Verificar configurações
    if (!agent.whatsapp_token || !agent.whatsapp_url) {
      return res.status(400).json({ error: 'WhatsApp não configurado' });
    }
    
    if (!agent.database_config || !agent.database_config.host) {
      return res.status(400).json({ error: 'Banco de dados não configurado' });
    }
    
    // Log: início da execução
    await supabase.from('agent_logs').insert({
      agent_id: agentId,
      action: 'execution_started',
      status: 'running',
      message: 'Iniciando execução do agente',
    });
    
    // Conectar ao banco CRM
    const pgClient = new Client({
      host: agent.database_config.host,
      database: agent.database_config.database,
      user: agent.database_config.user,
      password: agent.database_config.password,
      port: 5432,
    });
    
    await pgClient.connect();
    
    // Buscar leads para prospectar
    const result = await pgClient.query(`
      SELECT l.id, l.nome_empresa, l.telefone, p.nome as prospeccao_nome
      FROM leads l
      JOIN prospeccoes p ON l.prospeccao_id = p.id
      WHERE l.status = 'empresas_encontradas'
      LIMIT 5
    `);
    
    const leads = result.rows;
    
    if (leads.length === 0) {
      await pgClient.end();
      
      await supabase.from('agent_logs').insert({
        agent_id: agentId,
        action: 'execution_completed',
        status: 'success',
        message: 'Nenhum lead encontrado para prospectar',
      });
      
      return res.json({
        success: true,
        message: 'Nenhum lead para prospectar',
        leads_processed: 0,
        messages_sent: 0,
      });
    }
    
    // Log: leads encontrados
    await supabase.from('agent_logs').insert({
      agent_id: agentId,
      action: 'leads_found',
      status: 'success',
      message: `${leads.length} leads encontrados`,
      metadata: { count: leads.length },
    });
    
    // Prospectar cada lead
    let successCount = 0;
    
    for (const lead of leads) {
      try {
        // Gerar mensagem inicial
        const mensagem = `Olá! Meu nome é Igo Santos, tudo bem?\n\nVi ${lead.nome_empresa} no Google e fiquei interessado.\n\nComo vocês conseguem novos clientes hoje?`;
        
        // Enviar via Uazapi
        const uazapiResponse = await fetch(
          `${agent.whatsapp_url}/send-message`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${agent.whatsapp_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: lead.telefone,
              message: mensagem,
            }),
          }
        );
        
        if (!uazapiResponse.ok) {
          throw new Error(`Uazapi error: ${uazapiResponse.status}`);
        }
        
        // Atualizar status do lead
        await pgClient.query(
          `UPDATE leads SET status = 'mensagem_enviada', updated_at = NOW() WHERE id = $1`,
          [lead.id]
        );
        
        // Log: mensagem enviada
        await supabase.from('agent_logs').insert({
          agent_id: agentId,
          action: 'message_sent',
          target: lead.nome_empresa,
          status: 'success',
          message: `Mensagem enviada para ${lead.nome_empresa}`,
          metadata: {
            lead_id: lead.id,
            phone: lead.telefone,
          },
        });
        
        successCount++;
        
        // Aguardar 3-5s entre mensagens
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
      } catch (error) {
        // Log: erro ao enviar
        await supabase.from('agent_logs').insert({
          agent_id: agentId,
          action: 'message_failed',
          target: lead.nome_empresa,
          status: 'error',
          message: `Erro ao enviar: ${error.message}`,
          metadata: { lead_id: lead.id, error: error.message },
        });
      }
    }
    
    await pgClient.end();
    
    // Atualizar contador
    await supabase
      .from('agents')
      .update({
        last_execution: new Date().toISOString(),
        execution_count: (agent.execution_count || 0) + 1,
      })
      .eq('id', agentId);
    
    // Log: conclusão
    await supabase.from('agent_logs').insert({
      agent_id: agentId,
      action: 'execution_completed',
      status: 'success',
      message: `Execução concluída: ${successCount}/${leads.length} mensagens enviadas`,
      metadata: {
        total_leads: leads.length,
        success_count: successCount,
      },
    });
    
    res.json({
      success: true,
      message: 'Execução concluída',
      leads_processed: leads.length,
      messages_sent: successCount,
    });
    
  } catch (error) {
    console.error('Erro na execução:', error);
    
    // Log: erro
    await supabase.from('agent_logs').insert({
      agent_id: agentId,
      action: 'execution_failed',
      status: 'error',
      message: `Erro: ${error.message}`,
    });
    
    res.status(500).json({
      error: 'Erro na execução',
      message: error.message,
    });
  }
}
