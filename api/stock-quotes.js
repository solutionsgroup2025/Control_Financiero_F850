// /api/stock-quotes.js
// Proxy server-side para leer cotizaciones de acciones/ETFs (Interactive Broker) desde Twelve Data,
// sin exponer la API key al navegador. Requiere la variable de entorno TWELVEDATA_API_KEY
// configurada en Vercel (Project Settings → Environment Variables).
//
// Devuelve, por cada símbolo: precio actual, % de cambio 1D/1W/1M/1Y, y la serie histórica
// de cierres diarios (hasta 260 sesiones ≈ 1 año) para graficar la fluctuación.

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "TWELVEDATA_API_KEY no configurada en el servidor. Agrégala en Vercel → Settings → Environment Variables y vuelve a desplegar."
    });
    return;
  }

  const symbolsParam = (req.query.symbols || "").trim();
  if (!symbolsParam) {
    res.status(400).json({ error: "Falta el parámetro 'symbols' (ej: VOO,QQQM)." });
    return;
  }
  const symbols = symbolsParam.split(",").map(function (s) { return s.trim().toUpperCase(); }).filter(Boolean);

  try {
    const quotes = {};
    for (const symbol of symbols) {
      const url = "https://api.twelvedata.com/time_series?symbol=" + encodeURIComponent(symbol) +
        "&interval=1day&outputsize=260&apikey=" + apiKey;
      const r = await fetch(url);
      const body = await r.json();

      if (body.status === "error" || !body.values || !body.values.length) {
        quotes[symbol] = { error: (body && body.message) || ("No se pudo obtener datos de " + symbol) };
        continue;
      }

      // Twelve Data devuelve 'values' del más reciente al más antiguo.
      const values = body.values;
      const closes = values.map(function (v) { return parseFloat(v.close); });
      const dates = values.map(function (v) { return v.datetime; });
      const latest = closes[0];

      function pctChange(indexAgo) {
        if (closes.length <= indexAgo) return null;
        const prev = closes[indexAgo];
        return prev ? ((latest - prev) / prev) * 100 : null;
      }

      const series = [];
      for (let i = closes.length - 1; i >= 0; i--) {
        series.push({ date: dates[i], close: closes[i] });
      }

      quotes[symbol] = {
        price: latest,
        ch1d: pctChange(1),
        ch1w: pctChange(5),
        ch1m: pctChange(21),
        ch1y: pctChange(closes.length - 1),
        series: series
      };
    }

    res.status(200).json({ quotes: quotes });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error desconocido al contactar Twelve Data" });
  }
};
