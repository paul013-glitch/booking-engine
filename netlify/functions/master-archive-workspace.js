const {
  archiveWorkspaceById,
  getUserFromContext,
  isPlatformOwnerUser,
  response,
} = require("./_shared");

exports.handler = async (event, context) => {
  try {
    const user = getUserFromContext(context);
    if (!user?.email || !isPlatformOwnerUser(user)) {
      return response(403, { error: "Forbidden" });
    }

    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const workspaceId = String(body.workspaceId || "").trim();
    if (!workspaceId) {
      return response(400, { error: "workspaceId is required" });
    }

    const archivedAt = new Date().toISOString();
    const workspace = await archiveWorkspaceById(workspaceId, archivedAt);
    if (!workspace) {
      return response(404, { error: "Workspace not found" });
    }

    return response(200, { success: true, workspace });
  } catch (error) {
    console.error("master-archive-workspace failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to archive workspace" });
  }
};
