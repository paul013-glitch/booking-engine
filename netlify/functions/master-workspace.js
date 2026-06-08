const {
  expireExpiredHolds,
  getUserFromContext,
  getWorkspaceById,
  getWorkspaceBySlug,
  isPlatformOwnerUser,
  response,
  saveWorkspace,
  workspaceResponse,
} = require("./_shared");

exports.handler = async (event, context) => {
  try {
    const user = getUserFromContext(context);
    if (!user?.email || !isPlatformOwnerUser(user)) {
      return response(403, { error: "Forbidden" });
    }

    const params = new URLSearchParams(event.queryStringParameters || {});
    const workspaceId = params.get("workspaceId") || params.get("id") || "";
    const slug = params.get("slug") || "";
    const workspace = workspaceId ? await getWorkspaceById(workspaceId) : slug ? await getWorkspaceBySlug(slug) : null;
    if (!workspace) return workspaceResponse(workspace);
    const expired = expireExpiredHolds(workspace);
    const nextWorkspace = expired.changed ? await saveWorkspace(expired.workspace) : expired.workspace;
    return workspaceResponse(nextWorkspace);
  } catch (error) {
    console.error("master-workspace failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to load workspace" });
  }
};
