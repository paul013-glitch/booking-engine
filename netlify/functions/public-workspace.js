const { getWorkspaceBySlug, workspaceResponse } = require("./_shared");

exports.handler = async (event) => {
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
};
