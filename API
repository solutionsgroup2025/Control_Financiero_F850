// /api/binance-holdings.js
// Proxy server-side para leer holdings de Binance Spot sin exponer el API secret al navegador.
// Requiere las variables de entorno BINANCE_API_KEY y BINANCE_API_SECRET configuradas en
// Vercel (Project Settings → Environment Variables), nunca en el código ni en el navegador.

const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({
      error: "Binance API key/secret no configurados en el servidor. Agrégalos en Vercel → Settings → Environment Variables (BINANCE_API_KEY, BINANCE_API_SECRET) y vuelve a desplegar."
    });
    return;
  }

  try {
    const timestamp = Date.now();
    const recvWindow = 10000;
    const query = "timestamp=" + timestamp + "&recvWindow=" + recvWindow;
    const signature = crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
    const url = "https://api.binance.com/api/v3/account?" + query + "&signature=" + signature;

    const binanceRes = await fetch(url, { headers: { "X-MBX-APIKEY": apiKey } });
    const body = await binanceRes.json();

    if (!binanceRes.ok) {
      res.status(binanceRes.status).json({
        error: (body && body.msg) || ("HTTP " + binanceRes.status),
        code: body && body.code
      });
      return;
    }

    const balances = (body.balances || [])
      .map(function (b) {
        return { asset: b.asset, qty: (parseFloat(b.free) || 0) + (parseFloat(b.locked) || 0) };
      })
      .filter(function (b) { return b.qty > 0.00000001; });

    res.status(200).json({ balances: balances });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error desconocido al contactar Binance" });
  }
};
