const {
  getUserFromContext,
  getWorkspaceForOwner,
  response,
  saveWorkspace,
} = require("./_shared");

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const user = getUserFromContext(context);
    if (!user?.email) {
      return response(401, { error: "Not signed in" });
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    if (!payload.bookingId) {
      return response(400, { error: "Missing bookingId" });
    }

    const ownerCandidates = [user.sub, user.email].filter(Boolean);
    let workspace = null;
    for (const ownerId of ownerCandidates) {
      workspace = await getWorkspaceForOwner(ownerId);
      if (workspace) break;
    }
    if (!workspace) {
      return response(404, { error: "Workspace not found" });
    }

    const now = new Date().toISOString();
    const targetStatus = payload.targetStatus === "confirmed" ? "confirmed" : "cancelled";
    let found = false;

    workspace.bookings = (workspace.bookings || []).map((booking) => {
      if (booking.id !== payload.bookingId) return booking;
      found = true;
      if (targetStatus === "confirmed") {
        const { cancelledAt, ...rest } = booking;
        return {
          ...rest,
          status: "confirmed",
          confirmedAt: booking.confirmedAt || now,
          holdExpiresAt: null,
        };
      }

      return {
        ...booking,
        status: "cancelled",
        cancelledAt: now,
        holdExpiresAt: null,
      };
    });

    if (!found) {
      return response(404, { error: "Booking not found" });
    }

    workspace.bookingIntents = (workspace.bookingIntents || []).map((intent) => {
      if (intent.id !== payload.bookingId && intent.reservationCode !== payload.reservationCode) {
        return intent;
      }

      return {
        ...intent,
        stage: targetStatus === "confirmed" ? "confirmed" : "cancelled",
        updatedAt: now,
      };
    });

    const saved = await saveWorkspace(workspace);
    return response(200, { workspace: saved, updatedAt: now, status: targetStatus });
  } catch (error) {
    console.error("cancel-booking failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to cancel booking" });
  }
};
