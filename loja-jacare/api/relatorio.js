import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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

function formatMoney(n) {
  const v = Number(n || 0).toFixed(2).replace('.', ',');
  return `R$ ${v}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

function assetPath(fileName) {
  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), 'loja-jacare', fileName)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function addImageIfExists(doc, fileName, x, y, options = {}) {
  const filePath = assetPath(fileName);
  if (!fs.existsSync(filePath)) return false;

  try {
    doc.image(filePath, x, y, options);
    return true;
  } catch {
    return false;
  }
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

    return supabase
      .from('pedidos')
      .select('*')
      .eq('status', 'FINALIZADO')
      .gte('created_at', inicioUTC)
      .lte('created_at', fimUTC)
      .order('created_at', { ascending: true });
  }

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

function drawHeader(doc, br, totalPedidos, totalVendas) {
  const { width } = doc.page;
  const left = doc.page.margins.left;
  const right = width - doc.page.margins.right;

  doc.save();
  doc.rect(0, 0, width, 118).fill('#0b2f24');
  doc.rect(0, 92, width, 26).fill('#118044');

  const drewLogo = addImageIfExists(doc, 'favicon.png', left, 24, {
    fit: [54, 54],
    align: 'center',
    valign: 'center'
  });

  if (!drewLogo) {
    doc.circle(left + 27, 51, 27).fill('#ffffff');
    doc.fillColor('#118044').font('Helvetica-Bold').fontSize(20).text('J', left, 39, {
      width: 54,
      align: 'center'
    });
  }

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('Jacare Utilidades', left + 68, 28, { width: 260 });

  doc
    .fillColor('#cbe8d5')
    .font('Helvetica')
    .fontSize(9)
    .text('Relatorio diario de pedidos finalizados', left + 70, 57, { width: 260 });

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('RELATORIO DO DIA', right - 190, 31, { width: 190, align: 'right' });

  doc
    .fillColor('#d9f4e4')
    .font('Helvetica')
    .fontSize(9)
    .text(br.toLocaleDateString('pt-BR'), right - 190, 55, { width: 190, align: 'right' });

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`${totalPedidos} pedidos`, left, 98, { width: 150 });

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`Total vendido: ${formatMoney(totalVendas)}`, right - 190, 98, {
      width: 190,
      align: 'right'
    });

  doc.restore();
}

function drawFooter(doc, pageNumber, pageCount) {
  const { width, height } = doc.page;
  const left = doc.page.margins.left;
  const right = width - doc.page.margins.right;
  const y = height - 52;

  doc.save();
  doc.moveTo(left, y - 10).lineTo(right, y - 10).strokeColor('#d9e3dd').lineWidth(0.8).stroke();

  doc
    .fillColor('#5c6b63')
    .font('Helvetica')
    .fontSize(8)
    .text('Relatorio gerado automaticamente pelo painel administrativo da Jacare Utilidades.', left, y, {
      width: 250
    });

  const logoX = right - 150;
  doc
    .fillColor('#5c6b63')
    .font('Helvetica')
    .fontSize(8)
    .text('Desenvolvido por', logoX, y, { width: 72, align: 'right' });

  const drewCaiman = addImageIfExists(doc, 'logo-caiman.png', logoX + 78, y - 8, {
    fit: [28, 28]
  });

  doc
    .fillColor('#0b2f24')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('Caiman Dev Studio', drewCaiman ? logoX + 110 : logoX + 78, y, {
      width: drewCaiman ? 60 : 92
    });

  doc
    .fillColor('#7a857e')
    .font('Helvetica')
    .fontSize(8)
    .text(`Pagina ${pageNumber} de ${pageCount}`, left, y + 20, {
      width: right - left,
      align: 'center'
    });

  doc.restore();
}

function ensureSpace(doc, neededHeight) {
  const bottom = doc.page.height - doc.page.margins.bottom - 24;
  if (doc.y + neededHeight > bottom) {
    doc.addPage();
  }
}

function drawInfoBox(doc, title, value, x, y, width) {
  doc.save();
  doc.roundedRect(x, y, width, 54, 8).fillAndStroke('#f5faf7', '#dcebe2');
  doc
    .fillColor('#60746a')
    .font('Helvetica')
    .fontSize(8)
    .text(title.toUpperCase(), x + 12, y + 11, { width: width - 24 });
  doc
    .fillColor('#0b2f24')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(value, x + 12, y + 28, { width: width - 24 });
  doc.restore();
}

function drawOrder(doc, pedido, index) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const itens = normalizarItens(pedido.itens);
  const itemLines = Math.max(itens.length, 1);
  const address = (pedido.endereco || 'Retirada na loja').toString();
  const addressHeight = doc.heightOfString(address, { width: width - 28 });
  const cardHeight = 112 + (itemLines * 16) + addressHeight;

  ensureSpace(doc, cardHeight + 16);
  const y = doc.y;

  doc.save();
  doc.roundedRect(left, y, width, cardHeight, 8).fillAndStroke('#ffffff', '#dde8e1');
  doc.rect(left, y, 5, cardHeight).fill('#118044');

  doc
    .fillColor('#0b2f24')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(`Pedido ${index + 1}`, left + 16, y + 14, { width: 70 });

  doc
    .fontSize(13)
    .text(pedido.code || '-', left + 90, y + 13, { width: 160 });

  doc
    .fillColor('#60746a')
    .font('Helvetica')
    .fontSize(9)
    .text(
      pedido.finalizado_em
        ? `Finalizado em ${formatDateTime(pedido.finalizado_em)}`
        : `Criado em ${formatDateTime(pedido.created_at)}`,
      right - 190,
      y + 16,
      { width: 174, align: 'right' }
    );

  doc.moveTo(left + 16, y + 42).lineTo(right - 16, y + 42).strokeColor('#edf2ee').stroke();

  let cursorY = y + 54;
  doc
    .fillColor('#0b2f24')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Itens', left + 16, cursorY);

  cursorY += 16;
  doc.font('Helvetica').fontSize(9).fillColor('#26332d');

  if (!itens.length) {
    doc.text('Sem itens', left + 16, cursorY, { width: width - 32 });
    cursorY += 16;
  } else {
    itens.forEach((item) => {
      const qtd = Number(item.qtd || item.quantidade || 0);
      const nome = item.nome || item.name || 'Item';
      const preco = Number(item.preco || item.price || 0);
      const presenteQtd = Number(item.presenteQtd || 0);
      const sub = preco * qtd;
      const presenteTxt = presenteQtd > 0 ? ` (${presenteQtd} para presente)` : '';

      doc.text(`${qtd}x ${nome}${presenteTxt}`, left + 16, cursorY, { width: width - 160 });
      doc.font('Helvetica-Bold').text(formatMoney(sub), right - 110, cursorY, {
        width: 94,
        align: 'right'
      });
      doc.font('Helvetica');
      cursorY += 16;
    });
  }

  cursorY += 4;
  doc
    .fillColor('#60746a')
    .fontSize(8)
    .text('Endereco', left + 16, cursorY, { width: width - 32 });
  cursorY += 12;
  doc
    .fillColor('#26332d')
    .fontSize(9)
    .text(address, left + 16, cursorY, { width: width - 32 });

  const totalsY = y + cardHeight - 38;
  doc
    .fillColor('#60746a')
    .font('Helvetica')
    .fontSize(8)
    .text(`Frete ${formatMoney(pedido.frete)}`, left + 16, totalsY + 6, { width: 130 });

  doc
    .fillColor('#0b2f24')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(`Total ${formatMoney(pedido.total)}`, right - 150, totalsY + 4, {
      width: 134,
      align: 'right'
    });

  doc.restore();
  doc.y = y + cardHeight + 12;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Metodo nao permitido');

  try {
    const { inicioUTC, fimUTC, br } = rangeDiaBrasil();
    const { data, error } = await buscarFinalizadosDoDia(inicioUTC, fimUTC);

    if (error) return res.status(500).json({ sucesso: false, erro: error.message });

    const pedidos = data || [];
    const totalPedidos = pedidos.length;
    const totalVendas = pedidos.reduce((total, pedido) => total + Number(pedido.total || 0), 0);
    const totalFretes = pedidos.reduce((total, pedido) => total + Number(pedido.frete || 0), 0);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: 'Relatorio do Dia - Jacare Utilidades',
        Author: 'Jacare Utilidades',
        Creator: 'Caiman Dev Studio'
      }
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${br.toLocaleDateString('pt-BR').replaceAll('/','-')}.pdf"`);
      res.status(200).send(pdf);
    });

    drawHeader(doc, br, totalPedidos, totalVendas);
    doc.y = 142;

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const gap = 12;
    const boxWidth = (right - left - gap * 2) / 3;

    drawInfoBox(doc, 'Pedidos finalizados', String(totalPedidos), left, doc.y, boxWidth);
    drawInfoBox(doc, 'Total em vendas', formatMoney(totalVendas), left + boxWidth + gap, doc.y, boxWidth);
    drawInfoBox(doc, 'Total em fretes', formatMoney(totalFretes), left + (boxWidth + gap) * 2, doc.y, boxWidth);

    doc.y += 78;
    doc
      .fillColor('#0b2f24')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Pedidos finalizados', left, doc.y);
    doc.moveDown(0.8);

    if (!pedidos.length) {
      const emptyY = doc.y;
      doc
        .roundedRect(left, emptyY, right - left, 86, 8)
        .fillAndStroke('#fffaf0', '#ead9b6');
      doc
        .fillColor('#8a5a00')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Nenhum pedido finalizado hoje.', left + 18, emptyY + 32, {
          width: right - left - 36,
          align: 'center'
        });
    } else {
      pedidos.forEach((pedido, index) => drawOrder(doc, pedido, index));

      ensureSpace(doc, 76);
      const summaryY = doc.y + 8;
      doc.roundedRect(left, summaryY, right - left, 56, 8).fillAndStroke('#0b2f24', '#0b2f24');
      doc
        .fillColor('#cbe8d5')
        .font('Helvetica')
        .fontSize(9)
        .text('Fechamento do dia', left + 18, summaryY + 13, { width: 180 });
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(formatMoney(totalVendas), right - 178, summaryY + 18, {
          width: 160,
          align: 'right'
        });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      drawFooter(doc, i + 1, range.count);
    }

    doc.end();
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
}
