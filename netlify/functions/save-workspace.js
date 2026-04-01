const {
  getUserFromContext,
  getWorkspaceById,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  const user = getUserFromContext(context);
  if (!user?.email) {
    return response(401, { error: "Not signed in" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid JSON body" });
  }

  const existing = await getWorkspaceById(payload.workspaceId);
  const ownerId = user.sub || user.email;
  if (existing && existing.ownerId !== ownerId) {
    return response(403, { error: "Forbidden" });
  }

  const workspace = normalizeWorkspace({
    ...(existing || {}),
    ...(payload.workspace || {}),
    ownerId,
    ownerEmail: user.email,
    id: payload.workspaceId || existing?.id || `workspace-${Date.now()}`,
  });

  const saved = await saveWorkspace(workspace);
  return response(200, { workspace: saved });
};
