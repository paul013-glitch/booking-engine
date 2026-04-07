const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

function cleanText(value, maxLength = 100) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST allowed" });
  }

  let data;

  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }

  const name = cleanText(data.name, 100);
  const email = cleanText(data.email, 100);
  const phone = cleanText(data.phone, 40);
  const guests = Number.parseInt(data.guests, 10);
  const checkin = cleanText(data.checkin, 20);
  const checkout = cleanText(data.checkout, 20);
  const checkinTime = cleanText(data.checkinTime, 20);
  const total = cleanText(data.total, 30);
  const promo = cleanText(data.promo || "none", 30);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isFinite(guests) || guests < 1 || guests > 10) {
    return json(400, { error: "Invalid input" });
  }

  const lead = {
    name,
    email,
    phone,
    guests,
    checkin,
    checkout,
    checkinTime,
    total,
    promo,
    timestamp: new Date().toISOString(),
    ip: event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || null
  };

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      });

      if (!response.ok) {
        console.warn("Lead webhook returned non-OK response", response.status);
      }
    } catch (error) {
      console.warn("Lead webhook request failed", error);
    }
  } else {
    console.log("Lead captured", lead);
  }

  return json(200, { ok: true });
};
