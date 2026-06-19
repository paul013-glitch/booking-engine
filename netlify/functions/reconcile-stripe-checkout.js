const {
  corsHeaders,
  getWorkspaceById,
  publicWorkspacePayload,
  response,
  saveWorkspace,
} = require("./_shared");

function stripeDirectModeEnabled() {
  return String(process.env.STRIPE_DIRECT_MODE || "").toLowerCase() === "true";
}

async function stripeCheckoutSession(sessionId, stripeAccountId = "") {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY in Netlify environment variables.");
  }

  const headers = { Authorization: `Bearer ${secretKey}` };
  if (stripeAccountId && !stripeDirectModeEnabled()) {
    headers["Stripe-Account"] = stripeAccountId;
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers,
  });
  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    throw new Error(data?.error?.message || `Stripe checkout lookup failed (${stripeResponse.status})`);
  }
  return data;
}

function paymentLogWithCompletedSession(booking = {}, session = {}, now = new Date().toISOString()) {
  const currency = String(session.currency || booking.paymentCurrency || "eur").toUpperCase();
  const amount = Number(session.amount_total || 0) / 100;
  const existingLog = Array.isArray(booking.paymentLog) ? booking.paymentLog : [];
  const sessionId = session.id || booking.stripeCheckoutSessionId || "";
  let updatedExisting = false;
  const nextLog = existingLog.map((entry) => {
    if (entry.stripeCheckoutSessionId !== sessionId) return entry;
    updatedExisting = true;
    return {
      ...entry,
      type: entry.type === "checkout_session_created" ? "deposit_payment" : entry.type || "payment",
      status: "succeeded",
      amount: Number(entry.amount || amount),
      currency: entry.currency || currency,
      paidAt: entry.paidAt || now,
      stripePaymentIntentId: session.payment_intent || entry.stripePaymentIntentId || "",
      note: entry.note || "Stripe checkout payment completed.",
    };
  });

  if (!updatedExisting) {
    nextLog.push({
      id: `payment-log-${Date.now()}`,
      type: "deposit_payment",
      status: "succeeded",
      amount,
      currency,
      at: now,
      paidAt: now,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: session.payment_intent || "",
      stripeAccountId: booking.stripeAccountId || "",
      note: "Stripe checkout payment completed.",
    });
  }

  return nextLog;
}

function paidTotalFromLog(paymentLog = []) {
  return paymentLog.reduce((sum, entry) => {
    const amount = Number(entry.amount || 0);
    if (!Number.isFinite(amount)) return sum;
    if (entry.status !== "succeeded") return sum;
    if (entry.type === "refund" || entry.type === "credit") return sum - Math.abs(amount);
    return sum + amount;
  }, 0);
}

function bookingMatchesSession(booking = {}, session = {}, reservationCode = "") {
  const metadata = session.metadata || {};
  return (
    booking.stripeCheckoutSessionId === session.id ||
    booking.id === metadata.bookingId ||
    booking.reservationCode === metadata.reservationCode ||
    booking.reservationCode === reservationCode
  );
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
    const workspaceId = String(payload.workspaceId || payload.workspace || "").trim();
    let sessionId = String(payload.sessionId || payload.session_id || "").trim();
    const reservationCode = String(payload.reservationCode || payload.reservation || "").trim();
    if (!workspaceId) {
      return response(400, { error: "Missing workspace." });
    }

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return response(404, { error: "Workspace not found." });
    }

    const preflightBooking = (workspace.bookings || []).find(
      (booking) => booking.stripeCheckoutSessionId === sessionId || booking.reservationCode === reservationCode,
    );
    if (!sessionId) {
      sessionId = preflightBooking?.stripeCheckoutSessionId || "";
    }
    if (!sessionId) {
      return response(400, { error: "Missing Stripe session id." });
    }
    const session = await stripeCheckoutSession(sessionId, preflightBooking?.stripeAccountId || workspace.camp?.stripe?.accountId || "");
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return response(409, { error: "Stripe checkout is not paid yet.", sessionStatus: session.status, paymentStatus: session.payment_status });
    }

    const now = new Date().toISOString();
    let confirmedBooking = null;
    workspace.bookings = (workspace.bookings || []).map((booking) => {
      if (!bookingMatchesSession(booking, session, reservationCode)) return booking;
      const paymentLog = paymentLogWithCompletedSession(booking, session, now);
      const totalAmount = Number(booking.total || 0);
      const amountPaid = Math.max(0, paidTotalFromLog(paymentLog));
      const amountDue = Math.max(0, totalAmount - amountPaid);
      confirmedBooking = {
        ...booking,
        status: "confirmed",
        paymentStatus: amountDue > 0 ? "deposit_paid" : "paid",
        amountPaid,
        amountDue,
        paymentLog,
        paidAt: booking.paidAt || now,
        confirmedAt: booking.confirmedAt || now,
        holdExpiresAt: null,
        stripeCheckoutSessionId: session.id || booking.stripeCheckoutSessionId || "",
        stripePaymentIntentId: session.payment_intent || booking.stripePaymentIntentId || "",
        stripePaymentAmount: Number(session.amount_total || 0) / 100,
        stripePaymentCurrency: String(session.currency || "eur").toUpperCase(),
        notes: booking.notes || "Paid via Stripe checkout.",
      };
      return confirmedBooking;
    });

    if (!confirmedBooking) {
      return response(404, { error: "Booking not found for this Stripe session." });
    }

    workspace.bookingIntents = (workspace.bookingIntents || []).map((intent) => {
      if (intent.bookingId !== confirmedBooking.id && intent.reservationCode !== confirmedBooking.reservationCode) return intent;
      return {
        ...intent,
        stage: "confirmed",
        status: "confirmed",
        paymentStatus: confirmedBooking.paymentStatus,
        amountPaid: confirmedBooking.amountPaid,
        amountDue: confirmedBooking.amountDue,
        paymentLog: confirmedBooking.paymentLog,
        paidAt: confirmedBooking.paidAt,
        updatedAt: now,
      };
    });

    const saved = await saveWorkspace(workspace);
    return response(200, {
      workspace: publicWorkspacePayload(saved),
      workspaceId: saved.id,
      reservationCode: confirmedBooking.reservationCode,
      booking: confirmedBooking,
    });
  } catch (error) {
    console.error("reconcile-stripe-checkout failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to reconcile Stripe checkout" });
  }
};
