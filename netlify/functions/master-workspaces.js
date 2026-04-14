const {
  getUserFromContext,
  isPlatformOwnerUser,
  listWorkspaces,
  response,
} = require("./_shared");

function daysRemaining(dateInput) {
  if (!dateInput) return null;
  const diff = new Date(dateInput).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function billingSummary(workspace) {
  const billing = workspace?.camp?.billing || {};
  const dueAt = billing.status === "active" && billing.paidThroughAt ? billing.paidThroughAt : billing.gracePeriodEndsAt || billing.trialEndsAt;
  return {
    status: billing.status || "trialing",
    plan: billing.plan || "trial",
    monthlyPrice: Number(billing.monthlyPrice || 99),
    currency: billing.currency || "EUR",
    dueAt: dueAt || "",
    daysLeft: dueAt ? daysRemaining(dueAt) : null,
  };
}

exports.handler = async (_event, context) => {
  try {
    const user = getUserFromContext(context);
    if (!user?.email || !isPlatformOwnerUser(user)) {
      return response(403, { error: "Forbidden" });
    }

    const workspaces = await listWorkspaces();
    const summaries = workspaces
      .map((workspace) => {
        const billing = billingSummary(workspace);
        return {
          id: workspace.id,
          ownerId: workspace.ownerId,
          ownerEmail: workspace.ownerEmail || "",
          campName: workspace.camp?.name || "Unnamed camp",
          slug: workspace.camp?.slug || "",
          bookingUrl: `/book/${workspace.camp?.slug || ""}`,
          adminUrl: `/admin.html?tenant=${encodeURIComponent(workspace.id)}`,
          updatedAt: workspace.updatedAt || "",
          createdAt: workspace.createdAt || "",
          billing,
        };
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    return response(200, { workspaces: summaries });
  } catch (error) {
    console.error("master-workspaces failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to load workspaces" });
  }
};
