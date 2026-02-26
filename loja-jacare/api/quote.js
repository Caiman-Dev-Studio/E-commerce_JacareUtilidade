export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Endereço obrigatório' });
  }

  // SIMULAÇÃO SIMPLES (depois ligamos API real)
  const shipping = 15.00;
  const eta = "30-40 min";

  return res.status(200).json({ shipping, eta });
}