const STORAGE_KEY = "surfcamp-os-demo-v2";
const HOLD_MINUTES = 15;
const authState = {
  user: null,
  token: null,
  workspace: null,
  workspaceLoaded: false,
  syncTimer: null,
};

const adminUiState = {
  availabilityRoomId: "shared-double",
};

const logoSvg =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="36" fill="#efe2cf"/>
      <circle cx="100" cy="100" r="64" fill="none" stroke="#8a6d49" stroke-width="8"/>
      <path d="M52 114c16-18 32-27 48-27s32 9 48 27" fill="none" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
      <path d="M62 88c10-10 21-15 38-15s28 5 38 15" fill="none" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
      <path d="M100 56v88" stroke="#8a6d49" stroke-width="8" stroke-linecap="round"/>
    </svg>
  `);

const seedState = {
  camp: {
    name: "Amigos Surf Camp",
    slug: "amigos-surf-camp",
    logoUrl: logoSvg,
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
    analytics: {
      ga4Id: "",
      pixelId: "",
    },
    bookingRules: {
      restrictedArrivalDays: true,
      allowedArrivalDays: ["Saturday"],
    },
  },
  currentStep: 0,
  selectedPackageId: "package-7",
  packageQuantities: {
    "package-7": 1,
  },
  selectedRoomId: "shared-double",
  selectedAddonIds: ["airport-transfer"],
  startDate: "",
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  guestCountry: "Netherlands",
  notes: "",
  bookingConfirmation: null,
  leads: [],
  bookingIntents: [],
  packages: [
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
  ],
  rooms: [
    {
      id: "shared-double",
      name: "Shared Double",
      description: "Shared dorm room type for two guests.",
      pricePerNight: 95,
      totalUnits: 4,
      capacity: 2,
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
      imageUrl:
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  addons: [
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
  ],
  bookings: [
    {
      id: "demo-001",
      guestName: "Ava",
      guestEmail: "ava@example.com",
      guestCountry: "Germany",
      packageId: "package-7",
      roomId: "shared-double",
      addonIds: ["yoga-pack"],
      startDate: "2026-04-11",
      endDate: "2026-04-18",
      total: 1485,
      status: "confirmed",
      createdAt: "2026-03-30T09:10:00.000Z",
      holdExpiresAt: null,
      notes: "Paid via Stripe checkout.",
    },
    {
      id: "demo-002",
      guestName: "Jonas",
      guestEmail: "jonas@example.com",
      guestCountry: "Belgium",
      packageId: "package-7-surf",
      roomId: "shared-dorm-4bed",
      addonIds: ["airport-transfer"],
      startDate: "2026-04-18",
      endDate: "2026-04-25",
      total: 1470,
      status: "held",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      notes: "Awaiting Stripe confirmation.",
    },
  ],
};

function startOfWeek(dateInput) {
  const date = new Date(dateInput);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekKeyForDate(dateInput) {
  return startOfWeek(dateInput).toISOString().slice(0, 10);
}

function createSeedAvailability(rooms, weeks = 12) {
  const availability = {};
  const start = startOfWeek(new Date());

  rooms.forEach((room) => {
    availability[room.id] = { weeks: {} };
    for (let i = 0; i < weeks; i += 1) {
      const cursor = new Date(start);
      cursor.setDate(cursor.getDate() + i * 7);
      const key = cursor.toISOString().slice(0, 10);
      availability[room.id].weeks[key] = {
        units: room.totalUnits,
        pricePerNight: room.pricePerNight,
      };
    }
  });

  return availability;
}

seedState.camp.availability = createSeedAvailability(seedState.rooms);

const state = loadState();
const draft = {
  packageId: state.selectedPackageId,
  packageQuantities: { ...(state.packageQuantities || {}) },
  roomId: state.selectedRoomId,
  addonIds: [...state.selectedAddonIds],
  startDate: state.startDate || nextDefaultDate(),
  calendarMonthOffset: 0,
  guestName: state.guestName,
  guestEmail: state.guestEmail,
  guestCountry: state.guestCountry,
  notes: state.notes,
  currentStep: state.currentStep ?? 0,
};

function nextDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return firstAllowedStartDate(date.toISOString().slice(0, 10), seedState.camp.bookingRules);
}

function normalizeWorkspaceData(data = {}) {
  return {
    ...structuredClone(seedState),
    ...data,
    camp: {
      ...seedState.camp,
      ...(data.camp || {}),
      showBookingIntents:
        typeof (data.camp && data.camp.showBookingIntents) === "boolean"
          ? data.camp.showBookingIntents
          : seedState.camp.showBookingIntents,
      theme: {
        ...seedState.camp.theme,
        ...((data.camp && data.camp.theme) || {}),
      },
      analytics: {
        ...seedState.camp.analytics,
        ...((data.camp && data.camp.analytics) || {}),
      },
      bookingRules: {
        ...seedState.camp.bookingRules,
        ...((data.camp && data.camp.bookingRules) || {}),
      },
      availability: {
        ...(seedState.camp.availability || {}),
        ...((data.camp && data.camp.availability) || {}),
      },
      slug: (data.camp && data.camp.slug) || slugify((data.camp && data.camp.name) || seedState.camp.name),
    },
    packages: Array.isArray(data.packages) ? data.packages : structuredClone(seedState.packages),
    rooms: structuredClone(seedState.rooms),
    addons: Array.isArray(data.addons) ? data.addons : structuredClone(seedState.addons),
    bookings: Array.isArray(data.bookings) ? data.bookings : structuredClone(seedState.bookings),
    leads: Array.isArray(data.leads) ? data.leads : [],
    bookingIntents: Array.isArray(data.bookingIntents) ? data.bookingIntents : [],
    selectedAddonIds: Array.isArray(data.selectedAddonIds)
      ? data.selectedAddonIds
      : structuredClone(seedState.selectedAddonIds),
    selectedPackageId: data.selectedPackageId || seedState.selectedPackageId,
    packageQuantities:
      data.packageQuantities && typeof data.packageQuantities === "object"
        ? data.packageQuantities
        : data.packagePeople
          ? { [data.selectedPackageId || seedState.selectedPackageId]: data.packagePeople }
          : structuredClone(seedState.packageQuantities),
    selectedRoomId:
      structuredClone(seedState.rooms).some((room) => room.id === data.selectedRoomId)
        ? data.selectedRoomId
        : seedState.selectedRoomId,
    startDate: data.startDate || nextDefaultDate(),
    guestName: data.guestName || "",
    guestPhone: data.guestPhone || "",
    guestEmail: data.guestEmail || "",
    guestCountry: data.guestCountry || "",
    notes: data.notes || "",
    bookingConfirmation: data.bookingConfirmation || null,
    currentStep: Number.isFinite(data.currentStep) ? data.currentStep : 0,
  };
}

function applyTheme(theme = {}) {
  const root = document.documentElement;
  const tokens = {
    bg: theme.bg,
    panel: theme.panel,
    panelSoft: theme.panelSoft,
    border: theme.border,
    text: theme.text,
    muted: theme.muted,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
  };

  Object.entries(tokens).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(`--${key}`, value);
    }
  });

  if (theme.titleFont) root.style.setProperty("--title-font", theme.titleFont);
  if (theme.bodyFont) root.style.setProperty("--body-font", theme.bodyFont);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return normalizeWorkspaceData({ startDate: nextDefaultDate() });
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeWorkspaceData(parsed);
  } catch {
    return normalizeWorkspaceData();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueWorkspaceSync();
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function weekdayName(dateInput) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(dateInput).getDay()
  ];
}

function addDays(dateInput, days) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateInput) {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(dateInput, months) {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthOffsetBetween(a, b) {
  const start = startOfMonth(a);
  const end = startOfMonth(b);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function formatMonthLabel(dateInput) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateInput));
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

function bookingSlug() {
  return state.camp.slug || slugify(state.camp.name) || "camp";
}

function bookingPath() {
  return `/book/${bookingSlug()}`;
}

function bookingUrl() {
  if (window.location.protocol === "file:") {
    return `./book.html?camp=${bookingSlug()}`;
  }

  try {
    return new URL(bookingPath(), window.location.origin).toString();
  } catch {
    return bookingPath();
  }
}

function confirmationUrl(reservationCode = "", guestEmail = "") {
  const params = new URLSearchParams();
  if (reservationCode) params.set("reservation", reservationCode);
  if (guestEmail) params.set("email", guestEmail);

  const query = params.toString() ? `?${params.toString()}` : "";
  if (window.location.protocol === "file:") {
    return `./confirmation.html${query}`;
  }

  try {
    return new URL(`/confirmation.html${query}`, window.location.origin).toString();
  } catch {
    return `/confirmation.html${query}`;
  }
}

function requestedCampSlug() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("camp");
  if (querySlug) return querySlug;

  const match = window.location.pathname.match(/\/book\/([^/?#]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);

  return seedState.camp.slug;
}

function apiUrl(path) {
  return `/.netlify/functions/${path}`;
}

async function apiJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data;
}

const analyticsState = {
  initialized: false,
  loadTracked: false,
};

function analyticsConfig() {
  return state?.camp?.analytics || {};
}

function initAnalytics() {
  const { ga4Id, pixelId } = analyticsConfig();
  if (analyticsState.initialized || (!ga4Id && !pixelId) || typeof window === "undefined") return;

  if (ga4Id && !document.querySelector(`script[data-ga4-id="${ga4Id}"]`)) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    gtagScript.dataset.ga4Id = ga4Id;
    document.head.appendChild(gtagScript);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${ga4Id}');
    `;
    document.head.appendChild(inline);
  }

  if (pixelId && !document.querySelector(`script[data-pixel-id="${pixelId}"]`)) {
    const inline = document.createElement("script");
    inline.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    inline.dataset.pixelId = pixelId;
    document.head.appendChild(inline);
  }

  analyticsState.initialized = true;
}

function trackAnalyticsEvent(eventName, params = {}) {
  const { ga4Id, pixelId } = analyticsConfig();
  if (ga4Id && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }

  if (pixelId && typeof window.fbq === "function") {
    if (eventName === "booking_engine_load") {
      window.fbq("trackCustom", eventName, params);
    } else if (eventName === "search") {
      window.fbq("track", "Search", params);
      window.fbq("trackCustom", eventName, params);
    } else if (eventName === "add_to_cart") {
      window.fbq("track", "AddToCart", params);
      window.fbq("trackCustom", eventName, params);
    } else if (eventName === "checkout") {
      window.fbq("track", "InitiateCheckout", params);
      window.fbq("trackCustom", eventName, params);
    } else {
      window.fbq("trackCustom", eventName, params);
    }
  }
}

function isArrivalAllowed(dateInput, bookingRules = seedState.camp.bookingRules) {
  if (!bookingRules?.restrictedArrivalDays) return true;
  return bookingRules.allowedArrivalDays.includes(weekdayName(dateInput));
}

function firstAllowedStartDate(afterDate = nextDefaultDate(), bookingRules = seedState.camp.bookingRules) {
  const cursor = new Date(afterDate);
  for (let i = 0; i < 120; i += 1) {
    const candidate = cursor.toISOString().slice(0, 10);
    if (isArrivalAllowed(candidate, bookingRules)) return candidate;
    cursor.setDate(cursor.getDate() + 1);
  }
  return afterDate;
}

function hasAvailabilityForDate(startDate) {
  const nights = getPackage(draft.packageId).nights;
  const endDate = addDays(startDate, nights);
  return state.rooms.some((room) => availableUnits(room.id, startDate, endDate) > 0);
}

function firstBookableStartDate(afterDate = nextDefaultDate(), bookingRules = seedState.camp.bookingRules) {
  const cursor = new Date(afterDate);
  for (let i = 0; i < 180; i += 1) {
    const candidate = cursor.toISOString().slice(0, 10);
    if (isArrivalAllowed(candidate, bookingRules) && hasAvailabilityForDate(candidate)) {
      return candidate;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return afterDate;
}

function isSelectableDate(dateInput) {
  const today = new Date();
  const date = new Date(dateInput);
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
  return isArrivalAllowed(dateInput, state.camp.bookingRules) && hasAvailabilityForDate(dateInput);
}

function ensureStartDateSelection() {
  if (!isSelectableDate(draft.startDate)) {
    draft.startDate = firstBookableStartDate(nextDefaultDate(), state.camp.bookingRules);
  }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
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

function cleanExpiredHolds() {
  let changed = false;
  state.bookings = state.bookings.map((booking) => {
    if (booking.status === "held" && !isHoldActive(booking)) {
      changed = true;
      return { ...booking, status: "expired" };
    }
    return booking;
  });

  if (changed) saveState();
}

function getPackage(id) {
  return state.packages.find((item) => item.id === id) || state.packages[0];
}

function getRoom(id) {
  return state.rooms.find((item) => item.id === id) || state.rooms[0];
}

function getAddon(id) {
  return state.addons.find((item) => item.id === id);
}

function endDateForDraft() {
  return addDays(draft.startDate, bookingNights());
}

function weekKeysBetween(startDate, endDate) {
  const keys = [];
  const cursor = startOfWeek(startDate);
  const endCursor = startOfWeek(addDays(endDate, -1));
  while (cursor <= endCursor) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 7);
  }
  return keys;
}

function roomAvailabilityRow(roomId, dateInput) {
  return state.camp.availability?.[roomId]?.weeks?.[weekKeyForDate(dateInput)] || null;
}

function roomNightRate(roomId, dateInput) {
  const room = getRoom(roomId);
  return Number(roomAvailabilityRow(roomId, dateInput)?.pricePerNight ?? room.pricePerNight ?? 0);
}

function ensureAvailabilityCoverage(targetState = state) {
  if (!targetState.camp) return;
  if (!targetState.camp.availability) targetState.camp.availability = {};
  const weekStart = startOfWeek(new Date());

  targetState.rooms.forEach((room) => {
    if (!targetState.camp.availability[room.id]) {
      targetState.camp.availability[room.id] = { weeks: {} };
    }
    if (!targetState.camp.availability[room.id].weeks) {
      targetState.camp.availability[room.id].weeks = {};
    }

    for (let i = 0; i < 12; i += 1) {
      const cursor = new Date(weekStart);
      cursor.setDate(cursor.getDate() + i * 7);
      const key = cursor.toISOString().slice(0, 10);
      if (!targetState.camp.availability[room.id].weeks[key]) {
        targetState.camp.availability[room.id].weeks[key] = {
          units: room.totalUnits,
          pricePerNight: room.pricePerNight,
        };
      }
    }
  });
}

function packageQuantity(packageId) {
  return Math.max(0, Number(draft.packageQuantities?.[packageId] || 0));
}

function selectedPackageRows() {
  return state.packages
    .map((item) => ({
      ...item,
      quantity: packageQuantity(item.id),
    }))
    .filter((item) => item.quantity > 0);
}

function selectedPackagePeopleCount() {
  return selectedPackageRows().reduce((sum, item) => sum + item.quantity, 0);
}

function bookingNights() {
  const rows = selectedPackageRows();
  if (!rows.length) {
    return getPackage(draft.packageId).nights;
  }

  return Math.max(...rows.map((item) => item.nights));
}

function overlappingBookings(roomId, startDate, endDate) {
  return state.bookings.filter((booking) => {
    if (booking.roomId !== roomId) return false;
    if (!blocksInventory(booking)) return false;
    return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
  });
}

function availableUnits(roomId, startDate, endDate) {
  const room = getRoom(roomId);
  const rows = weekKeysBetween(startDate, endDate);
  const booked = overlappingBookings(roomId, startDate, endDate).length;
  if (!rows.length) return Math.max(0, room.totalUnits - booked);

  const units = rows.map((weekKey) => {
    const row = state.camp.availability?.[roomId]?.weeks?.[weekKey];
    const total = Number(row?.units ?? room.totalUnits ?? 0);
    return Math.max(0, total - booked);
  });

  return Math.max(0, Math.min(...units));
}

function bookedUnitsForWeek(roomId, weekKey) {
  const startDate = weekKey;
  const endDate = addDays(weekKey, 7);
  return state.bookings.filter((booking) => {
    if (booking.roomId !== roomId) return false;
    if (!blocksInventory(booking)) return false;
    return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
  }).length;
}

function roomAvailabilitySnapshot(roomId, startDate = draft.startDate, endDate = endDateForDraft()) {
  const room = getRoom(roomId);
  const weeks = weekKeysBetween(startDate, endDate);

  if (!weeks.length) {
    const available = Math.max(0, room.totalUnits || 0);
    const booked = overlappingBookings(roomId, startDate, endDate).length;
    return {
      available,
      booked,
      forSale: Math.max(0, available - booked),
    };
  }

  const weekStats = weeks.map((weekKey) => {
    const row = state.camp.availability?.[roomId]?.weeks?.[weekKey];
    const available = Number(row?.units ?? room.totalUnits ?? 0);
    const booked = bookedUnitsForWeek(roomId, weekKey);
    return {
      available,
      booked,
      forSale: Math.max(0, available - booked),
    };
  });

  return {
    available: Math.min(...weekStats.map((item) => item.available)),
    booked: Math.max(...weekStats.map((item) => item.booked)),
    forSale: Math.min(...weekStats.map((item) => item.forSale)),
  };
}

function firstAvailableRoom(startDate = draft.startDate, endDate = endDateForDraft()) {
  return state.rooms.find((room) => availableUnits(room.id, startDate, endDate) > 0)?.id || null;
}

function ensureRoomSelection() {
  if (availableUnits(draft.roomId, draft.startDate, endDateForDraft()) > 0) return;
  const replacement = firstAvailableRoom();
  if (replacement) {
    draft.roomId = replacement;
  }
}

function roomPrice() {
  let total = 0;
  const cursor = new Date(draft.startDate);
  const end = new Date(endDateForDraft());
  while (cursor < end) {
    const iso = cursor.toISOString().slice(0, 10);
    total += roomNightRate(draft.roomId, iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function packagePrice() {
  return selectedPackageRows().reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
}

function addonPrice() {
  return draft.addonIds.reduce((sum, addonId) => sum + (getAddon(addonId)?.price || 0), 0);
}

function totalPrice() {
  return packagePrice() + roomPrice() + addonPrice();
}

function availabilityText(room) {
  const snapshot = roomAvailabilitySnapshot(room.id);
  if (snapshot.forSale <= 0) return { label: "Sold out", cls: "empty" };
  if (snapshot.forSale === 1) return { label: "1 for sale", cls: "low" };
  return { label: `${snapshot.forSale} for sale`, cls: "" };
}

function isSoldOutStartDate(dateInput) {
  const today = new Date();
  const date = new Date(dateInput);
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
  if (!isArrivalAllowed(dateInput, state.camp.bookingRules)) return false;
  return !hasAvailabilityForDate(dateInput);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderDayCell(cellDate, monthDate) {
  const iso = cellDate.toISOString().slice(0, 10);
  const inMonth = cellDate.getMonth() === monthDate.getMonth();
  const selected = iso === draft.startDate;
  const rangeStart = new Date(draft.startDate);
  const rangeEnd = new Date(endDateForDraft());
  const inRange = selected || (new Date(iso) > rangeStart && new Date(iso) < rangeEnd);
  const isStart = selected;
  const isEnd = iso === endDateForDraft();
  const selectable = inMonth && isSelectableDate(iso);
  const soldOut = inMonth && isSoldOutStartDate(iso);

  const classes = [
    "day-cell",
    inMonth ? "" : "muted-day",
    selectable ? "" : "disabled-day",
    soldOut ? "soldout-day" : "",
    inRange ? "in-range" : "",
    isStart ? "range-start" : "",
    isEnd ? "range-end" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button
      type="button"
      class="${classes}"
      ${selectable ? `data-select-date="${iso}"` : "disabled"}
      aria-label="${formatDate(iso)}"
    >
      <span class="day-number">${cellDate.getDate()}</span>
      ${soldOut ? '<span class="day-status">FULL</span>' : ""}
    </button>
  `;
}

function renderMonthCard(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    cells.push(renderDayCell(cellDate, firstDay));
  }

  return `
    <section class="month-card">
      <div class="month-card-head">
        <strong>${formatMonthLabel(firstDay)}</strong>
      </div>
      <div class="weekday-row">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div class="month-grid">${cells.join("")}</div>
    </section>
  `;
}

function renderDateSelector() {
  const baseMonth = addMonths(startOfMonth(new Date()), draft.calendarMonthOffset);
  const nextMonth = addMonths(baseMonth, 1);

  return `
    <section class="calendar-card">
      <div class="date-intro">
        <h3>2. Pick a date</h3>
        <p class="helper">Select your check-in date.</p>
      </div>
      <div class="date-summary">
        <div>
          <span class="tiny">Check-in</span>
          <strong>${formatDate(draft.startDate)}</strong>
        </div>
        <div>
          <span class="tiny">Check-out</span>
          <strong>${formatDate(endDateForDraft())}</strong>
        </div>
        <div>
          <span class="tiny">Nights</span>
          <strong>${bookingNights()}</strong>
        </div>
      </div>

      <div class="calendar-head">
        <div class="calendar-nav">
          <button type="button" class="nav-button" data-month-nav="-1">Prev</button>
          <button type="button" class="nav-button" data-month-nav="1">Next</button>
        </div>
      </div>

      <div class="calendar-grid-wrap">
        ${renderMonthCard(baseMonth)}
        ${renderMonthCard(nextMonth)}
      </div>

      <div class="calendar-note">
        ${state.camp.bookingRules?.restrictedArrivalDays
          ? `Arrival days: ${state.camp.bookingRules.allowedArrivalDays.join(", ")}`
          : "Any arrival day is allowed."}
      </div>

      <div class="date-footer">
        <button type="button" class="button button-primary" id="nextFromDate" data-go-step="2">
          Next
        </button>
      </div>
    </section>
  `;
}

function renderBookPage() {
  const logo = document.getElementById("campLogo");
  const name = document.getElementById("campName");
  const stepper = document.getElementById("stepper");
  const wizard = document.getElementById("wizardContent");
  const summary = document.getElementById("summaryPanel");

  if (!stepper || !wizard || !summary) return;

  if (logo) logo.src = state.camp.logoUrl;
  if (name) name.textContent = state.camp.name;
  applyTheme(state.camp.theme);

  ensureStartDateSelection();
  ensureRoomSelection();

  const maxUnlockedStep = Math.max(0, draft.currentStep);

  stepper.innerHTML = ["Package", "Date", "Room", "Add-ons", "Book"]
    .map(
      (label, index) => `
        <button
          type="button"
          class="${index === draft.currentStep ? "active" : ""}"
          ${index > maxUnlockedStep ? "disabled" : ""}
          data-step="${index}"
        >
          ${index + 1}. ${label}
        </button>
      `,
    )
    .join("");

  const packageCards = state.packages
    .map((item) => {
      const quantity = packageQuantity(item.id);
      return `
        <article class="package-row">
          <div class="option-body">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="option-meta">
              <span>${item.nights} nights</span>
              <span>From ${money(item.basePrice)}</span>
            </div>
          </div>
          <div class="package-row-actions">
            <span class="tiny">People</span>
            <div class="people-control" role="group" aria-label="${item.name} people count">
              <button type="button" class="people-button" data-package-row-change="${item.id}:-1">−</button>
              <input
                type="number"
                min="0"
                max="12"
                value="${quantity}"
                data-package-row-input="${item.id}"
                aria-label="${item.name} quantity"
              />
              <button type="button" class="people-button" data-package-row-change="${item.id}:1">+</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const roomCards = state.rooms
    .map((room) => {
      const selected = room.id === draft.roomId;
      const availability = availabilityText(room);
      const snapshot = roomAvailabilitySnapshot(room.id);
      return `
        <article class="option-card ${selected ? "selected" : ""}" data-select-room="${room.id}">
          <div class="option-media">${room.imageUrl ? `<img src="${room.imageUrl}" alt="${room.name}" />` : ""}</div>
          <div class="option-body">
            <h3>${room.name}</h3>
            <p>${room.description}</p>
            <div class="option-meta">
              <span>${money(room.pricePerNight)} / night</span>
              <span class="availability ${availability.cls}">${availability.label}</span>
            </div>
            <div class="tiny">${snapshot.available} available &middot; ${snapshot.booked} booked &middot; ${snapshot.forSale} for sale</div>
            <div class="tiny">${room.capacity} guests per room &middot; ${room.totalUnits * room.capacity} total available</div>
          </div>
        </article>
      `;
    })
    .join("");

  const addonCards = state.addons
    .map((addon) => {
      const selected = draft.addonIds.includes(addon.id);
      return `
        <article class="option-card ${selected ? "selected" : ""}" data-toggle-addon="${addon.id}">
          <div class="option-body">
            <h3>${addon.name}</h3>
            <p>${addon.description}</p>
            <div class="option-meta">
              <span>${money(addon.price)} ${addon.unitLabel}</span>
              <span>${selected ? "Included" : "Add"}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const views = [
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>1. Pick a package</h3>
            <p class="helper">Set the number of people for each package row.</p>
          </div>
          <span class="step-badge">${state.packages.length} packages</span>
        </div>
        <div class="stack">${packageCards}</div>
        <div class="package-footer">
          <div class="tiny">${selectedPackageRows().length ? `${selectedPackageRows().length} package types · ${selectedPackagePeopleCount()} people` : "Choose at least one package row to continue."}</div>
          <button class="button button-primary" type="button" id="nextFromPackage" ${selectedPackageRows().length ? "" : "disabled"}>Next</button>
        </div>
      </section>
    `,
    renderDateSelector(),
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>3. Pick a room</h3>
            <p class="helper">Choose the room that fits your group.</p>
          </div>
          <span class="step-badge">Rooms</span>
        </div>
        <div class="card-grid">${roomCards}</div>
        <div class="booking-actions room-actions">
          <button class="button button-primary" type="button" data-go-step="3" id="nextFromRoom">Next</button>
        </div>
      </section>
    `,
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>4. Add-ons</h3>
            <p class="helper">Add extras only if you need them.</p>
          </div>
          <span class="step-badge">${state.addons.length} add-ons</span>
        </div>
        <div class="card-grid">${addonCards}</div>
        <div class="booking-actions">
          <button class="button button-primary" type="button" id="continueToBook">Continue to book</button>
          <span class="helper">Step 5 unlocks after this step is completed.</span>
        </div>
      </section>
    `,
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>5. Book</h3>
            <p class="helper">We save the guest details before confirming the reservation.</p>
          </div>
          <span class="step-badge">Reservation</span>
        </div>
        ${
          state.bookingConfirmation
            ? `
              <div class="confirmation-card">
                <p class="eyebrow">Booking confirmed</p>
                <h3>Thanks, ${escapeHtml(state.bookingConfirmation.guestName || draft.guestName)}.</h3>
                <p class="helper">Your reservation is saved and the confirmation email is ${
                  state.bookingConfirmation.emailStatus === "sent" ? "on its way" : "ready when email delivery is configured"
                }.</p>
                <div class="summary-list" style="margin-top: 18px;">
                  <div class="summary-item">
                    <div>
                      <strong>Booking ID</strong>
                      <span>${escapeHtml(state.bookingConfirmation.bookingId || "")}</span>
                    </div>
                    <strong>Confirmed</strong>
                  </div>
                  <div class="summary-item">
                    <div>
                      <strong>Guest</strong>
                      <span>${escapeHtml(state.bookingConfirmation.guestEmail || draft.guestEmail)}</span>
                    </div>
                    <strong>${escapeHtml(state.bookingConfirmation.emailStatus || "skipped")}</strong>
                  </div>
                </div>
              </div>
            `
            : `
              <div class="input-row">
                <label class="field">
                  Guest name
                  <input id="guestName" type="text" value="${escapeHtml(draft.guestName)}" />
                </label>
                <label class="field">
                  Email
                  <input id="guestEmail" type="email" value="${escapeHtml(draft.guestEmail)}" />
                </label>
              </div>
              <div class="input-row" style="margin-top: 14px;">
                <label class="field">
                  Phone
                  <input id="guestPhone" type="tel" value="${escapeHtml(draft.guestPhone)}" />
                </label>
                <label class="field">
                  Country
                  <input id="guestCountry" type="text" value="${escapeHtml(draft.guestCountry)}" />
                </label>
              </div>
              <label class="field" style="margin-top: 14px;">
                Notes
                <input id="guestNotes" type="text" value="${escapeHtml(draft.notes)}" />
              </label>
              <div class="booking-actions">
                <button class="button button-primary" type="button" id="bookButton">Confirm booking</button>
              </div>
              <div class="notice">
                Demo mode: this confirms the booking immediately and would hand off to Stripe in production.
              </div>
            `
        }
      </section>
    `,
  ];

  wizard.innerHTML = views[draft.currentStep];

  summary.innerHTML = `
    <div class="summary-hero">
      <div class="summary-badge">Live summary</div>
      <h2>${getPackage(draft.packageId).name}</h2>
      <p class="muted" style="margin-top: 10px;">${formatDate(draft.startDate)} to ${formatDate(endDateForDraft())}</p>
      <div class="summary-list">
        <div class="summary-item">
          <div>
            <strong>Package</strong>
            <span>
              ${selectedPackageRows().length
                ? `${selectedPackagePeopleCount()} people · ${selectedPackageRows()
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join(", ")}`
                : "No packages selected"}
            </span>
          </div>
          <strong>${money(packagePrice())}</strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Room</strong>
            <span>${getRoom(draft.roomId).name}</span>
          </div>
          <strong>${money(roomPrice())}</strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Add-ons</strong>
            <span>${draft.addonIds.length ? draft.addonIds.map((id) => getAddon(id)?.name).filter(Boolean).join(", ") : "None"}</span>
          </div>
          <strong>${money(addonPrice())}</strong>
        </div>
      </div>
      <div class="summary-total">
        <div>
          <strong>Total</strong>
          <div class="tiny">Demo mode confirms immediately. Stripe comes next.</div>
        </div>
        <strong>${money(totalPrice())}</strong>
      </div>
      <div class="summary-footer">
        ${state.camp.bookingRules?.restrictedArrivalDays
          ? `Arrivals only on ${state.camp.bookingRules.allowedArrivalDays.join(", ")}.`
          : "Any arrival day is allowed."}
      </div>
    </div>
  `;

  initAnalytics();
  if (!analyticsState.loadTracked && (analyticsConfig().ga4Id || analyticsConfig().pixelId)) {
    trackAnalyticsEvent("booking_engine_load", {
      camp: bookingSlug(),
      step: draft.currentStep + 1,
    });
    analyticsState.loadTracked = true;
  }
}

function availabilityRowsForRoom(roomId, count = 12) {
  const room = getRoom(roomId);
  const rows = [];
  const start = startOfWeek(new Date());

  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + i * 7);
    const key = cursor.toISOString().slice(0, 10);
    const row = state.camp.availability?.[roomId]?.weeks?.[key] || {
      units: room.totalUnits,
      pricePerNight: room.pricePerNight,
    };
    rows.push({
      weekKey: key,
      weekLabel: `${formatDate(key)} to ${formatDate(addDays(key, 6))}`,
      units: Number(row.units ?? room.totalUnits ?? 0),
      pricePerNight: Number(row.pricePerNight ?? room.pricePerNight ?? 0),
    });
  }

  return rows;
}

function renderAvailabilityMatrix(roomId) {
  const room = getRoom(roomId);
  const rows = availabilityRowsForRoom(roomId);
  return `
    <div class="availability-row-header">
      <span>Week</span>
      <span>Rooms available</span>
      <span>Price per night</span>
    </div>
    ${rows
      .map(
        (row) => `
          <div class="availability-row">
            <div>
              <strong>${escapeHtml(row.weekLabel)}</strong>
              <div class="tiny">${room.name}</div>
              <div class="tiny">${bookedUnitsForWeek(roomId, row.weekKey)} booked · ${Math.max(0, row.units - bookedUnitsForWeek(roomId, row.weekKey))} left</div>
            </div>
            <label>
              <input
                type="number"
                min="0"
                step="1"
                value="${row.units}"
                data-availability-units="${row.weekKey}"
                data-availability-room="${roomId}"
                aria-label="Rooms available for ${escapeHtml(row.weekLabel)}"
              />
            </label>
            <label>
              <input
                type="number"
                min="0"
                step="1"
                value="${row.pricePerNight}"
                data-availability-price="${row.weekKey}"
                data-availability-room="${roomId}"
                aria-label="Price per night for ${escapeHtml(row.weekLabel)}"
              />
            </label>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderAdminPage() {
  const roomCount = document.getElementById("roomCount");
  const packageCount = document.getElementById("packageCount");
  const addonCount = document.getElementById("addonCount");
  const bookingCount = document.getElementById("bookingCount");
  const intentCount = document.getElementById("intentCount");
  document.querySelectorAll("[data-booking-link]").forEach((bookingLink) => {
    bookingLink.setAttribute("href", bookingUrl());
  });

  if (roomCount) roomCount.textContent = `${state.rooms.length} rooms`;
  if (packageCount) packageCount.textContent = `${state.packages.length} packages`;
  if (addonCount) addonCount.textContent = `${state.addons.length} add-ons`;
  if (bookingCount) bookingCount.textContent = `${state.bookings.length} bookings`;
  if (intentCount) intentCount.textContent = `${state.bookingIntents.length} intents`;

  const roomList = document.getElementById("roomList");
  const packageList = document.getElementById("packageList");
  const addonList = document.getElementById("addonList");
  const bookingList = document.getElementById("bookingList");
  const bookingIntentCard = document.getElementById("bookingIntentCard");
  const bookingIntentList = document.getElementById("bookingIntentList");
  const campForm = document.getElementById("campForm");
  const bookingUrlInput = document.getElementById("bookingUrl");
  const availabilityRoomSelect = document.getElementById("availabilityRoomSelect");
  const availabilityBasePrice = document.getElementById("availabilityBasePrice");
  const availabilityMatrix = document.getElementById("availabilityMatrix");

  ensureAvailabilityCoverage(state);

  if (!state.rooms.some((room) => room.id === adminUiState.availabilityRoomId)) {
    adminUiState.availabilityRoomId = state.rooms[0]?.id || "shared-double";
  }

  if (campForm) {
    campForm.elements.campName.value = state.camp.name;
    campForm.elements.logoUrl.value = state.camp.logoUrl.startsWith("data:") ? "" : state.camp.logoUrl;
    campForm.elements.bg.value = state.camp.theme?.bg || seedState.camp.theme.bg;
    campForm.elements.panel.value = state.camp.theme?.panel || seedState.camp.theme.panel;
    campForm.elements.panelSoft.value = state.camp.theme?.panelSoft || seedState.camp.theme.panelSoft;
    campForm.elements.border.value = state.camp.theme?.border || seedState.camp.theme.border;
    campForm.elements.text.value = state.camp.theme?.text || seedState.camp.theme.text;
    campForm.elements.muted.value = state.camp.theme?.muted || seedState.camp.theme.muted;
    campForm.elements.accent.value = state.camp.theme?.accent || seedState.camp.theme.accent;
    campForm.elements.accentSoft.value = state.camp.theme?.accentSoft || seedState.camp.theme.accentSoft;
    campForm.elements.titleFont.value = state.camp.theme?.titleFont || seedState.camp.theme.titleFont;
    campForm.elements.bodyFont.value = state.camp.theme?.bodyFont || seedState.camp.theme.bodyFont;
    campForm.elements.ga4Id.value = state.camp.analytics?.ga4Id || "";
    campForm.elements.pixelId.value = state.camp.analytics?.pixelId || "";
    if (campForm.elements.showBookingIntents) {
      campForm.elements.showBookingIntents.checked = !!state.camp.showBookingIntents;
    }
    campForm.elements.restrictedArrivalDays.checked = !!state.camp.bookingRules?.restrictedArrivalDays;
    campForm
      .querySelectorAll('input[name="arrivalDays"]')
      .forEach((checkbox) => {
        checkbox.checked = (state.camp.bookingRules?.allowedArrivalDays || []).includes(checkbox.value);
      });
  }

  if (bookingUrlInput) {
    bookingUrlInput.value = bookingUrl();
  }
  applyTheme(state.camp.theme);

  if (availabilityRoomSelect) {
    availabilityRoomSelect.innerHTML = state.rooms
      .map(
        (room) => `
          <option value="${room.id}" ${room.id === adminUiState.availabilityRoomId ? "selected" : ""}>
            ${room.name}
          </option>
        `,
      )
      .join("");
  }

  if (availabilityBasePrice) {
    const selectedRoom = getRoom(adminUiState.availabilityRoomId);
    const firstRow = availabilityRowsForRoom(adminUiState.availabilityRoomId)[0];
    availabilityBasePrice.value = firstRow?.pricePerNight || selectedRoom.pricePerNight || 0;
  }

  if (availabilityMatrix) {
    availabilityMatrix.innerHTML = renderAvailabilityMatrix(adminUiState.availabilityRoomId);
  }

  if (roomList) {
    roomList.innerHTML = state.rooms
      .map((room) => {
        const availability = availabilityText(room);
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${room.name}</strong>
              <span class="status ${availability.cls || "confirmed"}">${availability.label}</span>
            </div>
            <small>${room.description}</small>
            <div class="tiny">${money(room.pricePerNight)} per night &middot; ${room.capacity} guests per room &middot; ${room.totalUnits * room.capacity} total available</div>
          </div>
        `;
      })
      .join("");
  }

  if (packageList) {
    packageList.innerHTML = state.packages
      .map(
        (item) => `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${item.name}</strong>
              <span class="pill">${item.nights} nights</span>
            </div>
            <small>${item.description}</small>
            <div class="tiny">${money(item.basePrice)}</div>
          </div>
        `,
      )
      .join("");
  }

  if (addonList) {
    addonList.innerHTML = state.addons
      .map(
        (item) => `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${item.name}</strong>
              <span class="pill">${money(item.price)}</span>
            </div>
            <small>${item.description}</small>
            <div class="tiny">${item.unitLabel}</div>
          </div>
        `,
      )
      .join("");
  }

  if (bookingList) {
    bookingList.innerHTML = state.bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((booking) => {
        const pkg = getPackage(booking.packageId);
        const room = getRoom(booking.roomId);
        const packageSummary = booking.packageQuantities
          ? Object.entries(booking.packageQuantities)
              .map(([packageId, quantity]) => `${getPackage(packageId).name} × ${quantity}`)
              .join(", ")
          : `${pkg.name} × ${booking.packagePeople || 1}`;
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${booking.guestName}</strong>
              <span class="status ${booking.status}">${booking.status}</span>
            </div>
            <small>${packageSummary} &middot; ${room.name}</small>
            <div class="tiny">${booking.guestEmail || "No email"} &middot; ${booking.guestPhone || "No phone"}</div>
            <div class="tiny">${formatDate(booking.startDate)} to ${formatDate(booking.endDate)} &middot; ${money(booking.total)}</div>
            <div class="tiny">Booked: ${formatDateTime(booking.createdAt)}</div>
            <div class="tiny">Hold expires: ${booking.holdExpiresAt ? formatDateTime(booking.holdExpiresAt) : "N/A"}</div>
            <div class="tiny">Reservation: ${booking.reservationCode || "pending"}</div>
            <div class="tiny">Email: ${booking.confirmationEmail?.status || "not sent"}</div>
            ${
              booking.status !== "cancelled" && booking.status !== "expired"
                ? `<div class="stack-item-actions"><button type="button" class="button button-secondary" data-cancel-booking="${booking.id}" data-reservation-code="${booking.reservationCode || ""}">Cancel</button></div>`
                : booking.cancelledAt
                  ? `<div class="tiny">Cancelled: ${formatDateTime(booking.cancelledAt)}</div>`
                  : ""
            }
          </div>
        `;
      })
      .join("");
  }

  if (bookingIntentCard && bookingIntentList) {
    bookingIntentCard.hidden = !state.camp.showBookingIntents && state.bookingIntents.length === 0;
    bookingIntentList.innerHTML = state.bookingIntents
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((intent) => {
        const pkg = getPackage(intent.packageId);
        const room = getRoom(intent.roomId);
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${intent.guestName || "Guest lead"}</strong>
              <span class="status held">intent</span>
            </div>
            <small>${pkg.name} &middot; ${room.name}</small>
            <div class="tiny">${intent.guestEmail || "No email"} &middot; ${intent.guestPhone || "No phone"}</div>
            <div class="tiny">${formatDate(intent.startDate)} to ${formatDate(intent.endDate)} &middot; ${money(intent.total)}</div>
            <div class="tiny">Created: ${formatDateTime(intent.createdAt)}</div>
            <div class="tiny">Updated: ${formatDateTime(intent.updatedAt || intent.createdAt)}</div>
            <div class="tiny">Reservation: ${intent.reservationCode || "pending"}</div>
          </div>
        `;
      })
      .join("");
  }
}

function availabilityRowsForRoom(roomId, count = 12) {
  const room = getRoom(roomId);
  const rows = [];
  const start = startOfWeek(new Date());

  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + i * 7);
    const key = cursor.toISOString().slice(0, 10);
    const row = state.camp.availability?.[roomId]?.weeks?.[key] || {
      units: room.totalUnits,
      pricePerNight: room.pricePerNight,
    };
    const units = Number(row.units ?? room.totalUnits ?? 0);
    const booked = bookedUnitsForWeek(roomId, key);
    rows.push({
      weekKey: key,
      weekLabel: `${formatDate(key)} to ${formatDate(addDays(key, 6))}`,
      units,
      booked,
      forSale: Math.max(0, units - booked),
      pricePerNight: Number(row.pricePerNight ?? room.pricePerNight ?? 0),
    });
  }

  return rows;
}

function renderAvailabilityMatrix(roomId) {
  const room = getRoom(roomId);
  const rows = availabilityRowsForRoom(roomId);
  return `
    <div class="availability-row-header">
      <span>Week</span>
      <span>Available</span>
      <span>Booked</span>
      <span>For sale</span>
      <span>Price per night</span>
    </div>
    ${rows
      .map(
        (row) => `
          <div class="availability-row">
            <div>
              <strong>${escapeHtml(row.weekLabel)}</strong>
              <div class="tiny">${room.name}</div>
            </div>
            <div>
              <strong>${row.units}</strong>
              <div class="tiny">total</div>
            </div>
            <div>
              <strong>${row.booked}</strong>
              <div class="tiny">sold</div>
            </div>
            <div>
              <strong>${row.forSale}</strong>
              <div class="tiny">sellable</div>
            </div>
            <label>
              <input
                type="number"
                min="0"
                step="1"
                value="${row.pricePerNight}"
                data-availability-price="${row.weekKey}"
                data-availability-room="${roomId}"
                aria-label="Price per night for ${escapeHtml(row.weekLabel)}"
              />
            </label>
          </div>
        `,
      )
      .join("")}
  `;
}

function readAvailabilityMatrix(roomId) {
  const rows = {};
  document
    .querySelectorAll(`[data-availability-room="${roomId}"][data-availability-units]`)
    .forEach((input) => {
      const weekKey = input.dataset.availabilityUnits;
      const priceInput = document.querySelector(
        `[data-availability-room="${roomId}"][data-availability-price="${weekKey}"]`,
      );
      rows[weekKey] = {
        units: clampPackageQuantity(input.value),
        pricePerNight: Math.max(0, Number(priceInput?.value || 0)),
      };
    });
  return rows;
}

function renderLandingPage() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  document.querySelectorAll("[data-booking-link]").forEach((bookingLink) => {
    bookingLink.setAttribute("href", bookingUrl());
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const lead = {
      email: form.elements.email.value.trim(),
      campName: form.elements.campName.value.trim(),
      notes: form.elements.notes.value.trim(),
      createdAt: new Date().toISOString(),
    };

    state.leads.unshift(lead);
    saveState();
    form.reset();

    const message = document.createElement("p");
    message.className = "notice";
    message.textContent = "Thanks. Your request has been captured as a demo lead.";
    form.insertAdjacentElement("beforebegin", message);
    setTimeout(() => message.remove(), 4000);
  });
}

function initLandingAuth() {
  if (!document.getElementById("landingLogin")) return;

  const redirectToAdmin = () => {
    window.location.assign("./admin.html");
  };

  const landingLogin = document.getElementById("landingLogin");
  landingLogin?.addEventListener("click", () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.open();
    } else {
      redirectToAdmin();
    }
  });

  if (!window.netlifyIdentity || typeof window.netlifyIdentity.on !== "function") {
    return;
  }

  window.netlifyIdentity.on("init", (user) => {
    if (user) redirectToAdmin();
  });

  window.netlifyIdentity.on("login", () => {
    window.netlifyIdentity.close();
    redirectToAdmin();
  });

  window.netlifyIdentity.init();

  if (window.netlifyIdentity.currentUser()) {
    redirectToAdmin();
  }
}

function hydrateStateFromWorkspace(workspace) {
  Object.assign(state, normalizeWorkspaceData(workspace));
  ensureAvailabilityCoverage(state);
  applyStateToDraft();
  applyTheme(state.camp.theme);
  saveState();
}

async function loadPublicWorkspace() {
  if (window.location.protocol === "file:") {
    return;
  }

  try {
    const slug = requestedCampSlug();
    const workspace = await apiJson(`public-workspace?slug=${encodeURIComponent(slug)}`);
    if (workspace) {
      hydrateStateFromWorkspace(workspace);
      renderBookPage();
    }
  } catch {
    // Fall back to local demo state when the public API is unavailable.
  }
}

async function loadAdminWorkspace() {
  if (!window.netlifyIdentity?.currentUser) return;

  const user = window.netlifyIdentity.currentUser();
  if (!user) return;

  authState.user = user;
  authState.workspaceLoaded = false;
  try {
    authState.token = await user.jwt();
    const workspace = await apiJson("me-workspace", {
      headers: {
        Authorization: `Bearer ${authState.token}`,
      },
    });

    if (workspace) {
      authState.workspace = workspace;
      authState.workspaceLoaded = true;
      hydrateStateFromWorkspace(workspace);
      renderAdminPage();
      updateAdminAuthUI(user);
    }
  } catch (error) {
    const authStatus = document.getElementById("authStatus");
    if (authStatus) {
      authStatus.textContent = error instanceof Error ? error.message : "Could not load your workspace.";
    }
  }
}

async function refreshAdminWorkspace({ silent = false } = {}) {
  if (!window.netlifyIdentity?.currentUser || !window.netlifyIdentity.currentUser()) return;

  try {
    await loadAdminWorkspace();
  } catch (error) {
    if (!silent) {
      alert(error instanceof Error ? error.message : "Could not refresh workspace.");
    }
  }
}

async function cancelBookingReservation(bookingId, reservationCode = "") {
  if (!bookingId) return;
  const confirmed = window.confirm("Cancel this reservation and release the room back into availability?");
  if (!confirmed) return;

  try {
    const result = await apiJson("cancel-booking", {
      method: "POST",
      headers: authState.token ? { Authorization: `Bearer ${authState.token}` } : {},
      body: JSON.stringify({ bookingId, reservationCode }),
    });

    if (result?.workspace) {
      hydrateStateFromWorkspace(result.workspace);
      renderAdminPage();
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : "Could not cancel reservation.");
  }
}

function updateAdminAuthUI(user) {
  const authPanel = document.getElementById("authPanel");
  const authStatus = document.getElementById("authStatus");
  const authButton = document.getElementById("authButton");
  const authLogout = document.getElementById("authLogout");
  const adminWorkspace = document.getElementById("adminWorkspace");

  if (!authPanel || !adminWorkspace) return;

  const signedIn = !!user;
  const workspaceReady = signedIn && authState.workspaceLoaded;
  adminWorkspace.hidden = !workspaceReady;
  authPanel.dataset.authenticated = signedIn ? "true" : "false";

  if (authStatus) {
    authStatus.textContent = signedIn
      ? workspaceReady
        ? `Signed in as ${user.email}.`
        : "Loading your camp workspace..."
      : "Sign in with Netlify Identity to edit this camp.";
  }

  if (authButton) authButton.hidden = signedIn;
  if (authLogout) authLogout.hidden = !signedIn;
}

function initNetlifyIdentityAuth() {
  if (!window.netlifyIdentity || typeof window.netlifyIdentity.on !== "function") {
    updateAdminAuthUI(null);
    const authStatus = document.getElementById("authStatus");
    if (authStatus) {
      authStatus.textContent = "Netlify Identity is not available. Enable it in the Netlify dashboard.";
    }
    return;
  }

  window.netlifyIdentity.on("init", (user) => {
    updateAdminAuthUI(user);
    if (user) {
      void loadAdminWorkspace();
    }
  });

  window.netlifyIdentity.on("login", (user) => {
    window.netlifyIdentity.close();
    updateAdminAuthUI(user);
    void loadAdminWorkspace();
  });

  window.netlifyIdentity.on("logout", () => {
    authState.user = null;
    authState.token = null;
    authState.workspace = null;
    authState.workspaceLoaded = false;
    updateAdminAuthUI(null);
  });

  const authButton = document.getElementById("authButton");
  const authLogout = document.getElementById("authLogout");

  authButton?.addEventListener("click", () => {
    window.netlifyIdentity.open();
  });

  authLogout?.addEventListener("click", () => {
    window.netlifyIdentity.logout();
  });

  window.netlifyIdentity.init();
  updateAdminAuthUI(window.netlifyIdentity.currentUser());
}

function syncDraftToState() {
  state.currentStep = draft.currentStep;
  state.selectedPackageId = draft.packageId;
  state.packageQuantities = { ...draft.packageQuantities };
  state.selectedRoomId = draft.roomId;
  state.selectedAddonIds = [...draft.addonIds];
  state.startDate = draft.startDate;
  state.guestName = draft.guestName;
  state.guestPhone = draft.guestPhone;
  state.guestEmail = draft.guestEmail;
  state.guestCountry = draft.guestCountry;
  state.notes = draft.notes;
}

function applyStateToDraft() {
  draft.packageId = state.selectedPackageId;
  draft.packageQuantities = { ...(state.packageQuantities || {}) };
  draft.roomId = state.selectedRoomId;
  draft.addonIds = [...(state.selectedAddonIds || [])];
  draft.startDate = state.startDate || nextDefaultDate();
  draft.guestName = state.guestName || "";
  draft.guestPhone = state.guestPhone || "";
  draft.guestEmail = state.guestEmail || "";
  draft.guestCountry = state.guestCountry || "";
  draft.notes = state.notes || "";
  draft.currentStep = state.currentStep ?? 0;
  draft.calendarMonthOffset = monthOffsetBetween(new Date(), draft.startDate);
}

async function syncWorkspaceToServer() {
  if (!authState.user || !authState.token || !authState.workspace) return;

  const payload = normalizeWorkspaceData(state);
  const result = await apiJson("save-workspace", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authState.token}`,
    },
    body: JSON.stringify({
      workspace: payload,
      workspaceId: authState.workspace.id,
      slug: authState.workspace.slug,
    }),
  });

  if (result?.workspace) {
    authState.workspace = result.workspace;
    Object.assign(state, normalizeWorkspaceData(result.workspace));
    applyStateToDraft();
    applyTheme(state.camp.theme);
  }
}

function queueWorkspaceSync() {
  if (!authState.user || !authState.token || !authState.workspace) return;
  clearTimeout(authState.syncTimer);
  authState.syncTimer = setTimeout(() => {
    void syncWorkspaceToServer().catch(() => {});
  }, 350);
}

function clampPackageQuantity(value) {
  return Math.max(0, Math.min(12, Number(value) || 0));
}

function setPackageQuantity(packageId, quantity) {
  const nextQuantity = clampPackageQuantity(quantity);
  draft.packageQuantities = {
    ...draft.packageQuantities,
    [packageId]: nextQuantity,
  };

  if (nextQuantity === 0) {
    delete draft.packageQuantities[packageId];
  }

  const activePackageId = selectedPackageRows()[0]?.id || packageId;
  draft.packageId = activePackageId;
}

function updateBookPage() {
  ensureRoomSelection();
  syncDraftToState();
  saveState();
  cleanExpiredHolds();
  applyTheme(state.camp.theme);
  renderBookPage();
}

async function confirmBookingReservation() {
  const guestName = document.getElementById("guestName")?.value.trim();
  const guestPhone = document.getElementById("guestPhone")?.value.trim();
  const guestEmail = document.getElementById("guestEmail")?.value.trim();
  const guestCountry = document.getElementById("guestCountry")?.value.trim();
  const notes = document.getElementById("guestNotes")?.value.trim();

  if (!guestName || !guestEmail || !guestPhone || !guestCountry) {
    alert("Please add guest name, phone, email, and country.");
    return;
  }

  const startDate = draft.startDate;
  const endDate = endDateForDraft();
  if (availableUnits(draft.roomId, startDate, endDate) <= 0) {
    alert("That room is no longer available for these dates.");
    return;
  }

  const now = new Date();
  const bookingPayload = {
    id: `intent-${now.getTime()}`,
    guestName,
    guestPhone,
    guestEmail,
    guestCountry,
    packageId: draft.packageId,
    packageQuantities: { ...draft.packageQuantities },
    roomId: draft.roomId,
    addonIds: [...draft.addonIds],
    startDate,
    endDate,
    total: totalPrice(),
    notes: notes || "",
    stage: "checkout",
    createdAt: now.toISOString(),
  };

  draft.guestName = guestName;
  draft.guestPhone = guestPhone;
  draft.guestEmail = guestEmail;
  draft.guestCountry = guestCountry;
  draft.notes = notes;

  try {
    const result = await apiJson("confirm-booking", {
      method: "POST",
      body: JSON.stringify({
        workspaceSlug: bookingSlug(),
        booking: bookingPayload,
      }),
    });

    if (result?.workspace) {
      hydrateStateFromWorkspace(result.workspace);
    } else {
      state.bookingIntents.unshift({ ...bookingPayload, stage: "confirmed" });
      state.bookings.unshift({
        id: `booking-${now.getTime()}`,
        ...bookingPayload,
        status: "confirmed",
        notes: notes || "Booking confirmed in demo mode.",
      });
      syncDraftToState();
      saveState();
    }
    state.bookingConfirmation = {
      bookingId: result?.booking?.id || `booking-${now.getTime()}`,
      emailStatus: result?.email?.status || "skipped",
      confirmedAt: now.toISOString(),
      guestEmail,
      guestName,
      reservationCode: result?.reservationCode || result?.booking?.reservationCode || "",
    };
    draft.bookingConfirmation = state.bookingConfirmation;
    syncDraftToState();
    saveState();
    trackAnalyticsEvent("checkout", {
      camp: bookingSlug(),
      package: getPackage(draft.packageId)?.name || draft.packageId,
      room: getRoom(draft.roomId)?.name || draft.roomId,
      total: totalPrice(),
    });
    alert(
      result?.email?.status === "sent"
        ? "Booking confirmed and confirmation email sent."
        : "Booking confirmed. Confirmation email will be sent when email delivery is configured.",
    );
    window.location.assign(confirmationUrl(state.bookingConfirmation.reservationCode, guestEmail));
  } catch (error) {
    state.bookingIntents.unshift({ ...bookingPayload, stage: "confirmed" });
    state.bookings.unshift({
      id: `booking-${now.getTime()}`,
      ...bookingPayload,
      status: "confirmed",
      notes: notes || "Booking confirmed locally.",
    });
    syncDraftToState();
    saveState();
    state.bookingConfirmation = {
      bookingId: `booking-${now.getTime()}`,
      emailStatus: "skipped",
      confirmedAt: now.toISOString(),
      guestEmail,
      guestName,
      reservationCode: `R${now.getTime().toString(36).slice(-4).toUpperCase()}`.slice(0, 5),
    };
    draft.bookingConfirmation = state.bookingConfirmation;
    saveState();
    trackAnalyticsEvent("checkout", {
      camp: bookingSlug(),
      package: getPackage(draft.packageId)?.name || draft.packageId,
      room: getRoom(draft.roomId)?.name || draft.roomId,
      total: totalPrice(),
    });
    alert(`Booking confirmed locally, but the server could not be reached: ${error instanceof Error ? error.message : "Unknown error"}`);
    window.location.assign(confirmationUrl(state.bookingConfirmation.reservationCode, guestEmail));
  }
}

function initBookInteractions() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest(
    "[data-step], [data-select-package], [data-select-room], [data-toggle-addon], [data-month-nav], [data-select-date], [data-package-row-change], [data-package-row-input], [data-go-step], #nextFromPackage, #continueToBook",
    );
    if (!target) return;

    if (target.dataset.step) {
      const nextStep = Number(target.dataset.step);
      if (nextStep <= draft.currentStep) {
        draft.currentStep = nextStep;
        updateBookPage();
      }
      return;
    }

    if (target.dataset.monthNav) {
      draft.calendarMonthOffset += Number(target.dataset.monthNav);
      renderBookPage();
      return;
    }

    if (target.dataset.selectDate) {
      draft.startDate = target.dataset.selectDate;
      state.bookingConfirmation = null;
      ensureRoomSelection();
      trackAnalyticsEvent("search", {
        camp: bookingSlug(),
        check_in: draft.startDate,
      });
      updateBookPage();
      return;
    }

    if (target.dataset.selectPackage) {
      draft.packageId = target.dataset.selectPackage;
      state.bookingConfirmation = null;
      ensureRoomSelection();
      updateBookPage();
      return;
    }

    if (target.dataset.selectRoom) {
      const roomId = target.dataset.selectRoom;
      if (availableUnits(roomId, draft.startDate, endDateForDraft()) <= 0) {
        alert("That room is sold out for the selected dates.");
        return;
      }
      draft.roomId = roomId;
      state.bookingConfirmation = null;
      updateBookPage();
      return;
    }

    if (target.dataset.packageRowChange) {
      const [packageId, delta] = target.dataset.packageRowChange.split(":");
      setPackageQuantity(packageId, packageQuantity(packageId) + Number(delta));
      state.bookingConfirmation = null;
      updateBookPage();
      return;
    }

    if (target.dataset.packageRowInput) {
      setPackageQuantity(target.dataset.packageRowInput, target.value);
      state.bookingConfirmation = null;
      updateBookPage();
      return;
    }

    if (target.id === "nextFromPackage") {
      if (!selectedPackageRows().length) {
        alert("Please choose at least one package row before continuing.");
        return;
      }
      draft.currentStep = 1;
      updateBookPage();
      return;
    }

    if (target.id === "nextFromDate") {
      draft.currentStep = 2;
      updateBookPage();
      return;
    }

    if (target.id === "nextFromRoom") {
      draft.currentStep = 3;
      trackAnalyticsEvent("add_to_cart", {
        camp: bookingSlug(),
        room: getRoom(draft.roomId)?.name || draft.roomId,
        package: getPackage(draft.packageId)?.name || draft.packageId,
        check_in: draft.startDate,
      });
      updateBookPage();
      return;
    }

    if (target.dataset.goStep) {
      draft.currentStep = Number(target.dataset.goStep);
      updateBookPage();
      return;
    }

    if (target.dataset.toggleAddon) {
      const addonId = target.dataset.toggleAddon;
      draft.addonIds = draft.addonIds.includes(addonId)
        ? draft.addonIds.filter((id) => id !== addonId)
        : [...draft.addonIds, addonId];
      state.bookingConfirmation = null;
      updateBookPage();
    }

    if (target.id === "continueToBook") {
      draft.currentStep = 4;
      state.bookingConfirmation = null;
      updateBookPage();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === "startDate") {
      draft.startDate = target.value;
      draft.calendarMonthOffset = monthOffsetBetween(new Date(), draft.startDate);
      state.bookingConfirmation = null;
      ensureRoomSelection();
      trackAnalyticsEvent("search", {
        camp: bookingSlug(),
        check_in: draft.startDate,
      });
      updateBookPage();
      return;
    }

    if (target.id === "guestName") draft.guestName = target.value;
    if (target.id === "guestPhone") draft.guestPhone = target.value;
    if (target.id === "guestEmail") draft.guestEmail = target.value;
    if (target.id === "guestCountry") draft.guestCountry = target.value;
    if (target.id === "guestNotes") draft.notes = target.value;
    syncDraftToState();
    saveState();
  });

  document.addEventListener("click", (event) => {
    if (event.target?.id === "bookButton") {
      void confirmBookingReservation();
    }

    const cancelBookingButton = event.target?.closest?.("[data-cancel-booking]");
    if (cancelBookingButton) {
      void cancelBookingReservation(
        cancelBookingButton.dataset.cancelBooking,
        cancelBookingButton.dataset.reservationCode || "",
      );
    }
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function initAdminInteractions() {
  const campForm = document.getElementById("campForm");
  const roomForm = document.getElementById("roomForm");
  const packageForm = document.getElementById("packageForm");
  const addonForm = document.getElementById("addonForm");
  const bookingUrlInput = document.getElementById("bookingUrl");
  const copyBookingUrlButton = document.getElementById("copyBookingUrl");
  const availabilityRoomSelect = document.getElementById("availabilityRoomSelect");
  const availabilityBasePrice = document.getElementById("availabilityBasePrice");
  const availabilityUpdateAllPrices = document.getElementById("availabilityUpdateAllPrices");
  const saveAvailabilityButton = document.getElementById("saveAvailability");

  if (bookingUrlInput) {
    bookingUrlInput.value = bookingUrl();
  }

  availabilityRoomSelect?.addEventListener("change", (event) => {
    adminUiState.availabilityRoomId = event.target.value;
    renderAdminPage();
  });

  availabilityUpdateAllPrices?.addEventListener("click", () => {
    const selectedRoom = getRoom(adminUiState.availabilityRoomId);
    const price = Math.max(0, Number(availabilityBasePrice?.value || selectedRoom.pricePerNight || 0));
    document
      .querySelectorAll(
        `[data-availability-room="${adminUiState.availabilityRoomId}"][data-availability-price]`,
      )
      .forEach((input) => {
        input.value = price;
      });
  });

  saveAvailabilityButton?.addEventListener("click", () => {
    ensureAvailabilityCoverage(state);
    state.camp.availability = state.camp.availability || {};
    state.camp.availability[adminUiState.availabilityRoomId] = {
      weeks: readAvailabilityMatrix(adminUiState.availabilityRoomId),
    };
    saveState();
    applyTheme(state.camp.theme);
    renderAdminPage();
  });

  copyBookingUrlButton?.addEventListener("click", async () => {
    const url = bookingUrl();
    try {
      await navigator.clipboard.writeText(url);
      copyBookingUrlButton.textContent = "Copied";
      setTimeout(() => {
        copyBookingUrlButton.textContent = "Copy link";
      }, 1800);
    } catch {
      alert(`Copy this link: ${url}`);
    }
  });

  campForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.camp.name = campForm.elements.campName.value.trim() || state.camp.name;

    const restrictedArrivalDays = campForm.elements.restrictedArrivalDays.checked;
    const allowedArrivalDays = Array.from(campForm.querySelectorAll('input[name="arrivalDays"]:checked')).map(
      (checkbox) => checkbox.value,
    );
    state.camp.bookingRules = {
      restrictedArrivalDays,
      allowedArrivalDays: allowedArrivalDays.length ? allowedArrivalDays : seedState.camp.bookingRules.allowedArrivalDays,
    };

    const logoFile = campForm.elements.logoFile.files?.[0];
    if (logoFile) {
      state.camp.logoUrl = await readFileAsDataUrl(logoFile);
    } else if (campForm.elements.logoUrl.value.trim()) {
      state.camp.logoUrl = campForm.elements.logoUrl.value.trim();
    }

    state.camp.theme = {
      ...(state.camp.theme || {}),
      bg: campForm.elements.bg.value,
      panel: campForm.elements.panel.value,
      panelSoft: campForm.elements.panelSoft.value,
      border: campForm.elements.border.value,
      text: campForm.elements.text.value,
      muted: campForm.elements.muted.value,
      accent: campForm.elements.accent.value,
      accentSoft: campForm.elements.accentSoft.value,
      titleFont: campForm.elements.titleFont.value,
      bodyFont: campForm.elements.bodyFont.value,
    };
    state.camp.analytics = {
      ga4Id: campForm.elements.ga4Id.value.trim(),
      pixelId: campForm.elements.pixelId.value.trim(),
    };
    state.camp.showBookingIntents = campForm.elements.showBookingIntents?.checked ?? true;

    saveState();
    applyTheme(state.camp.theme);
    renderAdminPage();
    if (bookingUrlInput) {
      bookingUrlInput.value = bookingUrl();
    }
  });

  roomForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const imageFile = roomForm.elements.image.files?.[0];
    let imageUrl =
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80";
    if (imageFile) imageUrl = await readFileAsDataUrl(imageFile);

    state.rooms.unshift({
      id: `room-${Date.now()}`,
      name: roomForm.elements.name.value.trim(),
      description: roomForm.elements.description.value.trim(),
      pricePerNight: Number(roomForm.elements.pricePerNight.value),
      totalUnits: Number(roomForm.elements.totalUnits.value),
      capacity: Number(roomForm.elements.capacity.value),
      imageUrl,
    });

    roomForm.reset();
    ensureAvailabilityCoverage(state);
    saveState();
    renderAdminPage();
  });

  packageForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.packages.unshift({
      id: `package-${Date.now()}`,
      name: packageForm.elements.name.value.trim(),
      description: packageForm.elements.description.value.trim(),
      nights: Number(packageForm.elements.nights.value),
      basePrice: Number(packageForm.elements.basePrice.value),
    });

    packageForm.reset();
    saveState();
    renderAdminPage();
  });

  addonForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.addons.unshift({
      id: `addon-${Date.now()}`,
      name: addonForm.elements.name.value.trim(),
      description: addonForm.elements.description.value.trim(),
      price: Number(addonForm.elements.price.value),
      unitLabel: addonForm.elements.unitLabel.value.trim(),
    });

    addonForm.reset();
    saveState();
    renderAdminPage();
  });
}

function init() {
  cleanExpiredHolds();
  applyTheme(state.camp.theme);
  renderLandingPage();
  initLandingAuth();

  if (document.getElementById("stepper")) {
    initBookInteractions();
    draft.calendarMonthOffset = monthOffsetBetween(new Date(), draft.startDate);
    ensureRoomSelection();
    renderBookPage();
    void loadPublicWorkspace();
  }

  if (document.getElementById("adminWorkspace")) {
    initNetlifyIdentityAuth();
    initAdminInteractions();
    renderAdminPage();
    updateAdminAuthUI(window.netlifyIdentity?.currentUser?.());
  }
}

init();
setInterval(() => {
  cleanExpiredHolds();
  if (document.getElementById("stepper")) renderBookPage();
  if (document.getElementById("adminWorkspace")) {
    renderAdminPage();
    void refreshAdminWorkspace({ silent: true });
  }
}, 30000);
