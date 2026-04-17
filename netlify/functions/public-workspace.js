const { corsHeaders, getWorkspaceBySlug, response, workspaceResponse } = require("./_shared");

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
    return workspaceResponse(workspace);
  } catch (error) {
    console.error("public-workspace failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to load workspace" });
  }
};
