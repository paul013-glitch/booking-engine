const {
  corsHeaders,
  getUserFromContext,
  getWorkspaceById,
  isPlatformOwnerUser,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || "";
}

async function stripeRequest(path, options = {}) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY in Netlify environment variables.");
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.headers || {}),
    },
  });
  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    throw new Error(data?.error?.message || `Stripe request failed (${stripeResponse.status})`);
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

function absoluteUrl(value, fallbackOrigin = "") {
  try {
    return new URL(value).toString();
  } catch {
    return new URL(value || "/admin.html", fallbackOrigin || "http://localhost").toString();
  }
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

    let accountId = workspace.camp?.stripe?.accountId || "";
    let account = null;
    if (accountId) {
      account = await stripeRequest(`accounts/${encodeURIComponent(accountId)}`, { method: "GET" });
    } else {
      const params = new URLSearchParams();
      params.set("type", "standard");
      params.set("email", user.email);
      params.set("metadata[workspaceId]", workspace.id);
      params.set("metadata[workspaceSlug]", workspace.camp?.slug || "");
      params.set("metadata[campName]", workspace.camp?.name || "");
      account = await stripeRequest("accounts", {
        method: "POST",
        body: params.toString(),
      });
      accountId = account.id;
    }

    const origin = event.headers?.origin || event.headers?.Origin || payload.siteUrl || "";
    const returnUrl = absoluteUrl(payload.returnUrl || `/admin.html?stripe=connected&workspaceId=${encodeURIComponent(workspace.id)}`, origin);
    const refreshUrl = absoluteUrl(payload.refreshUrl || `/admin.html?stripe=refresh&workspaceId=${encodeURIComponent(workspace.id)}`, origin);
    const linkParams = new URLSearchParams();
    linkParams.set("account", accountId);
    linkParams.set("refresh_url", refreshUrl);
    linkParams.set("return_url", returnUrl);
    linkParams.set("type", "account_onboarding");
    const accountLink = await stripeRequest("account_links", {
      method: "POST",
      body: linkParams.toString(),
    });

    workspace.camp.stripe = {
      ...(workspace.camp.stripe || {}),
      ...stripeStatusFromAccount(account),
      connectedAt: workspace.camp.stripe?.connectedAt || new Date().toISOString(),
    };
    const saved = await saveWorkspace(workspace);

    return response(200, {
      workspace: saved,
      onboardingUrl: accountLink.url,
      stripe: saved.camp.stripe,
    });
  } catch (error) {
    console.error("stripe-connect-start failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to start Stripe Connect" });
  }
};
