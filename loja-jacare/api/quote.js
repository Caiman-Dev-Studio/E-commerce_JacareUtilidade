// /api/quote.js  (Vercel/Node)
// Recebe: { address, dropoff_lat, dropoff_lng, customer_name, customer_phone }
// Retorna: { shipping, eta, estimate_id, currency }

let cachedToken = null;
let tokenExpMs = 0;

async function getUberToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpMs - 60_000) return cachedToken;

  const clientId = process.env.UBER_CLIENT_ID;
  const clientSecret = process.env.UBER_CLIENT_SECRET;

  const resp = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "eats.deliveries",
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error_description || "Erro ao autenticar na Uber");

  cachedToken = data.access_token;
  tokenExpMs = now + (data.expires_in * 1000);
  return cachedToken;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { dropoff_lat, dropoff_lng } = req.body;
  if (dropoff_lat == null || dropoff_lng == null) {
    return res.status(400).json({ error: "Coordenadas do destino obrigatórias" });
  }

  try {
    const token = await getUberToken();

    // Pickup = sua loja (fixo)
    const pickup = {
      latitude: Number(process.env.STORE_LAT),
      longitude: Number(process.env.STORE_LNG),
      // address opcional; pode manter só lat/lng se preferir
      address: process.env.STORE_ADDRESS,
    };

    const dropoff = {
      latitude: Number(dropoff_lat),
      longitude: Number(dropoff_lng),
    };

    // Campos exatos podem variar por conta/feature; base é Estimate do Uber Direct.
    const estimateResp = await fetch("https://api.uber.com/v1/eats/deliveries/estimates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pickup,
        dropoff,
      }),
    });

    const estimate = await estimateResp.json();
    if (!estimateResp.ok) {
      return res.status(502).json({ error: "Falha no estimate Uber Direct", detail: estimate });
    }

    // Ajuste os paths conforme o JSON real que sua conta retorna
    const shipping = Number(estimate?.fee?.value ?? estimate?.fee ?? 0);
    const currency = estimate?.fee?.currency_code ?? "BRL";
    const eta = estimate?.eta ?? estimate?.dropoff_eta ?? null;
    const estimate_id = estimate?.estimate_id ?? estimate?.id ?? null;

    return res.status(200).json({ shipping, currency, eta, estimate_id });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}