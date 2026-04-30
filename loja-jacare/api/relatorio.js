import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Dia atual no Brasil (UTC-3) — simples e suficiente pro seu caso
function rangeDiaBrasil() {
  const agora = new Date();
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const br = new Date(utc - 3 * 60 * 60000);

  const inicio = new Date(br);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(br);
  fim.setHours(23, 59, 59, 999);

  // voltar para UTC ISO
  const inicioUTC = new Date(inicio.getTime() + 3 * 60 * 60000).toISOString();
  const fimUTC = new Date(fim.getTime() + 3 * 60 * 60000).toISOString();

  return { inicioUTC, fimUTC, br };
}

function formatMoney(n) {
  const v = Number(n || 0).toFixed(2).replace('.', ',');
  return `R$ ${v}`;
}

function normalizarItens(itens) {
  if (!itens) return [];
  if (typeof itens === 'string') {
    try { itens = JSON.parse(itens); } catch { return []; }
  }
  if (Array.isArray(itens)) return itens;
  if (typeof itens === 'object') return Object.values(itens);
  return [];
}

function erroColunaFinalizadoEm(error) {
  return String(error?.message || '').includes('finalizado_em');
}

async function buscarFinalizadosDoDia(inicioUTC, fimUTC) {
  const porFinalizacao = await supabase
    .from('pedidos')
    .select('*')
    .eq('status', 'FINALIZADO')
    .gte('finalizado_em', inicioUTC)
    .lte('finalizado_em', fimUTC)
    .order('finalizado_em', { ascending: true });

  if (porFinalizacao.error) {
    if (!erroColunaFinalizadoEm(porFinalizacao.error)) {
      return { data: null, error: porFinalizacao.error };
    }

    // Fallback temporario para nao quebrar enquanto a coluna finalizado_em nao foi criada.
    return supabase
      .from('pedidos')
      .select('*')
      .eq('status', 'FINALIZADO')
      .gte('created_at', inicioUTC)
      .lte('created_at', fimUTC)
      .order('created_at', { ascending: true });
  }

  // Inclui registros antigos, finalizados antes da migracao, que ainda nao possuem finalizado_em.
  const legados = await supabase
    .from('pedidos')
    .select('*')
    .eq('status', 'FINALIZADO')
    .is('finalizado_em', null)
    .gte('created_at', inicioUTC)
    .lte('created_at', fimUTC)
    .order('created_at', { ascending: true });

  if (legados.error) return { data: null, error: legados.error };

  const porId = new Map();
  [...(porFinalizacao.data || []), ...(legados.data || [])].forEach((pedido) => {
    porId.set(pedido.id || pedido.code, pedido);
  });

  const data = [...porId.values()].sort((a, b) => {
    const dataA = new Date(a.finalizado_em || a.created_at).getTime();
    const dataB = new Date(b.finalizado_em || b.created_at).getTime();
    return dataA - dataB;
  });

  return { data, error: null };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Método não permitido');

  try {
    const { inicioUTC, fimUTC, br } = rangeDiaBrasil();

    // Pegando pedidos FINALIZADO do dia pela data/hora em que foram finalizados.
    const { data, error } = await buscarFinalizadosDoDia(inicioUTC, fimUTC);

    if (error) return res.status(500).json({ sucesso: false, erro: error.message });

    // Criar PDF
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${br.toLocaleDateString('pt-BR').replaceAll('/','-')}.pdf"`);
      res.status(200).send(pdf);
    });

    doc.fontSize(18).text('Relatório do Dia - Pedidos Finalizados', { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(`Data: ${br.toLocaleDateString('pt-BR')} (horário BR)`);
    doc.moveDown(1);
    doc.fillColor('#000');

    if (!data || data.length === 0) {
      doc.fontSize(12).text('Nenhum pedido finalizado hoje.');
      doc.end();
      return;
    }

    data.forEach((p, idx) => {
      const horaFinalizado = p.finalizado_em
        ? new Date(p.finalizado_em).toLocaleString('pt-BR')
        : null;
      const horaCriado = new Date(p.created_at).toLocaleString('pt-BR');
      const itens = normalizarItens(p.itens);

      doc.fontSize(12).text(`🐊 PEDIDO JACARÉ UTILIDADES`, { underline: false });
      doc.fontSize(11).text(`🆔 CÓDIGO: ${p.code || '-'}`);
      doc.fontSize(10).fillColor('#555').text(
        horaFinalizado ? `Finalizado em: ${horaFinalizado}` : `Criado em: ${horaCriado}`
      );
      doc.fillColor('#000');
      doc.moveDown(0.4);

      doc.fontSize(11).text(`Itens:`);
      if (!itens.length) {
        doc.fontSize(10).fillColor('#555').text('Sem itens');
        doc.fillColor('#000');
      } else {
        itens.forEach(i => {
          const qtd = Number(i.qtd || i.quantidade || 0);
          const nome = i.nome || i.name || 'Item';
          const preco = Number(i.preco || i.price || 0);
          const presenteQtd = Number(i.presenteQtd || 0);
          const sub = preco * qtd;
          const presenteTxt = presenteQtd > 0 ? ` (🎁 ${presenteQtd} para presente)` : '';
          doc.fontSize(10).text(`• (${qtd}x) ${nome}${presenteTxt} - ${formatMoney(sub)}`);
        });
      }

      doc.moveDown(0.4);
      doc.fontSize(11).text(`TOTAL: ${formatMoney(p.total)}`);
      doc.fontSize(11).text(`FRETE: ${formatMoney(p.frete)}`);
      doc.fontSize(11).text(`ENDEREÇO: ${(p.endereco || '-').toString()}`);
      doc.moveDown(0.8);

      if (idx !== data.length - 1) {
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(0.8);
      }
    });

    doc.end();
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
}
