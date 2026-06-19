const {
  corsHeaders,
  expireExpiredHolds,
  getWorkspaceBySlug,
  publicWorkspacePayload,
  response,
  saveWorkspace,
  workspaceResponse,
} = require("./_shared");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders(),
        body: "",
      };
    }

    if (event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed" });
    }

    const slug = event.queryStringParameters?.slug;
    if (!slug) {
      return response(400, { error: "Missing slug" });
    }

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) return workspaceResponse(workspace);
    const expired = expireExpiredHolds(workspace);
    const nextWorkspace = expired.changed ? await saveWorkspace(expired.workspace) : expired.workspace;
    return response(200, publicWorkspacePayload(nextWorkspace), {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      "Netlify-CDN-Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    });
  } catch (error) {
    console.error("public-workspace failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to load workspace" });
  }
};
