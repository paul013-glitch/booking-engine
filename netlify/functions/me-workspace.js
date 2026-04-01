const {
  createDefaultWorkspace,
  getUserFromContext,
  getWorkspaceForOwner,
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
    const existing = await getWorkspaceForOwner(ownerId);
    if (existing) {
      return response(200, existing);
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
