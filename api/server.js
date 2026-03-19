const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  'https://nfglbjodkujvxlidtlze.supabase.co',
  'sb_publishable_rIkds2Tv25TDRSBRgdtYGA_d1KWEgPC'
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Executar agente
app.post('/api/execute/:agentId', async (req, res) => {
  const { agentId } = req.params;
  
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
    
    // Buscar leads para prospectar (status = empresas_encontradas)
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
        // Gerar mensagem inicial usando o prompt do agente
        const mensagem = gerarMensagemInicial(agent.description, lead.nome_empresa);
        
        // Enviar via Uazapi
        const uazapiResponse = await axios.post(
          `${agent.whatsapp_url}/send-message`,
          {
            phone: lead.telefone,
            message: mensagem,
          },
          {
            headers: {
              'Authorization': `Bearer ${agent.whatsapp_token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        // Atualizar status do lead no CRM
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
        
        // Aguardar 3-5 segundos entre mensagens
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
      } catch (error) {
        // Log: erro ao enviar mensagem
        await supabase.from('agent_logs').insert({
          agent_id: agentId,
          action: 'message_failed',
          target: lead.nome_empresa,
          status: 'error',
          message: `Erro ao enviar mensagem: ${error.message}`,
          metadata: { lead_id: lead.id, error: error.message },
        });
      }
    }
    
    await pgClient.end();
    
    // Atualizar contador do agente
    await supabase
      .from('agents')
      .update({
        last_execution: new Date().toISOString(),
        execution_count: (agent.execution_count || 0) + 1,
      })
      .eq('id', agentId);
    
    // Log: execução concluída
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
    
    // Log: erro na execução
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
});

// Função para gerar mensagem inicial
function gerarMensagemInicial(prompt, nomeEmpresa) {
  // Mensagem padrão seguindo SPIN Selling
  return `Olá! Meu nome é Igo Santos, tudo bem?

Vi ${nomeEmpresa} no Google e fiquei interessado.

Como vocês conseguem novos clientes hoje?`;
}

const PORT = 3100;
app.listen(PORT, () => {
  console.log(`✅ API de agentes rodando na porta ${PORT}`);
});
