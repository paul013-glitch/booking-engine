const {
  corsHeaders,
  getWorkspaceById,
  getWorkspaceBySlug,
  normalizeWorkspace,
  response,
  saveWorkspace,
} = require("./_shared");
const crypto = require("crypto");

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function localDateKey(dateInput) {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeysBetween(startDate, endDate) {
  const keys = [];
  const cursor = new Date(startDate);
  const endCursor = new Date(endDate);
  if (!(cursor < endCursor)) return keys;
  while (cursor < endCursor) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function isHoldActive(booking) {
  return booking.status === "held" && (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) > new Date());
}

function blocksInventory(booking) {
  if (!booking) return false;
  if (booking.status === "cancelled" || booking.status === "expired") return false;
  if (booking.status === "held") return isHoldActive(booking);
  return booking.status === "confirmed";
}

function overlappingBookings(workspace, roomId, startDate, endDate) {
  return (workspace.bookings || []).filter((booking) => {
    if (!bookingRoomAllocationCountForRoom(booking, roomId)) return false;
    if (!blocksInventory(booking)) return false;
    return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
  });
}

function roomAvailabilityRow(workspace, roomId, dateKey) {
  return workspace.camp?.availability?.[roomId]?.days?.[localDateKey(dateKey)] || null;
}

function roomOpenForCheckin(workspace, roomId, dateKey) {
  const row = roomAvailabilityRow(workspace, roomId, dateKey);
  if (!row) return false;
  return row.openForCheckin !== false;
}

function roomMinimumStay(workspace, roomId, dateKey) {
  return Math.max(1, Number(roomAvailabilityRow(workspace, roomId, dateKey)?.minStay ?? 1));
}

function bookedUnitsForDate(workspace, roomId, dateKey) {
  return (workspace.bookings || []).reduce((sum, booking) => {
    if (!bookingRoomAllocationCountForRoom(booking, roomId)) return sum;
    if (!blocksInventory(booking)) return sum;
    if (!rangesOverlap(dateKey, localDateKey(new Date(new Date(dateKey).getTime() + 24 * 60 * 60 * 1000)), booking.startDate, booking.endDate)) {
      return sum;
    }
    return sum + bookingRoomAllocationCountForRoom(booking, roomId);
  }, 0);
}

function availableUnits(workspace, roomId, startDate, endDate) {
  const room = (workspace.rooms || []).find((item) => item.id === roomId);
  if (!room) return 0;
  const dateKeys = dateKeysBetween(startDate, endDate);
  if (!dateKeys.length) return 0;
  return Math.min(
    ...dateKeys.map((dateKey) => {
      const row = roomAvailabilityRow(workspace, roomId, dateKey);
      if (!row) return 0;
      return Math.max(0, Number(row.units ?? room.totalUnits ?? 0) - bookedUnitsForDate(workspace, roomId, dateKey));
    }),
  );
}

function packageSummary(workspace, booking) {
  const packageQuantities = booking.packageQuantities || {};
  const packageRows = Object.entries(packageQuantities)
    .map(([packageId, quantity]) => {
      const pkg = (workspace.packages || []).find((item) => item.id === packageId);
      if (!pkg || !quantity) return null;
      return `${pkg.name} × ${quantity}`;
    })
    .filter(Boolean);

  if (packageRows.length) return packageRows.join(", ");
  const fallback = (workspace.packages || []).find((item) => item.id === booking.packageId);
  return `${fallback?.name || booking.packageId} × 1`;
}

function addonSummary(workspace, booking) {
  const addonIds = Array.isArray(booking.addonIds) ? booking.addonIds : [];
  const addonNames = addonIds
    .map((addonId) => (workspace.addons || []).find((item) => item.id === addonId)?.name)
    .filter(Boolean);
  return addonNames.length ? addonNames.join(", ") : "None";
}

function roomSummary(workspace, booking) {
  const allocations = bookingRoomAllocations(booking);
  if (allocations.length) {
    return allocations
      .map(([roomId, guestCount]) => {
        const room = (workspace.rooms || []).find((item) => item.id === roomId);
        return `${room?.name || roomId} x ${guestCount}`;
      })
      .join(", ");
  }
  const fallback = (workspace.rooms || []).find((item) => item.id === booking.roomId);
  return fallback ? `${fallback.name} x ${bookingGuestCount(booking)}` : booking.roomId;
}

function customerDetailsSummary(workspace, booking) {
  const details = booking.customerDetails || {};
  const fieldMap = new Map((workspace.camp?.customerFields || []).map((field) => [field.key, field]));
  const lines = [];
  const dateOfBirth = details.dateOfBirth || {};
  const dob = [dateOfBirth.day, dateOfBirth.month, dateOfBirth.year].filter(Boolean).join("/");

  if (dob) lines.push(`Date of birth: ${dob}`);

  const genders = Array.isArray(details.genders) && details.genders.length ? details.genders : guestGenderList(booking);
  if (genders.filter(Boolean).length) {
    lines.push(`Gender: ${genders.filter(Boolean).join(", ")}`);
  }

  Object.entries(details.customFields || {}).forEach(([key, value]) => {
    if (!String(value || "").trim()) return;
    const field = fieldMap.get(key);
    lines.push(`${field?.label || key}: ${value}`);
  });

  return lines;
}

function buildEmail({ workspace, booking }) {
  const fromName = process.env.RESEND_FROM_NAME || workspace.camp?.name || "Campify";
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO || fromEmail;
  const subject = `Booking confirmed at ${workspace.camp?.name || "your camp"} (${booking.reservationCode || ""})`;
  const text = [
    `Hello ${booking.guestName},`,
    "",
    `Your booking at ${workspace.camp?.name || "our camp"} is confirmed.`,
    `Check-in: ${formatDate(booking.startDate)}`,
    `Check-out: ${formatDate(booking.endDate)}`,
    `Package: ${packageSummary(workspace, booking)}`,
    `Room: ${roomSummary(workspace, booking)}`,
    `Add-ons: ${addonSummary(workspace, booking)}`,
    ...customerDetailsSummary(workspace, booking),
    `Total: ${formatMoney(booking.total)}`,
    "",
    `Guest name: ${booking.guestName}`,
    `Guest email: ${booking.guestEmail}`,
    `Guest phone: ${booking.guestPhone}`,
    `Country: ${booking.guestCountry}`,
    "",
    "Thanks for booking with us.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2f261d;">
      <h2 style="margin: 0 0 12px;">Booking confirmed</h2>
      <p>Hello ${booking.guestName},</p>
      <p>Your booking at <strong>${workspace.camp?.name || "our camp"}</strong> is confirmed.</p>
      <ul>
        <li><strong>Check-in:</strong> ${formatDate(booking.startDate)}</li>
        <li><strong>Check-out:</strong> ${formatDate(booking.endDate)}</li>
        <li><strong>Package:</strong> ${packageSummary(workspace, booking)}</li>
        <li><strong>Room:</strong> ${roomSummary(workspace, booking)}</li>
        <li><strong>Add-ons:</strong> ${addonSummary(workspace, booking)}</li>
        ${customerDetailsSummary(workspace, booking)
          .map((line) => `<li>${line}</li>`)
          .join("")}
        <li><strong>Total:</strong> ${formatMoney(booking.total)}</li>
      </ul>
      <p><strong>Guest name:</strong> ${booking.guestName}<br />
      <strong>Guest email:</strong> ${booking.guestEmail}<br />
      <strong>Guest phone:</strong> ${booking.guestPhone}<br />
      <strong>Country:</strong> ${booking.guestCountry}</p>
      <p>Thanks for booking with us.</p>
    </div>
  `;

  return { fromName, fromEmail, replyTo, subject, text, html };
}

function generateReservationCode(existing = []) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(5);
    const code = Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join("")
      .slice(0, 5);
    if (!existing.includes(code)) {
      return code;
    }
  }
  return `R${Date.now().toString(36).slice(-4).toUpperCase()}`.slice(0, 5);
}

function formatDateParts(dateInput) {
  const date = new Date(dateInput);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

function bookingGuestCount(booking = {}) {
  if (booking.packageQuantities && typeof booking.packageQuantities === "object") {
    const total = Object.values(booking.packageQuantities).reduce((sum, quantity) => sum + Math.max(0, Number(quantity) || 0), 0);
    if (total > 0) return total;
  }
  return Math.max(1, Number(booking.packagePeople || 1));
}

function bookingRoomAllocations(booking = {}) {
  if (booking.roomAllocations && typeof booking.roomAllocations === "object") {
    return Object.entries(booking.roomAllocations)
      .map(([roomId, guestCount]) => [roomId, Math.max(0, Number(guestCount) || 0)])
      .filter(([, guestCount]) => guestCount > 0);
  }

  if (booking.roomId) {
    return [[booking.roomId, bookingGuestCount(booking)]];
  }

  return [];
}

function bookingRoomAllocationCountForRoom(booking = {}, roomId = "") {
  return bookingRoomAllocations(booking).find(([entryRoomId]) => entryRoomId === roomId)?.[1] || 0;
}

function guestGenderList(booking = {}) {
  const count = bookingGuestCount(booking);
  const values = Array.isArray(booking.guestGenders) && booking.guestGenders.length
    ? booking.guestGenders
    : booking.guestGender
      ? [booking.guestGender]
      : [];
  return Array.from({ length: count }, (_, index) => String(values[index] || "").trim());
}

async function loadPersistedBookingWorkspace(workspaceId, bookingId, reservationCode) {
  if (!workspaceId) return null;
  const persisted = await getWorkspaceById(workspaceId);
  if (!persisted) return null;
  const persistedBooking = (persisted.bookings || []).find(
    (item) => item.id === bookingId || item.reservationCode === reservationCode,
  );
  if (!persistedBooking) return null;
  return persisted;
}

async function sendConfirmationEmail({ workspace, booking }) {
  const { fromEmail, replyTo, subject, text, html, fromName } = buildEmail({ workspace, booking });
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !fromEmail || !booking.guestEmail) {
    return {
      status: "skipped",
      reason: !booking.guestEmail ? "Guest email missing" : "Email provider not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [booking.guestEmail],
      reply_to: replyTo || fromEmail,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Email request failed (${response.status})`);
  }

  return {
    status: "sent",
    provider: "resend",
    id: data?.id || null,
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders(),
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    const slug = payload.workspaceSlug || payload.slug;
    if (!slug) {
      return response(400, { error: "Missing workspace slug" });
    }

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return response(404, { error: "Workspace not found" });
    }

    const normalized = normalizeWorkspace(workspace);
    const booking = payload.booking || {};
    const required = [
      "guestName",
      "guestEmail",
      "guestPhone",
      "guestCountry",
      "guestBirthDay",
      "guestBirthMonth",
      "guestBirthYear",
      "packageId",
      "roomId",
      "startDate",
      "endDate",
    ];
    const missing = required.filter((key) => !String(booking[key] || "").trim());
    if (missing.length) {
      return response(400, { error: `Missing booking fields: ${missing.join(", ")}` });
    }

    const roomAllocations = bookingRoomAllocations(booking);
    if (!roomAllocations.length) {
      return response(400, { error: "Missing room allocation." });
    }

    const stayNights = dateKeysBetween(booking.startDate, booking.endDate).length;
    if (stayNights <= 0) {
      return response(400, { error: "Check-out date must be after check-in date." });
    }

    const roomAllocationTotal = roomAllocations.reduce((sum, [, guestCount]) => sum + guestCount, 0);
    if (roomAllocationTotal !== bookingGuestCount(booking)) {
      return response(400, { error: "Room allocations must match the guest count." });
    }

    for (const [roomId, guestCount] of roomAllocations) {
      if (!roomOpenForCheckin(normalized, roomId, booking.startDate)) {
        return response(409, { error: `Room type ${roomId} is closed for check-in on this date.` });
      }
      if (stayNights < roomMinimumStay(normalized, roomId, booking.startDate)) {
        return response(409, { error: `Room type ${roomId} requires a longer minimum stay for this check-in date.` });
      }
      if (availableUnits(normalized, roomId, booking.startDate, booking.endDate) < guestCount) {
        return response(409, { error: `Room type ${roomId} is no longer available for these dates.` });
      }
    }

    const now = new Date();
    const existingCodes = [
      ...(normalized.bookings || []).map((item) => item.reservationCode).filter(Boolean),
      ...(normalized.bookingIntents || []).map((item) => item.reservationCode).filter(Boolean),
    ];
    const reservationCode = generateReservationCode(existingCodes);
    const intentId = booking.id || `intent-${now.getTime()}`;
    const bookingId = `booking-${now.getTime()}`;

    const intentRecord = {
      ...booking,
      id: intentId,
      reservationCode,
      reservationId: reservationCode,
      stage: "confirmed",
      createdAt: booking.createdAt || now.toISOString(),
      bookingDateTime: booking.createdAt || now.toISOString(),
      bookingDay: formatDateParts(booking.createdAt || now.toISOString()).day,
      bookingMonth: formatDateParts(booking.createdAt || now.toISOString()).month,
      bookingYear: formatDateParts(booking.createdAt || now.toISOString()).year,
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      guestCount: bookingGuestCount(booking),
      guestGenders: guestGenderList(booking),
      updatedAt: now.toISOString(),
    };

    const bookingRecord = {
      ...booking,
      id: bookingId,
      reservationCode,
      reservationId: reservationCode,
      status: "confirmed",
      createdAt: booking.createdAt || now.toISOString(),
      bookingDateTime: booking.createdAt || now.toISOString(),
      bookingDay: formatDateParts(booking.createdAt || now.toISOString()).day,
      bookingMonth: formatDateParts(booking.createdAt || now.toISOString()).month,
      bookingYear: formatDateParts(booking.createdAt || now.toISOString()).year,
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      guestCount: bookingGuestCount(booking),
      guestGenders: guestGenderList(booking),
      roomAllocations: roomAllocations.reduce((acc, [roomId, guestCount]) => {
        acc[roomId] = guestCount;
        return acc;
      }, {}),
      holdExpiresAt: null,
      notes: booking.notes || "Confirmed booking.",
      source: "demo-checkout",
      confirmationEmail: { status: "pending" },
    };

    normalized.bookingIntents = [intentRecord, ...(normalized.bookingIntents || []).filter((item) => item.id !== intentRecord.id)];
    normalized.bookings = [bookingRecord, ...(normalized.bookings || []).filter((item) => item.id !== bookingRecord.id)];

    const saved = await saveWorkspace(normalized);
    const persistedAfterBookingSave = await loadPersistedBookingWorkspace(saved.id, bookingId, reservationCode);
    if (!persistedAfterBookingSave) {
      console.error("confirm-booking verification failed after primary save", {
        workspaceId: saved.id,
        reservationCode,
        bookingId,
      });
      return response(500, {
        error: "The booking could not be verified after saving. Please refresh the reservations overview before retrying.",
      });
    }

    let email = { status: "skipped", reason: "Email provider not configured" };
    try {
      email = await sendConfirmationEmail({ workspace: persistedAfterBookingSave, booking: bookingRecord });
    } catch (error) {
      email = {
        status: "error",
        reason: error instanceof Error ? error.message : "Failed to send email",
      };
    }

    persistedAfterBookingSave.bookings = (persistedAfterBookingSave.bookings || []).map((item) =>
      item.id === bookingId ? { ...item, confirmationEmail: email } : item,
    );
    persistedAfterBookingSave.bookingIntents = (persistedAfterBookingSave.bookingIntents || []).map((item) =>
      item.id === intentId ? { ...item, confirmationEmail: email } : item,
    );

    let finalWorkspace = persistedAfterBookingSave;
    try {
      await saveWorkspace(persistedAfterBookingSave);
      const verifiedFinalWorkspace = await loadPersistedBookingWorkspace(persistedAfterBookingSave.id, bookingId, reservationCode);
      if (verifiedFinalWorkspace) {
        finalWorkspace = verifiedFinalWorkspace;
      }
    } catch (persistError) {
      console.warn("confirm-booking final save failed", persistError);
    }

    const verifiedBooking =
      (finalWorkspace.bookings || []).find((item) => item.id === bookingId || item.reservationCode === reservationCode) || null;
    if (!verifiedBooking) {
      console.error("confirm-booking verification failed before response", {
        workspaceId: finalWorkspace.id,
        reservationCode,
        bookingId,
      });
      return response(500, {
        error: "The booking could not be verified after saving. Please refresh the reservations overview before retrying.",
      });
    }

    return response(200, {
      workspace: finalWorkspace,
      booking: verifiedBooking,
      reservationCode,
      workspaceId: finalWorkspace.id,
      workspaceSlug: finalWorkspace.camp?.slug || slug,
      email,
    });
  } catch (error) {
    console.error("confirm-booking failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to confirm booking" });
  }
};
