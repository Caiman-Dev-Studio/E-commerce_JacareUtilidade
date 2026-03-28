export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: "Endereço obrigatório" });
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(address)}`;

        const resp = await fetch(url, {
            headers: {
                "User-Agent": "JacareUtilidades/1.0"
            }
        });

        const data = await resp.json();

        if (!resp.ok) {
            return res.status(502).json({
                error: "Falha ao consultar geocodificação",
                detail: data
            });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }

        return res.status(200).json({
            lat: Number(data[0].lat),
            lng: Number(data[0].lon),
            display_name: data[0].display_name
        });
    } catch (e) {
        return res.status(500).json({
            error: "Erro ao geocodificar endereço",
            detail: e.message
        });
    }
}