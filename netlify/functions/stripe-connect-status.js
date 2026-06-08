const {
  corsHeaders,
  getUserFromContext,
  getWorkspaceById,
  isPlatformOwnerUser,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");

async function stripeAccount(accountId) {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY in Netlify environment variables.");
  }
  const stripeResponse = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    throw new Error(data?.error?.message || `Stripe account lookup failed (${stripeResponse.status})`);
  }
  return data;
}

function canManageWorkspace(user, workspace) {
  const ownerId = user?.sub || user?.email || "";
  return !!workspace && (workspace.ownerId === ownerId || isPlatformOwnerUser(user));
}

function stripeStatusFromAccount(account = {}) {
  return {
    accountId: account.id || "",
    status: account.charges_enabled ? "connected" : account.details_submitted ? "pending" : "pending",
    chargesEnabled: !!account.charges_enabled,
    payoutsEnabled: !!account.payouts_enabled,
    detailsSubmitted: !!account.details_submitted,
    country: account.country || "",
    defaultCurrency: String(account.default_currency || "").toUpperCase(),
    livemode: !!account.livemode,
    lastSyncAt: new Date().toISOString(),
  };
}

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const user = getUserFromContext(context);
    if (!user?.email) {
      return response(401, { error: "Not signed in" });
    }

    const payload = JSON.parse(event.body || "{}");
    const existing = await getWorkspaceById(payload.workspaceId);
    if (!existing) {
      return response(404, { error: "Workspace not found" });
    }
    const workspace = normalizeWorkspace(existing);
    if (!canManageWorkspace(user, workspace)) {
      return response(403, { error: "Forbidden" });
    }

    const accountId = workspace.camp?.stripe?.accountId || "";
    if (!accountId) {
      return response(200, { workspace, stripe: workspace.camp?.stripe || {} });
    }

    const account = await stripeAccount(accountId);
    workspace.camp.stripe = {
      ...(workspace.camp.stripe || {}),
      ...stripeStatusFromAccount(account),
    };
    const saved = await saveWorkspace(workspace);
    return response(200, { workspace: saved, stripe: saved.camp.stripe });
  } catch (error) {
    console.error("stripe-connect-status failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to refresh Stripe status" });
  }
};
