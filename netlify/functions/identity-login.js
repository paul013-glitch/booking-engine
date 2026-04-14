const { isPlatformOwnerUser } = require("./_shared");

exports.handler = async (event) => {
  let userPayload = {};
  try {
    const body = JSON.parse(event.body || "{}");
    userPayload = body.user || body.payload?.user || {};
  } catch {
    userPayload = {};
  }

  const email = userPayload.email || "";

  const roles = Array.from(new Set([...(userPayload.app_metadata?.roles || []), "camp-owner"]));
  if (isPlatformOwnerUser(userPayload)) {
    roles.push("platform-owner");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...userPayload,
      app_metadata: {
        ...(userPayload.app_metadata || {}),
        roles: Array.from(new Set(roles)),
      },
    }),
  };
};
