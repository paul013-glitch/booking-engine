const {
  createDefaultWorkspace,
  expireExpiredHolds,
  getUserFromContext,
  getWorkspaceForIdentity,
  saveWorkspace,
  response,
} = require("./_shared");

exports.handler = async (_event, context) => {
  try {
    const user = getUserFromContext(context);
    if (!user?.email) {
      return response(401, { error: "Not signed in" });
    }

    const ownerId = user.sub || user.email;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const identityMatch = await getWorkspaceForIdentity({ ownerId, email: user.email });
      if (identityMatch) {
        const expired = expireExpiredHolds(identityMatch);
        const nextWorkspace = expired.changed ? await saveWorkspace(expired.workspace) : expired.workspace;
        return response(200, nextWorkspace);
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const created = await saveWorkspace(
      createDefaultWorkspace({
        ownerId,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split("@")[0] || "New Surf Camp",
      }),
    );

    return response(200, created);
  } catch (error) {
    console.error("me-workspace failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to load workspace" });
  }
};
