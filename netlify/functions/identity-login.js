const { createDefaultWorkspace, saveWorkspace } = require("./_shared");

exports.handler = async (event) => {
  let userPayload = {};
  try {
    const body = JSON.parse(event.body || "{}");
    userPayload = body.user || body.payload?.user || {};
  } catch {
    userPayload = {};
  }

  const email = userPayload.email || "";
  const ownerId = userPayload.sub || email || `identity-${Date.now()}`;

  try {
    await saveWorkspace(
      createDefaultWorkspace({
        ownerId,
        email,
        name: userPayload.user_metadata?.full_name || email.split("@")[0] || "New Surf Camp",
      }),
    );
  } catch {
    // Never block login because workspace creation failed.
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...userPayload,
      app_metadata: {
        ...(userPayload.app_metadata || {}),
        roles: Array.from(new Set([...(userPayload.app_metadata?.roles || []), "camp-owner"])),
      },
    }),
  };
};
