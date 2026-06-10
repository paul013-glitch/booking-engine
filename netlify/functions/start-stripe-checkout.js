const {
  corsHeaders,
  expireExpiredHolds,
  getWorkspaceBySlug,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");
const crypto = require("crypto");

const HOLD_MINUTES = 15;
const STRIPE_SESSION_MINUTES = 31;

function localDateKey(dateInput) {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeysBetween(startDate, endDate) {
  const keys = [];
  const cursor = new Date(startDate);
  const endCursor = new Date(endDate);
  if (!(cursor < endCursor)) return keys;
  while (cursor < endCursor) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function isHoldActive(booking) {
  return booking.status === "held" && (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) > new Date());
}

function blocksInventory(booking) {
  if (!booking) return false;
  if (booking.status === "cancelled" || booking.status === "expired") return false;
  if (booking.status === "held") return isHoldActive(booking);
  return booking.status === "confirmed";
}

function bookingGuestCount(booking = {}) {
  if (booking.packageQuantities && typeof booking.packageQuantities === "object") {
    const total = Object.values(booking.packageQuantities).reduce((sum, quantity) => sum + Math.max(0, Number(quantity) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(1, Number(booking.packagePeople || 1));
}

function bookingRoomAllocations(booking = {}) {
  if (booking.roomAllocations && typeof booking.roomAllocations === "object") {
    return Object.entries(booking.roomAllocations)
      .map(([roomId, guestCount]) => [roomId, Math.max(0, Number(guestCount) || 0)])
      .filter(([, guestCount]) => guestCount > 0);
  }
  return booking.roomId ? [[booking.roomId, bookingGuestCount(booking)]] : [];
}

function bookingRoomAllocationCountForRoom(booking = {}, roomId = "") {
  return bookingRoomAllocations(booking).find(([entryRoomId]) => entryRoomId === roomId)?.[1] || 0;
}

function bookedUnitsForDate(workspace, roomId, dateKey) {
  return (workspace.bookings || []).reduce((sum, booking) => {
    if (!bookingRoomAllocationCountForRoom(booking, roomId)) return sum;
    if (!blocksInventory(booking)) return sum;
    const nextDate = localDateKey(new Date(new Date(dateKey).getTime() + 24 * 60 * 60 * 1000));
    if (!rangesOverlap(dateKey, nextDate, booking.startDate, booking.endDate)) return sum;
    return sum + bookingRoomAllocationCountForRoom(booking, roomId);
  }, 0);
}

function roomAvailabilityRow(workspace, roomId, dateKey) {
  return workspace.camp?.availability?.[roomId]?.days?.[localDateKey(dateKey)] || null;
}

function availableUnits(workspace, roomId, startDate, endDate) {
  const room = (workspace.rooms || []).find((item) => item.id === roomId);
  const dateKeys = dateKeysBetween(startDate, endDate);
  if (!room || !dateKeys.length) return 0;
  return Math.min(
    ...dateKeys.map((dateKey) => {
      const row = roomAvailabilityRow(workspace, roomId, dateKey);
      if (!row) return 0;
      return Math.max(0, Number(row.units ?? room.totalUnits ?? 0) - bookedUnitsForDate(workspace, roomId, dateKey));
    }),
  );
}

function roomEnabled(workspace, roomId) {
  const room = (workspace.rooms || []).find((item) => item.id === roomId);
  return room?.enabled !== false;
}

function roomOpenForCheckin(workspace, roomId, dateKey) {
  const row = roomAvailabilityRow(workspace, roomId, dateKey);
  return !!row && row.openForCheckin !== false;
}

function roomMinimumStay(workspace, roomId, dateKey) {
  return Math.max(1, Number(roomAvailabilityRow(workspace, roomId, dateKey)?.minStay ?? 1));
}

function generateReservationCode(existing = []) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = Array.from(crypto.randomBytes(5))
      .map((byte) => alphabet[byte % alphabet.length])
      .join("")
      .slice(0, 5);
    if (!existing.includes(code)) return code;
  }
  return `R${Date.now().toString(36).slice(-4).toUpperCase()}`.slice(0, 5);
}

function formatDateParts(dateInput) {
  const date = new Date(dateInput);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

function guestGenderList(booking = {}) {
  const count = bookingGuestCount(booking);
  const values = Array.isArray(booking.guestGenders) && booking.guestGenders.length
    ? booking.guestGenders
    : booking.guestGender
      ? [booking.guestGender]
      : [];
  return Array.from({ length: count }, (_, index) => String(values[index] || "").trim());
}

function bookingDepositPercent(workspace = {}) {
  const configured = Number(workspace.camp?.bookingRules?.depositPercent);
  if (Number.isFinite(configured)) {
    return Math.max(1, Math.min(100, Math.round(configured)));
  }
  const envFallback = Number(process.env.STRIPE_PAYMENT_PERCENT);
  return Number.isFinite(envFallback) ? Math.max(1, Math.min(100, Math.round(envFallback))) : 100;
}

function stripeAmountCents(realTotalEuros, workspace = {}) {
  const realTotal = Math.max(0, Number(realTotalEuros || 0));
  const percent = bookingDepositPercent(workspace);
  return Math.max(50, Math.round(realTotal * 100 * (percent / 100)));
}

function stripeDirectModeEnabled() {
  return String(process.env.STRIPE_DIRECT_MODE || "").toLowerCase() === "true";
}

async function createStripeCheckoutSession({ workspace, bookingRecord, successUrl, cancelUrl }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY in Netlify environment variables.");
  }
  const stripeAccountId = workspace.camp?.stripe?.accountId || "";
  const directMode = stripeDirectModeEnabled();
  if (!directMode && (!stripeAccountId || !workspace.camp?.stripe?.chargesEnabled)) {
    throw new Error("Stripe is not connected for this booking engine yet.");
  }

  const amount = stripeAmountCents(bookingRecord.total, workspace);
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);
  params.append("customer_email", bookingRecord.guestEmail || "");
  params.append("expires_at", String(Math.floor(Date.now() / 1000) + STRIPE_SESSION_MINUTES * 60));
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "eur");
  params.append("line_items[0][price_data][unit_amount]", String(amount));
  params.append("line_items[0][price_data][product_data][name]", `Booking at ${workspace.camp?.name || "camp"}`);
  params.append("line_items[0][price_data][product_data][description]", `Reservation ${bookingRecord.reservationCode}.`);
  params.append("metadata[workspaceId]", workspace.id);
  params.append("metadata[workspaceSlug]", workspace.camp?.slug || "");
  params.append("metadata[bookingId]", bookingRecord.id);
  params.append("metadata[reservationCode]", bookingRecord.reservationCode);
  params.append("payment_intent_data[metadata][workspaceId]", workspace.id);
  params.append("payment_intent_data[metadata][bookingId]", bookingRecord.id);
  params.append("payment_intent_data[metadata][reservationCode]", bookingRecord.reservationCode);

  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (!directMode) {
    headers["Stripe-Account"] = stripeAccountId;
  }

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers,
    body: params.toString(),
  });
  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    throw new Error(data?.error?.message || `Stripe checkout failed (${stripeResponse.status})`);
  }
  return data;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const payload = JSON.parse(event.body || "{}");
    const slug = payload.workspaceSlug || payload.slug;
    if (!slug) return response(400, { error: "Missing workspace slug" });

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) return response(404, { error: "Workspace not found" });
    const expired = expireExpiredHolds(workspace);
    const normalized = expired.changed ? await saveWorkspace(expired.workspace) : normalizeWorkspace(workspace);
    const booking = payload.booking || {};
    const required = ["guestName", "guestEmail", "guestPhone", "guestCountry", "packageId", "roomId", "startDate", "endDate"];
    const sharedRoomMode = booking.packageMode !== "full_unit";
    if (sharedRoomMode) {
      required.push("guestBirthDay", "guestBirthMonth", "guestBirthYear");
    }
    const missing = required.filter((key) => !String(booking[key] || "").trim());
    if (missing.length) return response(400, { error: `Missing booking fields: ${missing.join(", ")}` });

    const roomAllocations = bookingRoomAllocations(booking);
    const stayNights = dateKeysBetween(booking.startDate, booking.endDate).length;
    if (!roomAllocations.length) return response(400, { error: "Missing room allocation." });
    if (stayNights <= 0) return response(400, { error: "Check-out date must be after check-in date." });
    if (roomAllocations.reduce((sum, [, count]) => sum + count, 0) !== bookingGuestCount(booking)) {
      return response(400, { error: "Room allocations must match the guest count." });
    }

    for (const [roomId, guestCount] of roomAllocations) {
      if (!roomEnabled(normalized, roomId)) return response(409, { error: `Room type ${roomId} is not available for booking.` });
      if (!roomOpenForCheckin(normalized, roomId, booking.startDate)) {
        return response(409, { error: `Room type ${roomId} is closed for check-in on this date.` });
      }
      if (stayNights < roomMinimumStay(normalized, roomId, booking.startDate)) {
        return response(409, { error: `Room type ${roomId} requires a longer minimum stay for this check-in date.` });
      }
      if (availableUnits(normalized, roomId, booking.startDate, booking.endDate) < guestCount) {
        return response(409, { error: `Room type ${roomId} is no longer available for these dates.` });
      }
    }

    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000).toISOString();
    const existingCodes = [
      ...(normalized.bookings || []).map((item) => item.reservationCode).filter(Boolean),
      ...(normalized.bookingIntents || []).map((item) => item.reservationCode).filter(Boolean),
    ];
    const reservationCode = generateReservationCode(existingCodes);
    const bookingId = `booking-${now.getTime()}`;
    const intentId = booking.id || `intent-${now.getTime()}`;
    const bookingDate = booking.createdAt || now.toISOString();
    const depositPercent = bookingDepositPercent(normalized);
    const depositAmount = stripeAmountCents(booking.total, normalized) / 100;
    const totalAmount = Number(booking.total || 0);

    const bookingRecord = {
      ...booking,
      id: bookingId,
      reservationCode,
      reservationId: reservationCode,
      status: "held",
      paymentStatus: "pending",
      amountPaid: 0,
      amountDue: totalAmount,
      total: totalAmount,
      depositPercent,
      depositAmount,
      paymentCurrency: "EUR",
      paymentLog: [],
      createdAt: bookingDate,
      bookingDateTime: bookingDate,
      bookingDay: formatDateParts(bookingDate).day,
      bookingMonth: formatDateParts(bookingDate).month,
      bookingYear: formatDateParts(bookingDate).year,
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      guestCount: bookingGuestCount(booking),
      guestGenders: guestGenderList(booking),
      roomAllocations: roomAllocations.reduce((acc, [roomId, guestCount]) => {
        acc[roomId] = guestCount;
        return acc;
      }, {}),
      holdExpiresAt,
      notes: booking.notes || "Awaiting Stripe deposit.",
      source: "stripe-checkout",
      confirmationEmail: { status: "pending" },
    };

    const successBase = payload.successUrlBase || `${payload.siteUrl || ""}/confirmation.html`;
    const successUrl = `${successBase}${successBase.includes("?") ? "&" : "?"}reservation=${encodeURIComponent(reservationCode)}&email=${encodeURIComponent(bookingRecord.guestEmail || "")}`;
    const cancelUrl = payload.cancelUrl || payload.siteUrl || successBase;
    const session = await createStripeCheckoutSession({ workspace: normalized, bookingRecord, successUrl, cancelUrl });

    bookingRecord.stripeCheckoutSessionId = session.id;
    bookingRecord.stripePaymentAmount = depositAmount;
    bookingRecord.stripePaymentCurrency = "EUR";
    bookingRecord.stripeAccountId = stripeDirectModeEnabled() ? "" : normalized.camp?.stripe?.accountId || "";
    bookingRecord.stripeMode = stripeDirectModeEnabled() ? "direct" : "connect";
    bookingRecord.paymentLog = [
      {
        id: `payment-log-${now.getTime()}`,
        type: "checkout_session_created",
        status: "pending",
        amount: depositAmount,
        currency: "EUR",
        at: now.toISOString(),
        stripeCheckoutSessionId: session.id,
        stripeAccountId: bookingRecord.stripeAccountId,
        note: `Deposit checkout created for ${depositPercent}% of reservation total.`,
      },
    ];

    const intentRecord = {
      ...bookingRecord,
      id: intentId,
      bookingId,
      stage: "held",
      updatedAt: now.toISOString(),
    };

    normalized.bookingIntents = [intentRecord, ...(normalized.bookingIntents || []).filter((item) => item.id !== intentId)];
    normalized.bookings = [bookingRecord, ...(normalized.bookings || []).filter((item) => item.id !== bookingId)];
    const saved = await saveWorkspace(normalized);

    return response(200, {
      workspace: saved,
      booking: bookingRecord,
      reservationCode,
      checkoutUrl: session.url,
      stripeSessionId: session.id,
      holdExpiresAt,
      paymentAmount: bookingRecord.stripePaymentAmount,
      depositAmount: bookingRecord.depositAmount,
      depositPercent: bookingRecord.depositPercent,
      testPaymentAmount: bookingRecord.stripePaymentAmount,
      realTotal: Number(bookingRecord.total || 0),
    });
  } catch (error) {
    console.error("start-stripe-checkout failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to start Stripe checkout" });
  }
};
