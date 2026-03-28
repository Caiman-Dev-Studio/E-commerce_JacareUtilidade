// loja-jacare/api/quote.js
// Recebe: { address }
// Retorna: { shipping, eta, quote_id, currency, raw }

let cachedToken = null;
let tokenExpMs = 0;

async function getUberToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpMs - 60_000) return cachedToken;

  const clientId = process.env.UBER_CLIENT_ID;
  const clientSecret = process.env.UBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Variáveis da Uber não configuradas na Vercel");
  }

  const resp = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data?.error_description || "Erro ao autenticar na Uber");
  }

  cachedToken = data.access_token;
  tokenExpMs = now + Number(data.expires_in || 0) * 1000;
  return cachedToken;
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Loja-Jacare/1.0",
      "Accept-Language": "pt-BR",
    },
  });

  const data = await resp.json();

  if (!resp.ok || !Array.isArray(data) || data.length === 0) {
    throw new Error("Não foi possível localizar o endereço informado");
  }

  return data[0];
}

function montarEnderecoDetalhado(addressOriginal, geo) {
  const a = geo?.address || {};

  const street =
    [a.road, a.house_number].filter(Boolean).join(", ") ||
    a.pedestrian ||
    a.cycleway ||
    addressOriginal;

  const city =
    a.city || a.town || a.village || a.municipality || a.county || "";

  const state = a.state || "";
  const zip = a.postcode || "";
  const country = (a.country_code || "br").toUpperCase();

  return {
    street_address: [street],
    city,
    state,
    zip_code: zip,
    country,
  };
}

function formatEtaMinutes(raw) {
  if (raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return `${n} min`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { address } = req.body || {};

    if (!address || !String(address).trim()) {
      return res.status(400).json({ error: "Endereço é obrigatório" });
    }

    const customerId = process.env.ID_DO_USUARIO_UBER;
    const storeAddress = process.env.STORE_ADDRESS;
    const storeLat = Number(process.env.STORE_LAT);
    const storeLng = Number(process.env.STORE_LNG);

    if (!customerId) {
      return res.status(500).json({ error: "ID_DO_USUARIO_UBER não configurado" });
    }

    if (!storeAddress) {
      return res.status(500).json({ error: "STORE_ADDRESS não configurado" });
    }

    const token = await getUberToken();

    const destinoGeo = await geocodeAddress(address);
    const destinoDetalhado = montarEnderecoDetalhado(address, destinoGeo);
    const origemDetalhada = montarEnderecoDetalhado(storeAddress, {
      address: {
        road: storeAddress,
        city: "",
        state: "",
        postcode: "",
        country_code: "br",
      },
    });

    const body = {
      pickup_address: JSON.stringify(origemDetalhada),
      dropoff_address: JSON.stringify(destinoDetalhado),
    };

    if (!Number.isNaN(storeLat) && !Number.isNaN(storeLng)) {
      body.pickup_latitude = storeLat;
      body.pickup_longitude = storeLng;
    }

    const dropoffLat = Number(destinoGeo.lat);
    const dropoffLng = Number(destinoGeo.lon);

    if (!Number.isNaN(dropoffLat) && !Number.isNaN(dropoffLng)) {
      body.dropoff_latitude = dropoffLat;
      body.dropoff_longitude = dropoffLng;
    }

    const uberResp = await fetch(
      `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const uberData = await uberResp.json();

    if (!uberResp.ok) {
      return res.status(502).json({
        error: "Falha ao consultar quote na Uber Direct",
        detail: uberData,
      });
    }

    const feeCents = Number(uberData?.fee ?? 0);
    const shipping = feeCents / 100;

    const eta =
      formatEtaMinutes(uberData?.duration) ||
      formatEtaMinutes(
        Number(uberData?.pickup_duration || 0) + Number(uberData?.dropoff_duration || 0)
      ) ||
      null;

    return res.status(200).json({
      shipping,
      eta,
      quote_id: uberData?.id || null,
      currency: (uberData?.currency || "brl").toUpperCase(),
      raw: uberData,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno",
    });
  }
}