const { getWorkspaceBySlug, workspaceResponse } = require("./_shared");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const slug = event.queryStringParameters?.slug;
    if (!slug) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing slug" }),
      };
    }

    const workspace = await getWorkspaceBySlug(slug);
    return workspaceResponse(workspace);
  } catch (error) {
    console.error("public-workspace failed", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Failed to load workspace" }),
    };
  }
};
