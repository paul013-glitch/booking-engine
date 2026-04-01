const {
  getWorkspaceBySlug,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function isHoldActive(booking) {
  return booking.status === "held" && (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) > new Date());
}

function overlappingBookings(workspace, roomId, startDate, endDate) {
  return (workspace.bookings || []).filter((booking) => {
    if (booking.roomId !== roomId) return false;
    if (booking.status === "expired") return false;
    if (booking.status === "held" && !isHoldActive(booking)) return false;
    return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
  });
}

function availableUnits(workspace, roomId, startDate, endDate) {
  const room = (workspace.rooms || []).find((item) => item.id === roomId);
  if (!room) return 0;
  return Math.max(0, Number(room.totalUnits || 0) - overlappingBookings(workspace, roomId, startDate, endDate).length);
}

function packageSummary(workspace, booking) {
  const packageQuantities = booking.packageQuantities || {};
  const packageRows = Object.entries(packageQuantities)
    .map(([packageId, quantity]) => {
      const pkg = (workspace.packages || []).find((item) => item.id === packageId);
      if (!pkg || !quantity) return null;
      return `${pkg.name} × ${quantity}`;
    })
    .filter(Boolean);

  if (packageRows.length) return packageRows.join(", ");
  const fallback = (workspace.packages || []).find((item) => item.id === booking.packageId);
  return `${fallback?.name || booking.packageId} × 1`;
}

function addonSummary(workspace, booking) {
  const addonIds = Array.isArray(booking.addonIds) ? booking.addonIds : [];
  const addonNames = addonIds
    .map((addonId) => (workspace.addons || []).find((item) => item.id === addonId)?.name)
    .filter(Boolean);
  return addonNames.length ? addonNames.join(", ") : "None";
}

function buildEmail({ workspace, booking }) {
  const fromName = process.env.RESEND_FROM_NAME || workspace.camp?.name || "Campify";
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO || fromEmail;
  const subject = `Booking confirmed at ${workspace.camp?.name || "your camp"}`;
  const text = [
    `Hello ${booking.guestName},`,
    "",
    `Your booking at ${workspace.camp?.name || "our camp"} is confirmed.`,
    `Check-in: ${formatDate(booking.startDate)}`,
    `Check-out: ${formatDate(booking.endDate)}`,
    `Package: ${packageSummary(workspace, booking)}`,
    `Room: ${(workspace.rooms || []).find((item) => item.id === booking.roomId)?.name || booking.roomId}`,
    `Add-ons: ${addonSummary(workspace, booking)}`,
    `Total: ${formatMoney(booking.total)}`,
    "",
    `Guest name: ${booking.guestName}`,
    `Guest email: ${booking.guestEmail}`,
    `Guest phone: ${booking.guestPhone}`,
    `Country: ${booking.guestCountry}`,
    "",
    "Thanks for booking with us.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2f261d;">
      <h2 style="margin: 0 0 12px;">Booking confirmed</h2>
      <p>Hello ${booking.guestName},</p>
      <p>Your booking at <strong>${workspace.camp?.name || "our camp"}</strong> is confirmed.</p>
      <ul>
        <li><strong>Check-in:</strong> ${formatDate(booking.startDate)}</li>
        <li><strong>Check-out:</strong> ${formatDate(booking.endDate)}</li>
        <li><strong>Package:</strong> ${packageSummary(workspace, booking)}</li>
        <li><strong>Room:</strong> ${(workspace.rooms || []).find((item) => item.id === booking.roomId)?.name || booking.roomId}</li>
        <li><strong>Add-ons:</strong> ${addonSummary(workspace, booking)}</li>
        <li><strong>Total:</strong> ${formatMoney(booking.total)}</li>
      </ul>
      <p><strong>Guest name:</strong> ${booking.guestName}<br />
      <strong>Guest email:</strong> ${booking.guestEmail}<br />
      <strong>Guest phone:</strong> ${booking.guestPhone}<br />
      <strong>Country:</strong> ${booking.guestCountry}</p>
      <p>Thanks for booking with us.</p>
    </div>
  `;

  return { fromName, fromEmail, replyTo, subject, text, html };
}

async function sendConfirmationEmail({ workspace, booking }) {
  const { fromEmail, replyTo, subject, text, html, fromName } = buildEmail({ workspace, booking });
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !fromEmail || !booking.guestEmail) {
    return {
      status: "skipped",
      reason: !booking.guestEmail ? "Guest email missing" : "Email provider not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [booking.guestEmail],
      reply_to: replyTo || fromEmail,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Email request failed (${response.status})`);
  }

  return {
    status: "sent",
    provider: "resend",
    id: data?.id || null,
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    const slug = payload.workspaceSlug || payload.slug;
    if (!slug) {
      return response(400, { error: "Missing workspace slug" });
    }

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return response(404, { error: "Workspace not found" });
    }

    const normalized = normalizeWorkspace(workspace);
    const booking = payload.booking || {};
    const required = ["guestName", "guestEmail", "guestPhone", "guestCountry", "packageId", "roomId", "startDate", "endDate"];
    const missing = required.filter((key) => !String(booking[key] || "").trim());
    if (missing.length) {
      return response(400, { error: `Missing booking fields: ${missing.join(", ")}` });
    }

    if (availableUnits(normalized, booking.roomId, booking.startDate, booking.endDate) <= 0) {
      return response(409, { error: "That room is no longer available for these dates." });
    }

    const now = new Date();
    const intentId = booking.id || `intent-${now.getTime()}`;
    const bookingId = `booking-${now.getTime()}`;

    const intentRecord = {
      ...booking,
      id: intentId,
      stage: "confirmed",
      createdAt: booking.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const bookingRecord = {
      ...booking,
      id: bookingId,
      status: "confirmed",
      createdAt: booking.createdAt || now.toISOString(),
      holdExpiresAt: null,
      notes: booking.notes || "Confirmed booking.",
      source: "demo-checkout",
      confirmationEmail: { status: "pending" },
    };

    normalized.bookingIntents = [intentRecord, ...(normalized.bookingIntents || []).filter((item) => item.id !== intentRecord.id)];
    normalized.bookings = [bookingRecord, ...(normalized.bookings || []).filter((item) => item.id !== bookingRecord.id)];

    const saved = await saveWorkspace(normalized);

    let email = { status: "skipped", reason: "Email provider not configured" };
    try {
      email = await sendConfirmationEmail({ workspace: saved, booking: bookingRecord });
    } catch (error) {
      email = {
        status: "error",
        reason: error instanceof Error ? error.message : "Failed to send email",
      };
    }

    saved.bookings = (saved.bookings || []).map((item) =>
      item.id === bookingId ? { ...item, confirmationEmail: email } : item,
    );
    saved.bookingIntents = (saved.bookingIntents || []).map((item) =>
      item.id === intentId ? { ...item, confirmationEmail: email } : item,
    );

    const finalWorkspace = await saveWorkspace(saved);

    return response(200, {
      workspace: finalWorkspace,
      booking: finalWorkspace.bookings.find((item) => item.id === bookingId) || bookingRecord,
      email,
    });
  } catch (error) {
    console.error("confirm-booking failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to confirm booking" });
  }
};
