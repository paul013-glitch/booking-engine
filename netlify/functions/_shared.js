const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const WORKSPACES_STORE = "surfcamp-workspaces";
const SLUGS_STORE = "surfcamp-workspace-slugs";
const OWNERS_STORE = "surfcamp-workspace-owners";

const seedCamp = {
  name: "Amigos Surf Camp",
  slug: "amigos-surf-camp",
  logoUrl:
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" rx="36" fill="#efe2cf"/>
        <circle cx="100" cy="100" r="64" fill="none" stroke="#8a6d49" stroke-width="8"/>
        <path d="M52 114c16-18 32-27 48-27s32 9 48 27" fill="none" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
        <path d="M62 88c10-10 21-15 38-15s28 5 38 15" fill="none" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
        <path d="M100 56v88" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `),
  bookingRules: {
    restrictedArrivalDays: true,
    allowedArrivalDays: ["Saturday"],
    availabilityLowThreshold: 5,
    availabilityMidThreshold: 15,
    availabilityCountVisibilityThreshold: null,
  },
  showBookingIntents: true,
  theme: {
    bg: "#f4ecdf",
    panel: "#fffaf1",
    panelSoft: "#f8f1e4",
    border: "#ded2c1",
    text: "#2f261d",
    muted: "#6f6255",
    accent: "#8a6d49",
    accentSoft: "#efe2cf",
    titleFont: 'Georgia, "Times New Roman", serif',
    bodyFont: "Arial, Helvetica, sans-serif",
  },
};

const seedPackages = [
  {
    id: "package-7",
    name: "7 nights - essentials",
    nights: 7,
    basePrice: 899,
    description: "Breakfast, surf coaching, boards, and daily surf guiding.",
  },
  {
    id: "package-7-surf",
    name: "7 nights - surf & stay",
    nights: 7,
    basePrice: 1100,
    description: "Breakfast, surf coaching, boards, and daily surf guiding.",
  },
];

const seedRooms = [
  {
    id: "shared-double",
    name: "Shared Double",
    description: "Shared dorm room type for two guests.",
    pricePerNight: 95,
    totalUnits: 4,
    capacity: 2,
    learnMoreUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "shared-dorm-4bed",
    name: "Shared Dorm (4 guest)",
    description: "Shared dorm room type for four guests.",
    pricePerNight: 75,
    totalUnits: 4,
    capacity: 4,
    learnMoreUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
  },
];

const seedAddons = [
  {
    id: "airport-transfer",
    name: "Airport transfer",
    description: "One-way transfer from the airport to the camp.",
    price: 45,
    unitLabel: "per stay",
  },
  {
    id: "board-rental",
    name: "Extra board rental",
    description: "Reserve an extra surfboard for the stay.",
    price: 80,
    unitLabel: "per stay",
  },
  {
    id: "yoga-pack",
    name: "Daily yoga",
    description: "Morning yoga session added to the booking.",
    price: 120,
    unitLabel: "per stay",
  },
];

function startOfWeek(dateInput) {
  const date = new Date(dateInput);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function localDateKey(dateInput) {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekKeyForDate(dateInput) {
  return localDateKey(startOfWeek(dateInput));
}

function createDefaultAvailability(rooms, weeks = 12) {
  const availability = {};
  const weekStart = startOfWeek(new Date());

  rooms.forEach((room) => {
    availability[room.id] = { weeks: {} };
    for (let i = 0; i < weeks; i += 1) {
      const cursor = new Date(weekStart);
      cursor.setDate(cursor.getDate() + i * 7);
      const key = localDateKey(cursor);
      availability[room.id].weeks[key] = {
        units: room.totalUnits,
        pricePerNight: room.pricePerNight,
      };
    }
  });

  return availability;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function randomSlug(prefix = "camp") {
  const seed = slugify(prefix) || "camp";
  return `${seed}-${crypto.randomBytes(3).toString("hex")}`;
}

function createDefaultWorkspace(input = {}) {
  const name = input.name || input.campName || "New Surf Camp";
  return {
    id: `workspace-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerId: input.ownerId || input.email || "unknown",
    ownerEmail: input.email || "",
    camp: {
      name,
      slug: input.slug || randomSlug("camp"),
      logoUrl: seedCamp.logoUrl,
      bookingRules: { ...seedCamp.bookingRules },
      availability: createDefaultAvailability(seedRooms),
    },
    selectedPackageId: "package-7",
    packageQuantities: { "package-7": 1 },
    selectedRoomId: "shared-double",
    selectedAddonIds: [],
    startDate: input.startDate || "",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    guestCountry: "",
    notes: "",
    leads: [],
    bookingIntents: [],
    packages: structuredClone(seedPackages),
    rooms: structuredClone(seedRooms),
    addons: structuredClone(seedAddons),
    bookings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeWorkspace(data = {}) {
  const base = createDefaultWorkspace({
    name: data?.camp?.name || data?.name,
    email: data?.ownerEmail || data?.email,
    ownerId: data?.ownerId,
    slug: data?.camp?.slug || data?.slug,
    startDate: data?.startDate,
  });
  const rooms = Array.isArray(data.rooms) ? data.rooms : base.rooms;

  return {
    ...base,
    ...data,
    camp: {
      ...base.camp,
      ...(data.camp || {}),
      showBookingIntents:
        typeof (data.camp && data.camp.showBookingIntents) === "boolean"
          ? data.camp.showBookingIntents
          : base.camp.showBookingIntents,
      theme: {
        ...base.camp.theme,
        ...((data.camp && data.camp.theme) || {}),
      },
      bookingRules: {
        ...base.camp.bookingRules,
        ...((data.camp && data.camp.bookingRules) || {}),
        availabilityLowThreshold: Number.isFinite(Number(data?.camp?.bookingRules?.availabilityLowThreshold))
          ? Math.max(1, Number(data.camp.bookingRules.availabilityLowThreshold))
          : base.camp.bookingRules.availabilityLowThreshold,
        availabilityMidThreshold: Number.isFinite(Number(data?.camp?.bookingRules?.availabilityMidThreshold))
          ? Math.max(
              Math.max(
                1,
                Number(data?.camp?.bookingRules?.availabilityLowThreshold ?? base.camp.bookingRules.availabilityLowThreshold),
              ),
              Number(data.camp.bookingRules.availabilityMidThreshold),
            )
          : base.camp.bookingRules.availabilityMidThreshold,
        availabilityCountVisibilityThreshold:
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === "" ||
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === null ||
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === undefined
            ? null
            : Math.max(0, Number(data.camp.bookingRules.availabilityCountVisibilityThreshold)),
      },
      availability: {
        ...(base.camp.availability || {}),
        ...((data.camp && data.camp.availability) || {}),
      },
      slug: (data.camp && data.camp.slug) || data.slug || base.camp.slug,
    },
    packages: Array.isArray(data.packages) ? data.packages : base.packages,
    rooms: structuredClone(rooms),
    addons: Array.isArray(data.addons) ? data.addons : base.addons,
    bookings: Array.isArray(data.bookings) ? data.bookings : base.bookings,
    leads: Array.isArray(data.leads) ? data.leads : [],
    bookingIntents: Array.isArray(data.bookingIntents) ? data.bookingIntents : [],
    selectedAddonIds: Array.isArray(data.selectedAddonIds)
      ? data.selectedAddonIds.filter((id) => id !== "airport-transfer")
      : base.selectedAddonIds,
    packageQuantities:
      data.packageQuantities && typeof data.packageQuantities === "object"
        ? data.packageQuantities
        : base.packageQuantities,
    selectedPackageId: data.selectedPackageId || base.selectedPackageId,
    selectedRoomId: rooms.some((room) => room.id === data.selectedRoomId)
      ? data.selectedRoomId
      : base.selectedRoomId,
    guestCountry:
      data.guestCountry === "Netherlands" &&
      !data.guestName &&
      !data.guestEmail &&
      !data.guestPhone
        ? ""
        : data.guestCountry || "",
  };
}

function stores() {
  const rawContext = process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext;
  let blobContext = null;

  if (rawContext) {
    try {
      const decoded = Buffer.from(String(rawContext), "base64").toString("utf-8");
      blobContext = JSON.parse(decoded);
    } catch {
      blobContext = null;
    }
  }

  const siteID = blobContext?.siteID || process.env.SITE_ID;
  const token = blobContext?.token || process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
  const storeOptions = siteID && token ? { siteID, token, apiURL: blobContext?.apiURL, edgeURL: blobContext?.edgeURL } : undefined;

  return {
    workspaces: storeOptions ? getStore(WORKSPACES_STORE, storeOptions) : getStore(WORKSPACES_STORE),
    slugs: storeOptions ? getStore(SLUGS_STORE, storeOptions) : getStore(SLUGS_STORE),
    owners: storeOptions ? getStore(OWNERS_STORE, storeOptions) : getStore(OWNERS_STORE),
  };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getUserFromContext(context) {
  const raw = context?.clientContext?.custom?.netlify;
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return parsed.user || null;
  } catch {
    return null;
  }
}

function getWorkspaceKey(id) {
  return `workspace:${id}`;
}

function getSlugKey(slug) {
  return `slug:${slug}`;
}

function getOwnerKey(ownerId) {
  return `owner:${ownerId}`;
}

async function getWorkspaceById(id) {
  if (!id) return null;
  const { workspaces } = stores();
  return await workspaces.get(getWorkspaceKey(id), { type: "json" });
}

async function getWorkspaceBySlug(slug) {
  if (!slug) return null;
  const { slugs, workspaces } = stores();
  const slugEntry = await slugs.get(getSlugKey(slug), { type: "json" });
  if (!slugEntry?.workspaceId) return null;
  return await workspaces.get(getWorkspaceKey(slugEntry.workspaceId), { type: "json" });
}

async function getWorkspaceForOwner(ownerId) {
  if (!ownerId) return null;
  const { owners } = stores();
  const ownerEntry = await owners.get(getOwnerKey(ownerId), { type: "json" });
  if (!ownerEntry?.workspaceId) return null;
  return await getWorkspaceById(ownerEntry.workspaceId);
}

async function saveWorkspace(workspace) {
  const normalized = normalizeWorkspace(workspace);
  const { workspaces, slugs, owners } = stores();

  const existing = await getWorkspaceById(normalized.id);
  const nameSlug = slugify(normalized.camp.name || "");
  let candidateSlug =
    !normalized.camp.slug ||
    normalized.camp.slug === nameSlug ||
    normalized.camp.slug === seedCamp.slug
      ? randomSlug("camp")
      : normalized.camp.slug;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slugEntry = await slugs.get(getSlugKey(candidateSlug), { type: "json" });
    if (!slugEntry?.workspaceId || slugEntry.workspaceId === normalized.id) {
      break;
    }
    candidateSlug = randomSlug(candidateSlug);
  }

  normalized.camp.slug = candidateSlug;

  if (existing?.camp?.slug && existing.camp.slug !== normalized.camp.slug) {
    await slugs.delete(getSlugKey(existing.camp.slug));
  }

  await workspaces.setJSON(getWorkspaceKey(normalized.id), normalized);
  await slugs.setJSON(getSlugKey(normalized.camp.slug), { workspaceId: normalized.id });
  await owners.setJSON(getOwnerKey(normalized.ownerId), { workspaceId: normalized.id });
  return normalized;
}

function workspaceResponse(workspace) {
  if (!workspace) return response(404, { error: "Workspace not found" });
  return response(200, workspace);
}

module.exports = {
  createDefaultWorkspace,
  getUserFromContext,
  getWorkspaceById,
  getWorkspaceBySlug,
  getWorkspaceForOwner,
  normalizeWorkspace,
  response,
  saveWorkspace,
  slugify,
  workspaceResponse,
};
