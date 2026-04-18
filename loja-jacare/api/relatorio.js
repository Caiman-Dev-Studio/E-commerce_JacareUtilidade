import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { ensureAdminRequest } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function rangeDiaBrasil() {
  const agora = new Date();
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const br = new Date(utc - 3 * 60 * 60000);

  const inicio = new Date(br);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(br);
  fim.setHours(23, 59, 59, 999);

  const inicioUTC = new Date(inicio.getTime() + 3 * 60 * 60000).toISOString();
  const fimUTC = new Date(fim.getTime() + 3 * 60 * 60000).toISOString();

  return { inicioUTC, fimUTC, br };
}

function formatMoney(value) {
  const amount = Number(value || 0).toFixed(2).replace('.', ',');
  return `R$ ${amount}`;
}

function normalizarItens(itens) {
  if (!itens) return [];

  if (typeof itens === 'string') {
    try {
      itens = JSON.parse(itens);
    } catch {
      return [];
    }
  }

  if (Array.isArray(itens)) return itens;
  if (typeof itens === 'object') return Object.values(itens);
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Metodo nao permitido');
  if (!ensureAdminRequest(req, res)) return;

  try {
    const { inicioUTC, fimUTC, br } = rangeDiaBrasil();

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('status', 'FINALIZADO')
      .gte('created_at', inicioUTC)
      .lte('created_at', fimUTC)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="relatorio-${br.toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf"`
      );
      res.status(200).send(pdf);
    });

    doc.fontSize(18).text('Relatorio do Dia - Pedidos Finalizados');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(`Data: ${br.toLocaleDateString('pt-BR')} (horario BR)`);
    doc.moveDown(1);
    doc.fillColor('#000');

    if (!data || data.length === 0) {
      doc.fontSize(12).text('Nenhum pedido finalizado hoje.');
      doc.end();
      return;
    }

    data.forEach((pedido, index) => {
      const hora = new Date(pedido.created_at).toLocaleString('pt-BR');
      const itens = normalizarItens(pedido.itens);

      doc.fontSize(12).text('PEDIDO JACARE UTILIDADES');
      doc.fontSize(11).text(`CODIGO: ${pedido.code || '-'}`);
      doc.fontSize(10).fillColor('#555').text(`Criado em: ${hora}`);
      doc.fillColor('#000');
      doc.moveDown(0.4);

      doc.fontSize(11).text('Itens:');
      if (!itens.length) {
        doc.fontSize(10).fillColor('#555').text('Sem itens');
        doc.fillColor('#000');
      } else {
        itens.forEach((item) => {
          const qtd = Number(item.qtd || item.quantidade || 0);
          const nome = item.nome || item.name || 'Item';
          const preco = Number(item.preco || item.price || 0);
          const presenteQtd = Number(item.presenteQtd || 0);
          const subtotal = preco * qtd;
          const presenteTxt = presenteQtd > 0 ? ` (${presenteQtd} para presente)` : '';

          doc.fontSize(10).text(`- (${qtd}x) ${nome}${presenteTxt} - ${formatMoney(subtotal)}`);
        });
      }

      doc.moveDown(0.4);
      doc.fontSize(11).text(`TOTAL: ${formatMoney(pedido.total)}`);
      doc.fontSize(11).text(`FRETE: ${formatMoney(pedido.frete)}`);
      doc.fontSize(11).text(`ENDERECO: ${(pedido.endereco || '-').toString()}`);
      doc.moveDown(0.8);

      if (index !== data.length - 1) {
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(0.8);
      }
    });

    doc.end();
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}
