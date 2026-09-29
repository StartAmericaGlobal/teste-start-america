/**
 * /api/lead — recebe os leads dos formulários do site (contato, seja-parceiro,
 * e-mail da calculadora) e cria o contato + oportunidade no PipeRun.
 *
 * Configurar na Vercel (Project Settings → Environment Variables):
 *   PIPERUN_API_TOKEN  — token da API (PipeRun → Configurações → Integrações → API)
 *   PIPERUN_FUNNEL_ID  — id do funil onde as oportunidades devem cair
 *   PIPERUN_STAGE_ID   — id da etapa inicial desse funil (ex.: "Novo lead")
 *   PIPERUN_OWNER_ID   — (opcional) id do usuário responsável padrão
 *
 * Os paths /persons e /deals e os nomes de campo seguem a convenção REST descrita
 * em developers.pipe.run; confirme os nomes exatos de campo (principalmente campos
 * customizados) no Postman/"Try it" da documentação já autenticado com o token real
 * antes de ir para produção — bloqueios de robô no fetch impediram checar 100% os
 * exemplos de payload ao escrever este arquivo.
 */

const PIPERUN_BASE_URL = 'https://api.pipe.run/v1';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.PIPERUN_API_TOKEN;
  if (!token) {
    console.error('PIPERUN_API_TOKEN não configurado na Vercel.');
    return res.status(500).json({ ok: false, error: 'Integração não configurada' });
  }

  const body = req.body || {};
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim();
  const telefone = String(body.telefone || '').trim();
  const empresa = String(body.empresa || '').trim();
  const mensagem = String(body.mensagem || '').trim();
  const origem = String(body.origem || 'site').trim(); // "contato" | "parceiro" | "indicacao" | "calculadora"

  if (!nome || !email) {
    return res.status(400).json({ ok: false, error: 'Nome e e-mail são obrigatórios' });
  }

  try {
    // 1) Cria a pessoa (contato) no PipeRun
    const personRes = await fetch(PIPERUN_BASE_URL + '/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: token },
      body: JSON.stringify({
        name: nome,
        email: [{ email: email, type: 'work' }],
        phone: telefone ? [{ phone: telefone, type: 'mobile' }] : undefined,
        company_name: empresa || undefined
      })
    });
    const personData = await personRes.json().catch(function () { return {}; });
    if (!personRes.ok) {
      console.error('Erro ao criar pessoa no PipeRun', personRes.status, personData);
      return res.status(502).json({ ok: false, error: 'Falha ao registrar contato' });
    }
    const personId = personData && personData.data && personData.data.id;

    // 2) Cria a oportunidade vinculada a essa pessoa
    const dealRes = await fetch(PIPERUN_BASE_URL + '/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: token },
      body: JSON.stringify({
        title: (nome + ' — ' + origem).slice(0, 120),
        person_id: personId,
        funnel_id: Number(process.env.PIPERUN_FUNNEL_ID),
        stage_id: Number(process.env.PIPERUN_STAGE_ID),
        owner_id: process.env.PIPERUN_OWNER_ID ? Number(process.env.PIPERUN_OWNER_ID) : undefined,
        note: mensagem || undefined
      })
    });
    const dealData = await dealRes.json().catch(function () { return {}; });
    if (!dealRes.ok) {
      console.error('Erro ao criar oportunidade no PipeRun', dealRes.status, dealData);
      return res.status(502).json({ ok: false, error: 'Falha ao registrar oportunidade' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro inesperado na integração com PipeRun', err);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
};
