const STORAGE_KEY = "surfcamp-os-demo-v2";
const HOLD_MINUTES = 15;
const authState = {
  user: null,
  token: null,
  workspace: null,
  workspaceLoaded: false,
  syncTimer: null,
};

const bookingUiState = {
  submitting: false,
};

const adminUiState = {
  availabilityRoomId: "shared-double",
  activeTab: "bookings",
  configTab: "packages",
  bookingSort: { key: "createdAt", direction: "desc" },
  leadSort: { key: "createdAt", direction: "desc" },
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
    customerFields: [],
    bookingRules: {
      restrictedArrivalDays: true,
      allowedArrivalDays: ["Saturday"],
      availabilityLowThreshold: 5,
      availabilityMidThreshold: 15,
      availabilityCountVisibilityThreshold: null,
    },
  },
  currentStep: 0,
  selectedPackageId: "package-7",
  packageQuantities: {},
  selectedRoomId: "",
  selectedAddonIds: [],
  customerFieldValues: {},
  startDate: "",
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  guestCountry: "",
  guestBirthDay: "",
  guestBirthMonth: "",
  guestBirthYear: "",
  guestGender: "",
  notes: "",
  bookingConfirmation: null,
  leads: [],
  bookingIntents: [],
  promos: [],
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
  ],
  addons: [
    {
      id: "airport-transfer",
      name: "Airport transfer",
      description: "One-way transfer from the airport to the camp.",
      price: 45,
      unitLabel: "per stay",
      imageUrl:
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "board-rental",
      name: "Extra board rental",
      description: "Reserve an extra surfboard for the stay.",
      price: 80,
      unitLabel: "per stay",
      imageUrl:
        "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "yoga-pack",
      name: "Daily yoga",
      description: "Morning yoga session added to the booking.",
      price: 120,
      unitLabel: "per stay",
      imageUrl:
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  bookings: [
    {
      id: "demo-001",
  guestName: "Ava",
      guestEmail: "ava@example.com",
      guestCountry: "Germany",
      guestGender: "Female",
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
      guestGender: "Male",
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
  const date = parseDateValue(dateInput) || new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function localDateKey(dateInput) {
  const date = parseDateValue(dateInput);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekKeyForDate(dateInput) {
  const weekStart = startOfWeek(dateInput);
  return localDateKey(weekStart);
}

function createSeedAvailability(rooms, weeks = 12) {
  const availability = {};
  const start = startOfWeek(new Date());

  rooms.forEach((room) => {
    availability[room.id] = { weeks: {} };
    for (let i = 0; i < weeks; i += 1) {
      const cursor = new Date(start);
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

seedState.camp.availability = createSeedAvailability(seedState.rooms);

const state = loadState();
const draft = {
  packageId: state.selectedPackageId,
  packageQuantities: { ...(state.packageQuantities || {}) },
  roomId: state.selectedRoomId,
  addonIds: [...state.selectedAddonIds],
  customerFieldValues: { ...(state.customerFieldValues || {}) },
  startDate: state.startDate || "",
  calendarMonthOffset: 0,
  guestName: state.guestName,
  guestEmail: state.guestEmail,
  guestCountry: state.guestCountry,
  guestBirthDay: state.guestBirthDay || "",
  guestBirthMonth: state.guestBirthMonth || "",
  guestBirthYear: state.guestBirthYear || "",
  guestGender: state.guestGender,
  notes: state.notes,
  promoCodeInput: state.promoCodeInput || "",
  promoCodes: [...(state.promoCodes || [])],
  promoError: state.promoError || "",
  currentStep: state.currentStep ?? 0,
  bookingIntentId: state.bookingIntentId || "",
};

function nextDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return firstAllowedStartDate(localDateKey(date), seedState.camp.bookingRules);
}

function normalizeWorkspaceData(data = {}) {
  const normalizeOrderedCollection = (items = []) =>
    items
      .map((item, index) => ({
        ...item,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
      }))
      .sort((a, b) => a.order - b.order);

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
      customerFields: Array.isArray(data?.camp?.customerFields)
        ? data.camp.customerFields.map(normalizeCustomerField)
        : structuredClone(seedState.camp.customerFields || []),
      bookingRules: {
        ...seedState.camp.bookingRules,
        ...((data.camp && data.camp.bookingRules) || {}),
        availabilityLowThreshold: Number.isFinite(Number(data?.camp?.bookingRules?.availabilityLowThreshold))
          ? Math.max(1, Number(data.camp.bookingRules.availabilityLowThreshold))
          : seedState.camp.bookingRules.availabilityLowThreshold,
        availabilityMidThreshold: Number.isFinite(Number(data?.camp?.bookingRules?.availabilityMidThreshold))
          ? Math.max(
              Math.max(
                1,
                Number(data?.camp?.bookingRules?.availabilityLowThreshold ?? seedState.camp.bookingRules.availabilityLowThreshold),
              ),
              Number(data.camp.bookingRules.availabilityMidThreshold),
            )
          : seedState.camp.bookingRules.availabilityMidThreshold,
        availabilityCountVisibilityThreshold:
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === "" ||
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === null ||
          data?.camp?.bookingRules?.availabilityCountVisibilityThreshold === undefined
            ? null
            : Math.max(0, Number(data.camp.bookingRules.availabilityCountVisibilityThreshold)),
      },
      availability: {
        ...(seedState.camp.availability || {}),
        ...((data.camp && data.camp.availability) || {}),
      },
      slug: (data.camp && data.camp.slug) || slugify((data.camp && data.camp.name) || seedState.camp.name),
    },
    packages: Array.isArray(data.packages)
      ? normalizeOrderedCollection(data.packages)
      : normalizeOrderedCollection(structuredClone(seedState.packages)),
    rooms: Array.isArray(data.rooms)
      ? normalizeOrderedCollection(data.rooms)
      : normalizeOrderedCollection(structuredClone(seedState.rooms)),
    addons: Array.isArray(data.addons)
      ? normalizeOrderedCollection(data.addons)
      : normalizeOrderedCollection(structuredClone(seedState.addons)),
    promos: Array.isArray(data.promos)
      ? normalizeOrderedCollection(data.promos)
      : normalizeOrderedCollection(structuredClone(seedState.promos || [])),
    bookings: Array.isArray(data.bookings) ? data.bookings : structuredClone(seedState.bookings),
    leads: Array.isArray(data.leads) ? data.leads : [],
    bookingIntents: Array.isArray(data.bookingIntents) ? data.bookingIntents : [],
    selectedAddonIds: [],
    customerFieldValues:
      data.customerFieldValues && typeof data.customerFieldValues === "object" ? data.customerFieldValues : {},
    selectedPackageId: data.selectedPackageId || seedState.selectedPackageId,
    packageQuantities: {},
    selectedRoomId: "",
    startDate: "",
    guestName: data.guestName || "",
    guestPhone: data.guestPhone || "",
    guestEmail: data.guestEmail || "",
    guestCountry: data.guestCountry || "",
    guestBirthDay: data.guestBirthDay || "",
    guestBirthMonth: data.guestBirthMonth || "",
    guestBirthYear: data.guestBirthYear || "",
    guestGender: data.guestGender || "",
    notes: data.notes || "",
    bookingConfirmation: data.bookingConfirmation || null,
    promoCodeInput: data.promoCodeInput || "",
    promoCodes: Array.isArray(data.promoCodes) ? data.promoCodes.map(normalizePromoCode).filter(Boolean) : [],
    promoError: data.promoError || "",
    currentStep: Number.isFinite(data.currentStep) ? data.currentStep : 0,
    bookingIntentId: data.bookingIntentId || "",
  };
}

function normalizePromoCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function parsePromoCodes(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map(normalizePromoCode)
        .filter(Boolean),
    ),
  );
}

function promoMatchesCode(promo, code) {
  return normalizePromoCode(promo?.code) === normalizePromoCode(code);
}

function selectedPromos() {
  const codes = Array.isArray(draft.promoCodes) ? draft.promoCodes : [];
  return codes
    .map((code) => ({
      code,
      promo: orderedItems(state.promos).find((item) => promoMatchesCode(item, code)) || null,
    }))
    .filter((item) => item.promo);
}

function selectedPromoCodes() {
  return selectedPromos().map((item) => item.code);
}

function selectedFreeAddonIds() {
  return Array.from(
    new Set(
      selectedPromos()
        .filter((item) => item.promo.type === "free-addon")
        .map((item) => item.promo.addonId)
        .filter(Boolean),
    ),
  );
}

function selectedPercentPromos() {
  return selectedPromos()
    .filter((item) => item.promo.type === "percent")
    .map((item) => Math.max(0, Math.min(100, Number(item.promo.percent) || 0)))
    .filter((value) => value > 0);
}

function selectedPromoCodeLabel() {
  return selectedPromoCodes().join(", ");
}

function promoAddonLabel(addonId) {
  return selectedFreeAddonIds().includes(addonId) ? "Free with promo" : "";
}

function promoFreeAddonValue(addonId) {
  return selectedFreeAddonIds().includes(addonId) ? 0 : Number(getAddon(addonId)?.price || 0);
}

function promoTotals() {
  const packageTotal = packagePrice();
  const roomTotal = roomPrice();
  const baseAddonTotal = draft.addonIds.reduce((sum, addonId) => sum + Number(getAddon(addonId)?.price || 0), 0);
  const freeAddonDiscount = draft.addonIds.reduce(
    (sum, addonId) => sum + (selectedFreeAddonIds().includes(addonId) ? Number(getAddon(addonId)?.price || 0) : 0),
    0,
  );
  const subtotal = packageTotal + roomTotal + baseAddonTotal - freeAddonDiscount;
  const percentPromos = selectedPercentPromos();
  const totalAfterPercent = percentPromos.reduce((running, percent) => running - running * (percent / 100), subtotal);
  const roundedTotal = Math.max(0, Math.round(totalAfterPercent));
  return {
    packageTotal,
    roomTotal,
    baseAddonTotal,
    freeAddonDiscount,
    percentPromos,
    subtotal,
    total: roundedTotal,
    discountTotal: Math.max(0, subtotal - roundedTotal),
  };
}

function promoBookingSummary() {
  const totals = promoTotals();
  return {
    codes: selectedPromoCodes(),
    freeAddonIds: selectedFreeAddonIds(),
    percentPromos: selectedPercentPromos(),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
  };
}

function applyPromoCodesFromInput(rawValue) {
  const codes = parsePromoCodes(rawValue);
  const validCodes = [];
  const invalidCodes = [];
  const promos = orderedItems(state.promos);

  codes.forEach((code) => {
    if (promos.some((item) => promoMatchesCode(item, code))) {
      validCodes.push(normalizePromoCode(code));
    } else {
      invalidCodes.push(normalizePromoCode(code));
    }
  });

  draft.promoCodeInput = rawValue;
  draft.promoCodes = validCodes;
  draft.promoError = invalidCodes.length ? `Unknown promo code${invalidCodes.length > 1 ? "s" : ""}: ${invalidCodes.join(", ")}` : "";
  state.bookingConfirmation = null;
  syncDraftToState();
  upsertCheckoutLead("checkout");
  saveState();
  updateBookPage();
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
    return normalizeWorkspaceData();
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
  const amount = Math.max(0, Number(value) || 0);
  return `\u20AC ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  const date = parseDateValue(value);
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function weekdayName(dateInput) {
  const date = parseDateValue(dateInput);
  if (!date) return "";
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
}

function addDays(dateInput, days) {
  const date = parseDateValue(dateInput);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function startOfMonth(dateInput) {
  const date = parseDateValue(dateInput) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(dateInput, months) {
  const date = parseDateValue(dateInput) || new Date();
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthOffsetBetween(a, b) {
  const start = startOfMonth(a);
  const end = parseDateValue(b) ? startOfMonth(b) : start;
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function formatMonthLabel(dateInput) {
  const date = parseDateValue(dateInput);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
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

function availabilityThresholds(bookingRules = state?.camp?.bookingRules || seedState.camp.bookingRules) {
  const lowThreshold = Math.max(
    1,
    Number.isFinite(Number(bookingRules?.availabilityLowThreshold))
      ? Number(bookingRules.availabilityLowThreshold)
      : seedState.camp.bookingRules.availabilityLowThreshold,
  );
  const midThreshold = Math.max(
    lowThreshold,
    Number.isFinite(Number(bookingRules?.availabilityMidThreshold))
      ? Number(bookingRules.availabilityMidThreshold)
      : seedState.camp.bookingRules.availabilityMidThreshold,
  );
  const showCountThreshold =
    bookingRules?.availabilityCountVisibilityThreshold === "" ||
    bookingRules?.availabilityCountVisibilityThreshold === null ||
    bookingRules?.availabilityCountVisibilityThreshold === undefined
      ? null
      : Math.max(0, Number(bookingRules.availabilityCountVisibilityThreshold));

  return { lowThreshold, midThreshold, showCountThreshold };
}

function firstAllowedStartDate(afterDate = nextDefaultDate(), bookingRules = seedState.camp.bookingRules) {
  const cursor = parseDateValue(afterDate) || new Date();
  for (let i = 0; i < 120; i += 1) {
    const candidate = localDateKey(cursor);
    if (isArrivalAllowed(candidate, bookingRules)) return candidate;
    cursor.setDate(cursor.getDate() + 1);
  }
  return afterDate;
}

function hasAvailabilityForDate(startDate) {
  return campSpotsLeftForDate(startDate) > 0;
}

function firstBookableStartDate(afterDate = nextDefaultDate(), bookingRules = seedState.camp.bookingRules) {
  const cursor = parseDateValue(afterDate) || new Date();
  for (let i = 0; i < 180; i += 1) {
    const candidate = localDateKey(cursor);
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
  if (!draft.startDate) return;
  if (!isSelectableDate(draft.startDate)) {
    draft.startDate = "";
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
  return state.rooms.find((item) => item.id === id) || null;
}

function getAddon(id) {
  return state.addons.find((item) => item.id === id);
}

function orderedItems(items = []) {
  return items
    .map((item, index) => ({
      ...item,
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }))
    .sort((a, b) => a.order - b.order);
}

function nextOrderValue(items = []) {
  return orderedItems(items).reduce((max, item) => Math.max(max, item.order), -1) + 1;
}

function compareAdminValues(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return -1;
  if (b === null || b === undefined || b === "") return 1;
  const aDate = parseDateValue(a);
  const bDate = parseDateValue(b);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortAdminRows(rows, sortState, accessors) {
  const key = sortState?.key;
  const direction = sortState?.direction === "asc" ? 1 : -1;
  const accessor = accessors?.[key] || (() => "");
  return [...rows].sort((a, b) => compareAdminValues(accessor(a), accessor(b)) * direction);
}

function toggleSortState(sortState, key) {
  if (!sortState || sortState.key !== key) {
    return { key, direction: "asc" };
  }
  return { key, direction: sortState.direction === "asc" ? "desc" : "asc" };
}

function moveOrderedItem(collectionName, itemId, direction) {
  const items = orderedItems(state[collectionName] || []);
  const index = items.findIndex((item) => item.id === itemId);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return false;

  const nextItems = items.slice();
  [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  state[collectionName] = nextItems.map((item, order) => ({ ...item, order }));
  return true;
}

function normalizeCustomerField(field = {}, index = 0) {
  const label = String(field.label || "").trim();
  const key = String(field.key || "").trim() || slugify(label) || `field-${index + 1}`;
  const type = ["text", "number", "textarea", "select"].includes(field.type) ? field.type : "text";
  const options = Array.isArray(field.options)
    ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
    : String(field.options || "")
        .split(/[\n,]+/)
        .map((option) => String(option || "").trim())
        .filter(Boolean);

  return {
    id: field.id || `customer-field-${key}`,
    key,
    label,
    type,
    required: !!field.required,
    placeholder: String(field.placeholder || ""),
    options,
    order: Number.isFinite(Number(field.order)) ? Number(field.order) : index,
  };
}

function customerFieldDefinitions() {
  return orderedItems(state.camp.customerFields || []).map(normalizeCustomerField);
}

function customerFieldDomId(field) {
  return `customerField_${field.id || field.key}`;
}

function customerFieldValue(fieldKey) {
  return String(draft.customerFieldValues?.[fieldKey] ?? "");
}

function countryOptions() {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      return Intl.supportedValuesOf("region")
        .map((code) => {
          const label = displayNames.of(code);
          return label && label !== code ? { value: label, label } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch {
    // Fall back to a curated list below.
  }

  return [
    "Argentina",
    "Australia",
    "Belgium",
    "Brazil",
    "Canada",
    "Chile",
    "Denmark",
    "Egypt",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "India",
    "Ireland",
    "Italy",
    "Japan",
    "Mexico",
    "Morocco",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Portugal",
    "South Africa",
    "Spain",
    "Sweden",
    "Switzerland",
    "Thailand",
    "United Kingdom",
    "United States",
  ].map((name) => ({ value: name, label: name }));
}

function endDateForDraft() {
  if (!draft.startDate) return "";
  return addDays(draft.startDate, bookingNights());
}

function weekKeysBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const keys = [];
  const cursor = startOfWeek(startDate);
  const endCursor = startOfWeek(addDays(endDate, -1));
  while (cursor <= endCursor) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return keys;
}

function roomAvailabilityRow(roomId, dateInput) {
  return state.camp.availability?.[roomId]?.weeks?.[weekKeyForDate(dateInput)] || null;
}

function roomNightRate(roomId, dateInput) {
  const room = getRoom(roomId);
  return Number(roomAvailabilityRow(roomId, dateInput)?.pricePerNight ?? room?.pricePerNight ?? 0);
}

function roomNightlySurcharge(roomId) {
  return Number(getRoom(roomId)?.pricePerNight ?? 0);
}

function formatSurcharge(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (!amount) return "";
  return `+${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)} \u20AC`;
}

function previewStayNights() {
  return bookingNights() || Number(orderedItems(state.packages)[0]?.nights || seedState.packages[0]?.nights || 7);
}

function campSpotsLeftForDate(startDate, nights = previewStayNights()) {
  if (!startDate) return 0;

  const endDate = addDays(startDate, nights);
  const weeks = weekKeysBetween(startDate, endDate);
  if (!weeks.length) return 0;

  const rooms = orderedItems(state.rooms);
  const weekTotals = weeks.map((weekKey) =>
    rooms.reduce((sum, room) => {
      const row = state.camp.availability?.[room.id]?.weeks?.[weekKey];
      const totalRooms = Number(row?.units ?? room.totalUnits ?? 0);
      const bookedRooms = bookedUnitsForWeek(room.id, weekKey);
      return sum + Math.max(0, totalRooms - bookedRooms) * Number(room.capacity || 0);
    }, 0),
  );

  return Math.max(0, Math.min(...weekTotals));
}

function availabilityBandClass(spots) {
  const { lowThreshold, midThreshold } = availabilityThresholds();
  if (spots <= 0) return "soldout-day";
  if (spots <= lowThreshold) return "availability-low";
  if (spots <= midThreshold) return "availability-mid";
  return "availability-high";
}

function roomAvailableSpots(roomId, startDate = draft.startDate, endDate = endDateForDraft()) {
  const room = getRoom(roomId);
  return availableUnits(roomId, startDate, endDate) * Number(room?.capacity || 0);
}

function roomCanFitParty(
  roomId,
  startDate = draft.startDate,
  endDate = endDateForDraft(),
  guestCount = selectedPackagePeopleCount(),
) {
  return roomAvailableSpots(roomId, startDate, endDate) >= Math.max(0, Number(guestCount) || 0);
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
      const key = localDateKey(cursor);
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
  return orderedItems(state.packages)
    .map((item) => ({
      ...item,
      quantity: packageQuantity(item.id),
    }))
    .filter((item) => item.quantity > 0);
}

function selectedPackagePeopleCount() {
  return selectedPackageRows().reduce((sum, item) => sum + item.quantity, 0);
}

function addonQuantity(addonId) {
  return draft.addonIds.filter((id) => id === addonId).length;
}

function selectedAddonRows() {
  return orderedItems(state.addons)
    .map((item) => ({
      ...item,
      quantity: addonQuantity(item.id),
    }))
    .filter((item) => item.quantity > 0);
}

function normalizeAddonSelections() {
  const guestLimit = selectedPackagePeopleCount();
  if (!draft.addonIds.length || guestLimit <= 0) {
    draft.addonIds = [];
    return;
  }

  const counts = new Map();
  draft.addonIds = draft.addonIds.filter((addonId) => {
    const nextCount = (counts.get(addonId) || 0) + 1;
    if (nextCount > guestLimit) return false;
    counts.set(addonId, nextCount);
    return true;
  });
}

function setAddonQuantity(addonId, quantity) {
  const guestLimit = selectedPackagePeopleCount();
  const nextQuantity = Math.max(0, Math.min(guestLimit, Number(quantity) || 0));
  const remaining = draft.addonIds.filter((id) => id !== addonId);
  draft.addonIds = [...remaining, ...Array.from({ length: nextQuantity }, () => addonId)];
}

function bookingNights() {
  if (!draft.startDate || !selectedPackageRows().length) {
    return 0;
  }
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

function firstRoomForParty(
  startDate = draft.startDate,
  endDate = endDateForDraft(),
  guestCount = selectedPackagePeopleCount(),
) {
  return state.rooms.find((room) => roomCanFitParty(room.id, startDate, endDate, guestCount))?.id || null;
}

function ensureRoomSelection() {
  if (!draft.roomId) return;
  if (roomCanFitParty(draft.roomId, draft.startDate, endDateForDraft(), selectedPackagePeopleCount())) return;
  draft.roomId = "";
}

function roomPrice() {
  if (!draft.startDate || !draft.roomId) return 0;
  const nights = bookingNights();
  if (!nights) return 0;
  return roomNightlySurcharge(draft.roomId) * nights;
}

function packagePrice() {
  return selectedPackageRows().reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
}

function addonPrice() {
  return promoTotals().baseAddonTotal - promoTotals().freeAddonDiscount;
}

function totalPrice() {
  return promoTotals().total;
}

function availabilityText(room) {
  const snapshot = roomAvailabilitySnapshot(room.id);
  if (snapshot.forSale <= 0) return { label: "Sold out", cls: "empty" };
  const { showCountThreshold } = availabilityThresholds();
  if (showCountThreshold !== null && snapshot.forSale > showCountThreshold) {
    return { label: "", cls: "" };
  }
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
  const iso = localDateKey(cellDate);
  const inMonth = cellDate.getMonth() === monthDate.getMonth();
  const selected = iso === draft.startDate;
  const rangeStart = draft.startDate;
  const rangeEnd = endDateForDraft();
  const inRange = !selected && rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd;
  const isStart = selected;
  const selectable = inMonth && isSelectableDate(iso);
  const spotsLeft = inMonth && isArrivalAllowed(iso, state.camp.bookingRules) ? campSpotsLeftForDate(iso) : 0;
  const soldOut = inMonth && isArrivalAllowed(iso, state.camp.bookingRules) && spotsLeft <= 0;
  const availabilityClass = soldOut ? "soldout-day" : availabilityBandClass(spotsLeft);
  const { showCountThreshold } = availabilityThresholds();
  const shouldShowCount = soldOut || showCountThreshold === null || spotsLeft <= showCountThreshold;
  const dayStatus = soldOut ? "FULL" : shouldShowCount && spotsLeft > 0 ? `${spotsLeft} left` : "";

  const classes = [
    "day-cell",
    inMonth ? "" : "muted-day",
    selectable ? "" : "disabled-day",
    availabilityClass,
    inRange ? "in-range" : "",
    isStart ? "range-start" : "",
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
      ${dayStatus ? `<span class="day-status">${dayStatus}</span>` : ""}
    </button>
  `;
}

function renderMonthCard(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = startOfWeek(firstDay);
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
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>
      <div class="month-grid">${cells.join("")}</div>
    </section>
  `;
}

function renderDateSelector() {
  const baseMonth = addMonths(startOfMonth(new Date()), draft.calendarMonthOffset);
  const nextMonth = addMonths(baseMonth, 1);
  const singleMonth = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 720px)").matches;

  return `
    <section class="calendar-card">
      <div class="date-intro">
        <h3>2. Select your check-in date</h3>
      </div>
      <div class="calendar-head">
        <div class="calendar-nav">
          <button type="button" class="nav-button" data-month-nav="-1" aria-label="Previous month">&lt;</button>
          <button type="button" class="nav-button" data-month-nav="1" aria-label="Next month">&gt;</button>
        </div>
      </div>

      <div class="calendar-grid-wrap">
        ${renderMonthCard(baseMonth)}
        ${singleMonth ? "" : renderMonthCard(nextMonth)}
      </div>

      <div class="calendar-note">
        ${state.camp.bookingRules?.restrictedArrivalDays
          ? `Arrival days: ${state.camp.bookingRules.allowedArrivalDays.join(", ")}`
          : "Any arrival day is allowed."}
      </div>

    </section>
  `;
}

function renderPromoEntry({ variant = "desktop" } = {}) {
  const inputId = variant === "mobile" ? "promoCodeInputMobile" : "promoCodeInputDesktop";
  const applyId = variant === "mobile" ? "applyPromoCodeMobile" : "applyPromoCodeDesktop";
  const promos = selectedPromos();

  return `
    <div class="promo-entry ${variant === "mobile" ? "promo-entry-mobile" : "promo-entry-desktop"}">
      <label class="field promo-field">
        Promo code
        <div class="copy-row promo-row">
          <input id="${inputId}" type="text" value="${escapeHtml(draft.promoCodeInput || "")}" placeholder="Enter code" />
          <button type="button" class="button button-secondary promo-apply-button" id="${applyId}" data-apply-promo="${variant}">
            Apply
          </button>
        </div>
      </label>
      ${draft.promoError ? `<div class="promo-error">${escapeHtml(draft.promoError)}</div>` : ""}
      ${
        promos.length
          ? `<div class="promo-chips">${promos
              .map((item) => {
                const label =
                  item.promo.type === "percent"
                    ? `${item.code} · ${item.promo.percent}% off`
                    : `${item.code} · free ${getAddon(item.promo.addonId)?.name || "add-on"}`;
                return `<span class="promo-chip">${escapeHtml(label)}</span>`;
              })
              .join("")}</div>`
          : ""
      }
    </div>
  `;
}

function customerDetailsPayload() {
  const customFields = {};
  for (const field of customerFieldDefinitions()) {
    customFields[field.key] = customerFieldValue(field.key);
  }

  return {
    country: draft.guestCountry || "",
    dateOfBirth: {
      day: draft.guestBirthDay || "",
      month: draft.guestBirthMonth || "",
      year: draft.guestBirthYear || "",
    },
    gender: draft.guestGender || "",
    notes: draft.notes || "",
    customFields,
  };
}

function customerDetailsSummaryText(customerDetails = {}) {
  const parts = [];
  const dateOfBirth = customerDetails.dateOfBirth || {};
  const dobParts = [dateOfBirth.day, dateOfBirth.month, dateOfBirth.year].filter(Boolean);
  if (dobParts.length) {
    parts.push(`DOB ${dobParts.join("/")}`);
  }

  const customFields = customerDetails.customFields || {};
  for (const [key, value] of Object.entries(customFields)) {
    if (value) {
      const field = customerFieldDefinitions().find((entry) => entry.key === key);
      parts.push(`${field?.label || key}: ${value}`);
    }
  }

  return parts.join(" · ");
}

function renderCustomerFieldControl(field) {
  const fieldId = customerFieldDomId(field);
  const value = customerFieldValue(field.key);
  const options = field.options || [];
  const required = field.required ? "required" : "";

  if (field.type === "textarea") {
    return `
      <label class="field" id="${fieldId}">
        ${escapeHtml(field.label)}
        <textarea
          data-customer-field="${escapeHtml(field.key)}"
          placeholder="${escapeHtml(field.placeholder || "")}"
          ${required}
        >${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    return `
      <label class="field" id="${fieldId}">
        ${escapeHtml(field.label)}
        <select data-customer-field="${escapeHtml(field.key)}" ${required}>
          <option value="">Select ${escapeHtml(field.label.toLowerCase())}</option>
          ${options
            .map(
              (option) => `
                <option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>
              `,
            )
            .join("")}
        </select>
      </label>
    `;
  }

  return `
    <label class="field" id="${fieldId}">
      ${escapeHtml(field.label)}
      <input
        data-customer-field="${escapeHtml(field.key)}"
        type="${field.type === "number" ? "number" : "text"}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(field.placeholder || "")}"
        ${required}
      />
    </label>
  `;
}

function renderBookPage() {
  const logo = document.getElementById("campLogo");
  const name = document.getElementById("campName");
  const stepper = document.getElementById("stepper");
  const wizard = document.getElementById("wizardContent");
  const summary = document.getElementById("summaryPanel");
  const summaryActionsShell = document.getElementById("summaryActionsShell");

  if (!stepper || !wizard || !summary || !summaryActionsShell) return;

  if (logo) logo.src = state.camp.logoUrl;
  if (name) name.textContent = state.camp.name;
  applyTheme(state.camp.theme);

  ensureRoomSelection();

  const maxUnlockedStep = Math.max(0, draft.currentStep);
  const orderedPackages = orderedItems(state.packages);
  const orderedRooms = orderedItems(state.rooms);
  const orderedAddons = orderedItems(state.addons);
  const addonGuestLimit = selectedPackagePeopleCount();
  const addonRows = selectedAddonRows();
  const customerFields = customerFieldDefinitions();
  const countryChoices = countryOptions();

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

  const packageCards = orderedPackages
    .map((item) => {
      const quantity = packageQuantity(item.id);
      return `
        <article class="package-row">
          <div class="option-body">
            <h3>${item.name}</h3>
            <p>${item.nights} nights</p>
            <details class="package-more">
              <summary>More...</summary>
              <p>${item.description}</p>
            </details>
            <div class="option-meta">
              <span>From ${money(item.basePrice)}</span>
            </div>
          </div>
          <div class="package-row-actions">
            <span class="tiny">People</span>
            <div class="people-control" role="group" aria-label="${item.name} people count">
              <button type="button" class="people-button" data-package-row-change="${item.id}:-1">-</button>
              <div class="people-count" aria-live="polite" aria-label="${item.name} quantity">${quantity}</div>
              <button type="button" class="people-button" data-package-row-change="${item.id}:1">+</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const roomCards = orderedRooms
    .map((room) => {
      const selected = room.id === draft.roomId;
      const fitsParty = roomCanFitParty(room.id);
      const stayPrice = draft.startDate && bookingNights() ? roomNightlySurcharge(room.id) * bookingNights() : 0;
      return `
        <article class="option-card ${selected ? "selected" : ""} ${fitsParty ? "" : "unavailable"}" data-select-room="${room.id}" ${fitsParty ? "" : 'aria-disabled="true"'}>
          <div class="option-media">${room.imageUrl ? `<img src="${room.imageUrl}" alt="${room.name}" />` : ""}</div>
          <div class="option-body">
            <h3>${room.name}</h3>
            <p>${room.description}</p>
            ${
              room.learnMoreUrl
                ? `<a class="learn-more-link" href="${escapeHtml(room.learnMoreUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Learn more</a>`
                : ""
            }
            <div class="option-meta">
              <span>${stayPrice ? formatSurcharge(stayPrice) : ""}</span>
            </div>
            <div class="tiny">${room.capacity} guests per room</div>
          </div>
        </article>
      `;
    })
    .join("");

  const addonCards = orderedAddons
    .map((addon) => {
      const quantity = addonQuantity(addon.id);
      const canIncrease = quantity < addonGuestLimit;
      const promoFree = promoFreeAddonValue(addon.id) === 0;
      return `
        <article class="option-card addon-card ${quantity > 0 ? "selected" : ""}">
          <div class="option-media">${addon.imageUrl ? `<img src="${addon.imageUrl}" alt="${addon.name}" />` : ""}</div>
          <div class="option-body">
            <h3>${addon.name}</h3>
            <p>${addon.description}</p>
            <div class="option-meta">
              <span>${promoFree ? "Free with promo" : money(addon.price)}</span>
              <span>${addon.unitLabel || "per stay"}</span>
            </div>
          </div>
          <div class="package-row-actions addon-row-actions">
            <span class="tiny">People</span>
            <div class="people-control" role="group" aria-label="${addon.name} quantity">
              <button type="button" class="people-button" data-addon-row-change="${addon.id}:-1" ${quantity <= 0 ? "disabled" : ""} aria-label="Decrease ${addon.name}">-</button>
              <div class="people-count" aria-live="polite" aria-label="${addon.name} quantity">${quantity}</div>
              <button type="button" class="people-button" data-addon-row-change="${addon.id}:1" ${canIncrease ? "" : "disabled"} aria-label="Increase ${addon.name}">+</button>
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
        </div>
        <div class="stack">${packageCards}</div>
        <div class="mobile-only">
          ${renderPromoEntry({ variant: "mobile" })}
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
        </div>
        <div class="card-grid">${roomCards}</div>
      </section>
    `,
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>4. Select add-ons</h3>
            <p class="helper">Choose quantities up to the number of guests in your booking.</p>
          </div>
        </div>
        <div class="card-grid addon-grid">${addonCards}</div>
      </section>
    `,
    `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>5. Book</h3>
            <p class="helper">We save the guest details before confirming the reservation.</p>
          </div>
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
                <label class="field" id="fieldGuestName">
                  Guest name
                  <input id="guestName" type="text" value="${escapeHtml(draft.guestName)}" />
                </label>
                <label class="field" id="fieldGuestEmail">
                  Email
                  <input id="guestEmail" type="email" value="${escapeHtml(draft.guestEmail)}" />
                </label>
              </div>
              <div class="input-row" style="margin-top: 14px;">
                <label class="field" id="fieldGuestPhone">
                  Phone
                  <input id="guestPhone" type="tel" value="${escapeHtml(draft.guestPhone)}" />
                </label>
                <label class="field" id="fieldGuestCountry">
                  Country
                  <select id="guestCountry">
                    <option value="">Select country</option>
                    ${countryChoices
                      .map(
                        (country) =>
                          `<option value="${escapeHtml(country.value)}" ${draft.guestCountry === country.value ? "selected" : ""}>${escapeHtml(country.label)}</option>`,
                      )
                      .join("")}
                    ${
                      draft.guestCountry && !countryChoices.some((country) => country.value === draft.guestCountry)
                        ? `<option value="${escapeHtml(draft.guestCountry)}" selected>${escapeHtml(draft.guestCountry)}</option>`
                        : ""
                    }
                  </select>
                </label>
              </div>
              <div class="three-col dob-row" style="margin-top: 14px;">
                <div class="field" id="fieldGuestBirthDate" style="grid-column: 1 / -1;">
                  Birth date
                  <div class="three-col" style="margin-top: 8px;">
                    <label class="field" id="fieldGuestBirthDay">
                      <input
                        id="guestBirthDay"
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        placeholder="Day"
                        value="${escapeHtml(draft.guestBirthDay)}"
                      />
                    </label>
                    <label class="field" id="fieldGuestBirthMonth">
                      <select id="guestBirthMonth">
                        <option value="">Month</option>
                        ${[
                          "January",
                          "February",
                          "March",
                          "April",
                          "May",
                          "June",
                          "July",
                          "August",
                          "September",
                          "October",
                          "November",
                          "December",
                        ]
                          .map(
                            (month, index) =>
                              `<option value="${String(index + 1)}" ${String(draft.guestBirthMonth) === String(index + 1) ? "selected" : ""}>${month}</option>`,
                          )
                          .join("")}
                      </select>
                    </label>
                    <label class="field" id="fieldGuestBirthYear">
                      <input
                        id="guestBirthYear"
                        type="number"
                        min="1900"
                        max="${new Date().getFullYear()}"
                        step="1"
                        placeholder="Year"
                        value="${escapeHtml(draft.guestBirthYear)}"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <label class="field" id="fieldGuestGender" style="margin-top: 14px;">
                Gender
                <select id="guestGender">
                  <option value="" ${draft.guestGender ? "" : "selected"}>Select gender</option>
                  <option value="Female" ${draft.guestGender === "Female" ? "selected" : ""}>Female</option>
                  <option value="Male" ${draft.guestGender === "Male" ? "selected" : ""}>Male</option>
                </select>
              </label>
              ${
                customerFields.length
                  ? `
                    <div class="customer-fields">
                      ${customerFields.map((field) => renderCustomerFieldControl(field)).join("")}
                    </div>
                  `
                  : ""
              }
              <label class="field" id="fieldGuestNotes" style="margin-top: 14px;">
                Notes
                <input id="guestNotes" type="text" value="${escapeHtml(draft.notes)}" />
              </label>
              <div class="notice">
                Demo mode: this confirms the booking immediately and would hand off to Stripe in production.
              </div>
            `
        }
      </section>
    `,
  ];

  wizard.innerHTML = views[draft.currentStep];
  const summaryHasData = selectedPackageRows().length > 0 || !!draft.startDate || !!draft.roomId || draft.addonIds.length > 0;
  const isMobileSummary = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  const showMobileTripSummary = isMobileSummary && draft.currentStep === 4;
  const summaryButtonLoading = draft.currentStep === 4 && bookingUiState.submitting;
  const summaryButton = draft.currentStep === 0
    ? {
        id: "nextFromPackage",
        disabled: !selectedPackageRows().length,
        label: "Select dates >",
      }
    : draft.currentStep === 1
      ? {
          id: "nextFromDate",
          disabled: !draft.startDate,
          label: "Select room >",
        }
      : draft.currentStep === 2
        ? {
            id: "nextFromRoom",
            disabled: !draft.roomId,
            label: "Add-ons >",
          }
        : draft.currentStep === 3
          ? {
              id: "continueToBook",
              disabled: false,
              label: "Booking details >",
            }
          : draft.currentStep === 4
            ? {
                id: "bookButton",
                disabled: summaryButtonLoading,
                label: summaryButtonLoading ? "Submitting..." : "Pay deposit 50% >",
              }
            : {
                id: null,
                disabled: true,
                label: "Next >",
              };
  const summaryActions = `
    ${
      isMobileSummary
        ? `
          <div class="summary-actions-meta">
            <div>
              <span class="tiny">Check-in</span>
              <strong>${draft.startDate ? formatDate(draft.startDate) : "Select a date"}</strong>
            </div>
            <div class="summary-actions-total">
              <span class="tiny">Total</span>
              <strong>${summaryHasData ? money(totalPrice()) : ""}</strong>
            </div>
            </div>
          `
        : ""
    }
    <button class="button button-primary summary-button${summaryButtonLoading ? " is-loading" : ""}" type="button" ${summaryButton.id ? `id="${summaryButton.id}"` : ""} ${summaryButton.disabled ? "disabled aria-busy=\"true\"" : ""}>${summaryButtonLoading ? `<span class="button-spinner" aria-hidden="true"></span><span>${summaryButton.label}</span>` : summaryButton.label}</button>
  `;

  summary.hidden = isMobileSummary && !showMobileTripSummary;
  summary.innerHTML = `
    <div class="summary-hero">
      <h3 class="summary-title">Trip summary</h3>
      <div class="summary-list">
        <div class="summary-item">
          <div>
            <strong>Package</strong>
            <span class="summary-package-lines">
              ${selectedPackageRows().length ? `<span class="summary-package-line">${selectedPackagePeopleCount()} people</span>` : ""}
              ${selectedPackageRows()
                .map(
                  (item) =>
                    `<span class="summary-package-line">${escapeHtml(item.name)} x ${escapeHtml(item.quantity)}</span>`,
                )
                .join("")}
            </span>
          </div>
          <strong>${selectedPackageRows().length ? money(packagePrice()) : ""}</strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Date</strong>
            <span>${draft.startDate ? `${formatDate(draft.startDate)} to ${formatDate(endDateForDraft())}` : ""}</span>
          </div>
          <strong></strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Room</strong>
            <span>${getRoom(draft.roomId)?.name || ""}</span>
          </div>
          <strong>${draft.roomId ? formatSurcharge(roomPrice()) : ""}</strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Add-on</strong>
            <span>
              ${addonRows.length
                ? addonRows
                    .map((item) => {
                      const isFree = promoFreeAddonValue(item.id) === 0;
                      return `<div class="summary-addon-line">- ${escapeHtml(item.name)} x ${escapeHtml(item.quantity)}${isFree ? " (free with promo)" : ""}</div>`;
                    })
                    .join("")
                : ""}
            </span>
          </div>
          <strong>${draft.addonIds.length ? money(addonPrice()) : ""}</strong>
        </div>
        ${
          selectedPromos().length
            ? `
              <div class="summary-item">
                <div>
                  <strong>Promo</strong>
                  <span>${escapeHtml(selectedPromoCodeLabel())}</span>
                </div>
                <strong>-${money(promoTotals().discountTotal)}</strong>
              </div>
            `
            : ""
        }
      </div>
      <div class="summary-promo">
        ${renderPromoEntry({ variant: "desktop" })}
      </div>
      <div class="summary-total">
        <div>
          <strong>Total</strong>
        </div>
        <strong>${summaryHasData ? money(totalPrice()) : ""}</strong>
      </div>
      <div class="summary-footer">
        ${state.camp.bookingRules?.restrictedArrivalDays
          ? `Arrivals only on ${state.camp.bookingRules.allowedArrivalDays.join(", ")}.`
          : "Any arrival day is allowed."}
      </div>
      ${isMobileSummary ? "" : `<div class="summary-actions">${summaryActions}</div>`}
    </div>
  `;
  summaryActionsShell.hidden = !isMobileSummary;
  summaryActionsShell.innerHTML = isMobileSummary ? `<div class="summary-actions">${summaryActions}</div>` : "";
  if (!analyticsState.loadTracked && (analyticsConfig().ga4Id || analyticsConfig().pixelId)) {
    trackAnalyticsEvent("booking_engine_load", {
      camp: bookingSlug(),
      step: draft.currentStep + 1,
    });
    analyticsState.loadTracked = true;
  }
}

function renderAdminPage() {
  const roomCount = document.getElementById("roomCount");
  const packageCount = document.getElementById("packageCount");
  const addonCount = document.getElementById("addonCount");
  const bookingCount = document.getElementById("bookingCount");
  const leadCount = document.getElementById("leadCount");
  const activeTab = adminUiState.activeTab || "bookings";
  document.querySelectorAll("[data-booking-link]").forEach((bookingLink) => {
    bookingLink.setAttribute("href", bookingUrl());
  });
  if (roomCount) roomCount.textContent = `${state.rooms.length} rooms`;
  if (packageCount) packageCount.textContent = `${state.packages.length} packages`;
  if (addonCount) addonCount.textContent = `${state.addons.length} add-ons`;
  if (bookingCount) bookingCount.textContent = `${state.bookings.length} bookings`;
  const leadRows = [
    ...state.bookingIntents
      .filter((intent) => intent.stage !== "confirmed")
      .map((intent) => ({ ...intent, leadKind: "Checkout lead" })),
    ...state.leads.map((lead) => ({ ...lead, leadKind: "Contact lead", stage: "contact" })),
  ];
  if (leadCount) leadCount.textContent = `${leadRows.length} leads`;

  const topbarActions = document.getElementById("topbarActions");
  const topbarBookingUrl = document.getElementById("topbarBookingUrl");
  const bookingList = document.getElementById("bookingList");
  const bookingIntentCard = document.getElementById("bookingIntentCard");
  const bookingIntentList = document.getElementById("bookingIntentList");
  const bookingTableBody = document.getElementById("bookingTableBody");
  const leadTableBody = document.getElementById("leadTableBody");
  const campForm = document.getElementById("campForm");
  const analyticsForm = document.getElementById("analyticsForm");
  const packageForm = document.getElementById("packageForm");
  const roomForm = document.getElementById("roomForm");
  const addonForm = document.getElementById("addonForm");
  const promoForm = document.getElementById("promoForm");
  const bookingUrlInput = document.getElementById("bookingUrl");
  const availabilityRoomSelect = document.getElementById("availabilityRoomSelect");
  const availabilityBasePrice = document.getElementById("availabilityBasePrice");
  const availabilityMatrix = document.getElementById("availabilityMatrix");
  const panes = document.querySelectorAll("[data-admin-pane]");
  const tabButtons = document.querySelectorAll("[data-admin-tab]");
  const configPanes = document.querySelectorAll("[data-config-pane]");
  const configTabButtons = document.querySelectorAll("[data-config-tab]");

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
    campForm.elements.restrictedArrivalDays.checked = !!state.camp.bookingRules?.restrictedArrivalDays;
    campForm.elements.availabilityLowThreshold.value =
      state.camp.bookingRules?.availabilityLowThreshold ?? seedState.camp.bookingRules.availabilityLowThreshold;
    campForm.elements.availabilityMidThreshold.value =
      state.camp.bookingRules?.availabilityMidThreshold ?? seedState.camp.bookingRules.availabilityMidThreshold;
    campForm.elements.availabilityCountVisibilityThreshold.value =
      state.camp.bookingRules?.availabilityCountVisibilityThreshold ?? "";
    campForm
      .querySelectorAll('input[name="arrivalDays"]')
      .forEach((checkbox) => {
        checkbox.checked = (state.camp.bookingRules?.allowedArrivalDays || []).includes(checkbox.value);
      });
  }

  if (analyticsForm) {
    analyticsForm.elements.ga4Id.value = state.camp.analytics?.ga4Id || "";
    analyticsForm.elements.pixelId.value = state.camp.analytics?.pixelId || "";
  }

  if (bookingUrlInput) {
    bookingUrlInput.value = bookingUrl();
  }
  if (topbarBookingUrl) {
    topbarBookingUrl.setAttribute("href", bookingUrl());
  }
  applyTheme(state.camp.theme);

  panes.forEach((pane) => {
    pane.hidden = pane.dataset.adminPane !== activeTab;
  });
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === activeTab);
  });
  configPanes.forEach((pane) => {
    pane.hidden = activeTab !== "configure" || pane.dataset.configPane !== adminUiState.configTab;
  });
  configTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.configTab === adminUiState.configTab);
  });
  if (topbarActions) {
    topbarActions.hidden = false;
  }

  const orderedRooms = orderedItems(state.rooms);
  const orderedPackages = orderedItems(state.packages);
  const orderedAddons = orderedItems(state.addons);

  if (availabilityRoomSelect) {
    availabilityRoomSelect.innerHTML = orderedRooms
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

  if (bookingList) {
    bookingList.innerHTML = state.bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((booking) => {
        const pkg = getPackage(booking.packageId);
        const room = getRoom(booking.roomId);
        const packageSummary = booking.packageQuantities
          ? Object.entries(booking.packageQuantities)
              .map(([packageId, quantity]) => `${escapeHtml(getPackage(packageId).name)} x ${escapeHtml(quantity)}`)
              .join(", ")
          : `${escapeHtml(pkg.name)} x ${escapeHtml(booking.packagePeople || 1)}`;
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${booking.guestName}</strong>
              <span class="status ${booking.status}">${booking.status}</span>
            </div>
            <small>${packageSummary} &middot; ${room.name}</small>
            <div class="tiny">${booking.guestEmail || "No email"} &middot; ${booking.guestPhone || "No phone"}</div>
            <div class="tiny">${booking.guestGender || "No gender"} &middot; ${booking.guestCountry || "No country"}</div>
            ${booking.customerDetails ? `<div class="tiny">${escapeHtml(customerDetailsSummaryText(booking.customerDetails))}</div>` : ""}
            <div class="tiny">${formatDate(booking.startDate)} to ${formatDate(booking.endDate)} &middot; ${money(booking.total)}</div>
            <div class="tiny">Booked: ${formatDateTime(booking.createdAt)}</div>
            <div class="tiny">Hold expires: ${booking.holdExpiresAt ? formatDateTime(booking.holdExpiresAt) : "N/A"}</div>
            <div class="tiny">Reservation: ${booking.reservationCode || "pending"}</div>
            <div class="tiny">Email: ${booking.confirmationEmail?.status || "not sent"}</div>
            ${booking.cancelledAt ? `<div class="tiny">Cancelled: ${formatDateTime(booking.cancelledAt)}</div>` : ""}
            ${
              booking.status !== "expired"
                ? `<div class="stack-item-actions"><button type="button" class="button button-secondary" data-cancel-booking="${booking.id}" data-reservation-code="${booking.reservationCode || ""}" data-current-status="${booking.status}">${booking.status === "cancelled" ? "Confirm" : "Cancel"}</button></div>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  const bookingSort = adminUiState.bookingSort || { key: "createdAt", direction: "desc" };
  const leadSort = adminUiState.leadSort || { key: "createdAt", direction: "desc" };
  const bookingsForTable = sortAdminRows(state.bookings, bookingSort, {
    guestName: (item) => item.guestName || "",
    startDate: (item) => item.startDate || "",
    room: (item) => getRoom(item.roomId)?.name || "",
    package: (item) => {
      const pkg = getPackage(item.packageId);
      return item.packageQuantities ? Object.keys(item.packageQuantities).length : pkg?.name || "";
    },
    total: (item) => Number(item.total || 0),
    status: (item) => item.status || "",
    createdAt: (item) => item.createdAt || "",
  });

  const leadsForTable = sortAdminRows(
    [
      ...state.bookingIntents
        .filter((intent) => intent.stage !== "confirmed")
        .map((intent) => ({ ...intent, leadKind: "Checkout lead" })),
      ...state.leads.map((lead) => ({ ...lead, leadKind: "Contact lead", stage: "contact" })),
    ],
    leadSort,
    {
      guestName: (item) => item.guestName || "",
      stage: (item) => item.stage || item.leadKind || "",
      startDate: (item) => item.startDate || "",
      createdAt: (item) => item.createdAt || "",
    },
  );

  if (bookingTableBody) {
    bookingTableBody.innerHTML = bookingsForTable
      .map((booking) => {
        const pkg = getPackage(booking.packageId);
        const room = getRoom(booking.roomId);
        const packageSummary = booking.packageQuantities
          ? Object.entries(booking.packageQuantities)
              .map(([packageId, quantity]) => `${escapeHtml(getPackage(packageId).name)} x ${escapeHtml(quantity)}`)
              .join(", ")
          : `${escapeHtml(pkg.name)} x ${escapeHtml(booking.packagePeople || 1)}`;
        return `
          <tr>
            <td>
              <strong>${booking.guestName || "Guest"}</strong>
              <div class="tiny muted">${booking.guestEmail || "No email"}</div>
              <div class="tiny muted">${booking.guestGender || "No gender"} &middot; ${booking.guestCountry || "No country"}</div>
              ${booking.customerDetails ? `<div class="tiny muted">${escapeHtml(customerDetailsSummaryText(booking.customerDetails))}</div>` : ""}
              ${booking.promoCodes?.length ? `<div class="tiny">Promo: ${escapeHtml(booking.promoCodes.join(", "))}</div>` : ""}
            </td>
            <td>
              <strong>${formatDate(booking.startDate)}</strong>
              <div class="tiny muted">${formatDate(booking.endDate)}</div>
            </td>
            <td><strong>${room?.name || booking.roomId || ""}</strong></td>
            <td><div>${packageSummary}</div></td>
            <td><strong>${money(booking.total)}</strong></td>
            <td><span class="status ${booking.status}">${booking.status}</span></td>
            <td><div class="tiny">${formatDateTime(booking.createdAt)}</div></td>
            <td>
              <div class="tiny">${booking.reservationCode || "pending"}</div>
              <div class="tiny">${booking.confirmationEmail?.status || "not sent"}</div>
            </td>
            <td>
              ${
                booking.status !== "expired"
                  ? `<button type="button" class="button button-secondary" data-cancel-booking="${booking.id}" data-reservation-code="${booking.reservationCode || ""}" data-current-status="${booking.status}">${booking.status === "cancelled" ? "Confirm" : "Cancel"}</button>`
                  : ""
              }
            </td>
          </tr>
        `;
      })
      .join("");
  }

  if (leadTableBody) {
    leadTableBody.innerHTML = leadsForTable
      .map((lead) => {
        const pkg = getPackage(lead.packageId);
        const room = getRoom(lead.roomId);
        return `
          <tr>
            <td>
              <strong>${lead.guestName || "Guest lead"}</strong>
              <div class="tiny muted">${lead.guestEmail || "No email"}</div>
              <div class="tiny muted">${lead.guestGender || "No gender"} &middot; ${lead.guestCountry || "No country"}</div>
              ${lead.customerDetails ? `<div class="tiny muted">${escapeHtml(customerDetailsSummaryText(lead.customerDetails))}</div>` : ""}
              ${lead.promoCodes?.length ? `<div class="tiny">Promo: ${escapeHtml(lead.promoCodes.join(", "))}</div>` : ""}
            </td>
            <td><span class="status held">${escapeHtml(lead.leadKind || lead.stage || "lead")}</span></td>
            <td>
              <strong>${formatDate(lead.startDate)}</strong>
              <div class="tiny muted">${formatDate(lead.endDate)}</div>
            </td>
            <td><div class="tiny">${formatDateTime(lead.createdAt)}</div></td>
            <td>${pkg?.name || lead.packageId || ""}</td>
            <td>${room?.name || lead.roomId || ""}</td>
            <td>${lead.total ? money(lead.total) : ""}</td>
            <td><div class="tiny">${lead.guestPhone || "No phone"}</div></td>
          </tr>
        `;
      })
      .join("");
  }

  const roomList = document.getElementById("roomList");
  if (roomList) {
    roomList.innerHTML = orderedRooms
      .map((room) => {
        return `
          <div class="stack-item">
            <div class="stack-item-media">
              ${room.imageUrl ? `<img src="${room.imageUrl}" alt="${room.name}" />` : ""}
            </div>
            <div class="stack-item-top">
              <strong>${room.name}</strong>
            </div>
            <div class="tiny">${money(room.pricePerNight)} per night &middot; ${room.capacity} guests per room &middot; ${room.totalUnits} rooms</div>
            ${room.learnMoreUrl ? `<div class="tiny"><a class="learn-more-link" href="${escapeHtml(room.learnMoreUrl)}" target="_blank" rel="noopener noreferrer">Learn more</a></div>` : ""}
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-room="${room.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-room="${room.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-room="${room.id}">Edit</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const packageList = document.getElementById("packageList");
  if (packageList) {
    packageList.innerHTML = orderedPackages
      .map(
        (item) => `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${item.name}</strong>
              <span class="pill">${item.nights} nights</span>
            </div>
            <div class="tiny">${money(item.basePrice)}</div>
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-package="${item.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-package="${item.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-package="${item.id}">Edit</button>
            </div>
          </div>
        `,
      )
      .join("");
  }

  const addonList = document.getElementById("addonList");
  if (addonList) {
    addonList.innerHTML = orderedAddons
      .map(
        (item) => `
          <div class="stack-item">
            <div class="stack-item-media">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" />` : ""}
            </div>
            <div class="stack-item-top">
              <strong>${item.name}</strong>
              <span class="pill">${money(item.price)}</span>
            </div>
            <div class="tiny">${item.unitLabel}</div>
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-addon="${item.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-addon="${item.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-addon="${item.id}">Edit</button>
            </div>
          </div>
        `,
      )
      .join("");
  }

  const promoList = document.getElementById("promoList");
  const promoCount = document.getElementById("promoCount");
  if (promoCount) {
    promoCount.textContent = `${orderedItems(state.promos).length} promos`;
  }
  if (promoList) {
    promoList.innerHTML = orderedItems(state.promos)
      .map((item) => {
        const targetAddon = getAddon(item.addonId);
        const label =
          item.type === "free-addon"
            ? `Free ${targetAddon?.name || "add-on"}`
            : `${Math.max(0, Number(item.percent) || 0)}% discount`;
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${item.code}</strong>
              <span class="pill">${label}</span>
            </div>
            <div class="tiny">${item.type === "free-addon" ? targetAddon?.name || "No add-on set" : "Applies to subtotal"}</div>
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-promo="${item.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-promo="${item.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-promo="${item.id}">Edit</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const customerFieldForm = document.getElementById("customerFieldForm");
  const customerFieldList = document.getElementById("customerFieldList");
  const customerFieldCount = document.getElementById("customerFieldCount");
  const orderedCustomerFields = customerFieldDefinitions();
  if (customerFieldCount) {
    customerFieldCount.textContent = `${orderedCustomerFields.length} fields`;
  }
  if (customerFieldList) {
    customerFieldList.innerHTML = orderedCustomerFields
      .map((field) => {
        const summary =
          field.type === "select"
            ? `Dropdown ${field.options?.length ? `· ${field.options.length} options` : ""}`
            : field.type.charAt(0).toUpperCase() + field.type.slice(1);
        return `
          <div class="stack-item">
            <div class="stack-item-top">
              <strong>${field.label}</strong>
              <span class="pill">${field.required ? "Required" : "Optional"}</span>
            </div>
            <div class="tiny">${field.key} · ${summary}</div>
            ${field.placeholder ? `<div class="tiny">${escapeHtml(field.placeholder)}</div>` : ""}
            ${field.type === "select" && field.options?.length ? `<div class="tiny">${escapeHtml(field.options.join(", "))}</div>` : ""}
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-customer-field="${field.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-customer-field="${field.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-customer-field="${field.id}">Edit</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  if (packageForm) {
    const editId = packageForm.elements.id.value;
    const editing = state.packages.find((item) => item.id === editId);
    if (editing) {
      packageForm.elements.name.value = editing.name || "";
      packageForm.elements.description.value = editing.description || "";
      packageForm.elements.nights.value = editing.nights || 7;
      packageForm.elements.basePrice.value = editing.basePrice || 0;
    }
  }

  if (roomForm) {
    const editId = roomForm.elements.id.value;
    const editing = state.rooms.find((item) => item.id === editId);
    if (editing) {
      roomForm.elements.name.value = editing.name || "";
      roomForm.elements.description.value = editing.description || "";
      roomForm.elements.totalUnits.value = editing.totalUnits || 1;
      roomForm.elements.capacity.value = editing.capacity || 1;
      roomForm.elements.pricePerNight.value = editing.pricePerNight || 0;
      roomForm.elements.imageUrl.value = editing.imageUrl?.startsWith("data:") ? "" : editing.imageUrl || "";
      roomForm.elements.learnMoreUrl.value = editing.learnMoreUrl || "";
    }
  }

  if (addonForm) {
    const editId = addonForm.elements.id.value;
    const editing = state.addons.find((item) => item.id === editId);
    if (editing) {
      addonForm.elements.name.value = editing.name || "";
      addonForm.elements.description.value = editing.description || "";
      addonForm.elements.price.value = editing.price || 0;
      addonForm.elements.unitLabel.value = editing.unitLabel || "per stay";
      addonForm.elements.imageUrl.value = editing.imageUrl?.startsWith("data:") ? "" : editing.imageUrl || "";
    }
  }

  if (promoForm) {
    const addonSelect = promoForm.elements.addonId;
    if (addonSelect) {
      addonSelect.innerHTML = `
        <option value="">Select add-on</option>
        ${orderedItems(state.addons)
          .map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
          .join("")}
      `;
    }
    const editId = promoForm.elements.id.value;
    const editing = state.promos.find((item) => item.id === editId);
    if (editing) {
      promoForm.elements.code.value = editing.code || "";
      promoForm.elements.type.value = editing.type || "percent";
      promoForm.elements.percent.value = editing.percent || "";
      promoForm.elements.addonId.value = editing.addonId || "";
    }
  }

  if (customerFieldForm) {
    const editId = customerFieldForm.elements.id.value;
    const editing = customerFieldDefinitions().find((item) => item.id === editId);
    if (editing) {
      customerFieldForm.elements.label.value = editing.label || "";
      customerFieldForm.elements.key.value = editing.key || "";
      customerFieldForm.elements.type.value = editing.type || "text";
      customerFieldForm.elements.options.value = Array.isArray(editing.options) ? editing.options.join("\n") : "";
      customerFieldForm.elements.placeholder.value = editing.placeholder || "";
      customerFieldForm.elements.required.checked = !!editing.required;
    }
  }
}

function availabilityRowsForRoom(roomId, count = 12) {
  const room = getRoom(roomId);
  const rows = [];
  const start = startOfWeek(new Date());

  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + i * 7);
    const key = localDateKey(cursor);
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
            <div>
              <strong>${row.booked}</strong>
            </div>
            <div>
              <strong>${row.forSale}</strong>
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

async function cancelBookingReservation(bookingId, reservationCode = "", currentStatus = "") {
  if (!bookingId) return;
  const targetStatus = currentStatus === "cancelled" ? "confirmed" : "cancelled";
  const confirmed = window.confirm(
    targetStatus === "cancelled"
      ? "Cancel this reservation and release the room back into availability?"
      : "Confirm this reservation again and put the room back on sale?",
  );
  if (!confirmed) return;

  try {
    const result = await apiJson("cancel-booking", {
      method: "POST",
      headers: authState.token ? { Authorization: `Bearer ${authState.token}` } : {},
      body: JSON.stringify({ bookingId, reservationCode, targetStatus }),
    });

    if (result?.workspace) {
      hydrateStateFromWorkspace(result.workspace);
      authState.workspace = result.workspace;
      renderAdminPage();
      updateAdminAuthUI(authState.user);
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : "Could not cancel reservation.");
  }
}

function updateAdminAuthUI(user) {
  const authStatus = document.getElementById("authStatus");
  const adminWorkspace = document.getElementById("adminWorkspace");

  if (!adminWorkspace) return;

  const signedIn = !!user;
  const workspaceReady = signedIn && authState.workspaceLoaded;
  adminWorkspace.hidden = !workspaceReady;
  renderTopbarActions(user, workspaceReady);

  if (authStatus) {
    authStatus.textContent = signedIn ? "" : "Loading access state...";
  }
}

function renderTopbarActions(user, workspaceReady) {
  const topbarActions = document.getElementById("topbarActions");
  if (!topbarActions) return;

  if (!user) {
    topbarActions.innerHTML = `
      <button class="button button-primary" type="button" id="authButton" data-admin-auth-action="login">
        Login
      </button>
    `;
    return;
  }

  const openLink = workspaceReady
    ? `<a href="${bookingUrl()}" data-booking-link id="topbarBookingUrl" target="_blank" rel="noreferrer">Open</a>`
    : "";

  topbarActions.innerHTML = `
    <span class="topbar-url">${openLink}</span>
    <button class="button button-secondary" type="button" id="topbarLogout" data-admin-auth-action="logout">
      Log out
    </button>
  `;
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

  const topbarActions = document.getElementById("topbarActions");

  topbarActions?.addEventListener("click", (event) => {
    const actionButton = event.target?.closest?.("[data-admin-auth-action]");
    if (!actionButton) return;

    if (actionButton.dataset.adminAuthAction === "login") {
      window.netlifyIdentity.open();
    } else if (actionButton.dataset.adminAuthAction === "logout") {
      window.netlifyIdentity.logout();
    }
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
  state.customerFieldValues = { ...(draft.customerFieldValues || {}) };
  state.startDate = draft.startDate;
  state.guestName = draft.guestName;
  state.guestPhone = draft.guestPhone;
  state.guestEmail = draft.guestEmail;
  state.guestCountry = draft.guestCountry;
  state.guestBirthDay = draft.guestBirthDay;
  state.guestBirthMonth = draft.guestBirthMonth;
  state.guestBirthYear = draft.guestBirthYear;
  state.guestGender = draft.guestGender;
  state.notes = draft.notes;
  state.promoCodeInput = draft.promoCodeInput || "";
  state.promoCodes = [...(draft.promoCodes || [])];
  state.promoError = draft.promoError || "";
  state.bookingIntentId = draft.bookingIntentId || "";
}

function applyStateToDraft() {
  draft.packageId = state.selectedPackageId;
  draft.packageQuantities = { ...(state.packageQuantities || {}) };
  draft.roomId = state.selectedRoomId;
  draft.addonIds = [...(state.selectedAddonIds || [])];
  draft.customerFieldValues = { ...(state.customerFieldValues || {}) };
  draft.startDate = state.startDate || "";
  draft.guestName = state.guestName || "";
  draft.guestPhone = state.guestPhone || "";
  draft.guestEmail = state.guestEmail || "";
  draft.guestCountry = state.guestCountry || "";
  draft.guestBirthDay = state.guestBirthDay || "";
  draft.guestBirthMonth = state.guestBirthMonth || "";
  draft.guestBirthYear = state.guestBirthYear || "";
  draft.guestGender = state.guestGender || "";
  draft.notes = state.notes || "";
  draft.promoCodeInput = state.promoCodeInput || "";
  draft.promoCodes = [...(state.promoCodes || [])];
  draft.promoError = state.promoError || "";
  draft.currentStep = state.currentStep ?? 0;
  draft.bookingIntentId = state.bookingIntentId || "";
  draft.calendarMonthOffset = draft.startDate ? monthOffsetBetween(new Date(), draft.startDate) : 0;
  normalizeAddonSelections();
}

function upsertCheckoutLead(stage = "checkout") {
  const now = new Date().toISOString();
  const id = draft.bookingIntentId || `intent-${Date.now()}`;
  draft.bookingIntentId = id;
  const existing = state.bookingIntents.find((item) => item.id === id);
  const payload = {
    id,
    guestName: draft.guestName || existing?.guestName || "",
    guestPhone: draft.guestPhone || existing?.guestPhone || "",
    guestEmail: draft.guestEmail || existing?.guestEmail || "",
    guestCountry: draft.guestCountry || existing?.guestCountry || "",
    guestGender: draft.guestGender || existing?.guestGender || "",
    packageId: draft.packageId,
    packageQuantities: { ...draft.packageQuantities },
    roomId: draft.roomId,
    addonIds: [...draft.addonIds],
    customerFieldValues: { ...(draft.customerFieldValues || {}) },
    customerDetails: customerDetailsPayload(),
    startDate: draft.startDate,
    endDate: endDateForDraft(),
    total: totalPrice(),
    promoCodes: [...(draft.promoCodes || [])],
    promoSummary: promoBookingSummary(),
    notes: draft.notes || existing?.notes || "",
    stage,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  state.bookingIntents = orderedItems([
    ...state.bookingIntents.filter((item) => item.id !== id),
    payload,
  ]).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  saveState();
  return payload;
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

  const activePackageId = selectedPackageRows()[0]?.id || seedState.selectedPackageId;
  draft.packageId = activePackageId;
  normalizeAddonSelections();
}

function updateBookPage() {
  syncDraftToState();
  saveState();
  cleanExpiredHolds();
  applyTheme(state.camp.theme);
  renderBookPage();
}

function scrollBookPageToTop() {
  if (typeof window === "undefined") return;
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  if (!isMobile) return;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function setBookingFieldErrors(fieldIds = []) {
  const allFieldIds = [
    "fieldGuestName",
    "fieldGuestEmail",
    "fieldGuestPhone",
    "fieldGuestCountry",
    "fieldGuestBirthDay",
    "fieldGuestBirthMonth",
    "fieldGuestBirthYear",
    "fieldGuestGender",
    "fieldGuestNotes",
    ...customerFieldDefinitions().map((field) => customerFieldDomId(field)),
  ];
  for (const id of allFieldIds) {
    document.getElementById(id)?.classList.toggle("is-invalid", fieldIds.includes(id));
  }
}

async function confirmBookingReservation() {
  if (bookingUiState.submitting) return;

  const guestName = document.getElementById("guestName")?.value.trim();
  const guestPhone = document.getElementById("guestPhone")?.value.trim();
  const guestEmail = document.getElementById("guestEmail")?.value.trim();
  const guestCountry = document.getElementById("guestCountry")?.value.trim();
  const guestBirthDay = document.getElementById("guestBirthDay")?.value.trim();
  const guestBirthMonth = document.getElementById("guestBirthMonth")?.value.trim();
  const guestBirthYear = document.getElementById("guestBirthYear")?.value.trim();
  const guestGender = document.getElementById("guestGender")?.value.trim();
  const notes = document.getElementById("guestNotes")?.value.trim();

  const missingFields = [];
  if (!guestName) missingFields.push("fieldGuestName");
  if (!guestEmail) missingFields.push("fieldGuestEmail");
  if (!guestPhone) missingFields.push("fieldGuestPhone");
  if (!guestCountry) missingFields.push("fieldGuestCountry");
  if (!guestBirthDay) missingFields.push("fieldGuestBirthDay");
  if (!guestBirthMonth) missingFields.push("fieldGuestBirthMonth");
  if (!guestBirthYear) missingFields.push("fieldGuestBirthYear");
  if (!guestGender) missingFields.push("fieldGuestGender");
  for (const field of customerFieldDefinitions()) {
    if (field.required && !String(draft.customerFieldValues?.[field.key] || "").trim()) {
      missingFields.push(customerFieldDomId(field));
    }
  }
  setBookingFieldErrors(missingFields);

  if (missingFields.length) {
    return;
  }

  const startDate = draft.startDate;
  const endDate = endDateForDraft();
  if (availableUnits(draft.roomId, startDate, endDate) <= 0) {
    alert("That room is no longer available for these dates.");
    return;
  }

  bookingUiState.submitting = true;
  updateBookPage();

  const now = new Date();
  const bookingPayload = {
    id: `intent-${now.getTime()}`,
    guestName,
    guestPhone,
    guestEmail,
    guestCountry,
    guestBirthDay,
    guestBirthMonth,
    guestBirthYear,
    guestGender,
    packageId: draft.packageId,
    packageQuantities: { ...draft.packageQuantities },
    roomId: draft.roomId,
    addonIds: [...draft.addonIds],
    customerFieldValues: { ...(draft.customerFieldValues || {}) },
    customerDetails: customerDetailsPayload(),
    startDate,
    endDate,
    total: totalPrice(),
    promoCodes: [...(draft.promoCodes || [])],
    promoSummary: promoBookingSummary(),
    notes: notes || "",
    stage: "checkout",
    createdAt: now.toISOString(),
  };

  draft.guestName = guestName;
  draft.guestPhone = guestPhone;
  draft.guestEmail = guestEmail;
  draft.guestCountry = guestCountry;
  draft.guestBirthDay = guestBirthDay;
  draft.guestBirthMonth = guestBirthMonth;
  draft.guestBirthYear = guestBirthYear;
  draft.guestGender = guestGender;
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
      upsertCheckoutLead("confirmed");
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
      guestGender,
      customerDetails: customerDetailsPayload(),
      promoCodes: [...(draft.promoCodes || [])],
      promoSummary: promoBookingSummary(),
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
    upsertCheckoutLead("confirmed");
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
      guestGender,
      customerDetails: customerDetailsPayload(),
      promoCodes: [...(draft.promoCodes || [])],
      promoSummary: promoBookingSummary(),
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
  } finally {
    bookingUiState.submitting = false;
  }
}

function initBookInteractions() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      "[data-step], [data-select-package], [data-select-room], [data-addon-row-change], [data-month-nav], [data-select-date], [data-package-row-change], [data-package-row-input], [data-go-step], [data-apply-promo], #nextFromPackage, #nextFromDate, #nextFromRoom, #continueToBook",
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
      updateBookPage();
      return;
    }

    if (target.dataset.selectRoom) {
      const roomId = target.dataset.selectRoom;
      if (!roomCanFitParty(roomId, draft.startDate, endDateForDraft(), selectedPackagePeopleCount())) {
        alert("That room can't fit your group for the selected dates.");
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

    if (target.id === "nextFromPackage") {
      if (!selectedPackageRows().length) {
        alert("Please choose at least one package row before continuing.");
        return;
      }
      if (!firstRoomForParty()) {
        alert("No room can fit that group for the selected stay.");
        return;
      }
      draft.currentStep = 1;
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.id === "nextFromDate") {
      if (!draft.startDate) {
        alert("Please select a check-in date first.");
        return;
      }
      draft.currentStep = 2;
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.id === "nextFromRoom") {
      if (!roomCanFitParty(draft.roomId, draft.startDate, endDateForDraft(), selectedPackagePeopleCount())) {
        alert("That room can't fit your group for the selected dates.");
        return;
      }
      draft.currentStep = 3;
      trackAnalyticsEvent("add_to_cart", {
        camp: bookingSlug(),
        room: getRoom(draft.roomId)?.name || draft.roomId,
        package: getPackage(draft.packageId)?.name || draft.packageId,
        check_in: draft.startDate,
      });
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.dataset.goStep) {
      draft.currentStep = Number(target.dataset.goStep);
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.dataset.addonRowChange) {
      const [addonId, delta] = target.dataset.addonRowChange.split(":");
      setAddonQuantity(addonId, addonQuantity(addonId) + Number(delta));
      normalizeAddonSelections();
      state.bookingConfirmation = null;
      updateBookPage();
      return;
    }

    if (target.id === "continueToBook") {
      draft.currentStep = 4;
      state.bookingConfirmation = null;
      upsertCheckoutLead("checkout");
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.dataset.applyPromo !== undefined) {
      const promoInput = document.getElementById(
        target.dataset.applyPromo === "mobile" ? "promoCodeInputMobile" : "promoCodeInputDesktop",
      );
      applyPromoCodesFromInput(promoInput?.value || "");
      return;
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === "startDate") {
      draft.startDate = target.value;
      draft.calendarMonthOffset = monthOffsetBetween(new Date(), draft.startDate);
      state.bookingConfirmation = null;
      trackAnalyticsEvent("search", {
        camp: bookingSlug(),
        check_in: draft.startDate,
      });
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.id === "guestName") {
      draft.guestName = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestPhone") {
      draft.guestPhone = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestEmail") {
      draft.guestEmail = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestCountry") {
      draft.guestCountry = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestBirthDay") {
      draft.guestBirthDay = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestBirthMonth") {
      draft.guestBirthMonth = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestBirthYear") {
      draft.guestBirthYear = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestNotes") {
      draft.notes = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "guestGender") {
      draft.guestGender = target.value;
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.dataset.customerField) {
      draft.customerFieldValues = {
        ...(draft.customerFieldValues || {}),
        [target.dataset.customerField]: target.value,
      };
      upsertCheckoutLead("checkout");
      setBookingFieldErrors([]);
    }
    if (target.id === "promoCodeInputDesktop" || target.id === "promoCodeInputMobile") {
      draft.promoCodeInput = target.value;
      draft.promoError = "";
      syncDraftToState();
      saveState();
      return;
    }
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
        cancelBookingButton.dataset.currentStatus || "",
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
  const analyticsForm = document.getElementById("analyticsForm");
  const topbarLogout = document.getElementById("topbarLogout");
  const packageForm = document.getElementById("packageForm");
  const roomForm = document.getElementById("roomForm");
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

  document.addEventListener("click", (event) => {
    const bookingSortButton = event.target?.closest?.("[data-booking-sort]");
    if (bookingSortButton) {
      adminUiState.bookingSort = toggleSortState(adminUiState.bookingSort, bookingSortButton.dataset.bookingSort || "createdAt");
      renderAdminPage();
      return;
    }

    const leadSortButton = event.target?.closest?.("[data-lead-sort]");
    if (leadSortButton) {
      adminUiState.leadSort = toggleSortState(adminUiState.leadSort, leadSortButton.dataset.leadSort || "createdAt");
      renderAdminPage();
      return;
    }

    const tabButton = event.target?.closest?.("[data-admin-tab]");
    if (!tabButton) return;
    adminUiState.activeTab = tabButton.dataset.adminTab || "bookings";
    renderAdminPage();
  });

  document.addEventListener("click", (event) => {
    const configTabButton = event.target?.closest?.("[data-config-tab]");
    if (!configTabButton) return;
    adminUiState.configTab = configTabButton.dataset.configTab || "packages";
    renderAdminPage();
  });

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

  topbarLogout?.addEventListener("click", () => {
    window.netlifyIdentity?.logout?.();
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

  const liveBrandingFields = new Set([
    "campName",
    "logoUrl",
    "bg",
    "panel",
    "panelSoft",
    "border",
    "text",
    "muted",
    "accent",
    "accentSoft",
    "titleFont",
    "bodyFont",
  ]);

  const syncBrandingPreview = () => {
    if (!campForm) return;

    const nextTheme = {
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

    state.camp.name = campForm.elements.campName.value.trim() || state.camp.name;
    if (campForm.elements.logoUrl.value.trim()) {
      state.camp.logoUrl = campForm.elements.logoUrl.value.trim();
    }
    state.camp.theme = nextTheme;
    applyTheme(state.camp.theme);
    saveState();
    if (bookingUrlInput) {
      bookingUrlInput.value = bookingUrl();
    }
  };

  campForm?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!liveBrandingFields.has(target.name)) return;
    syncBrandingPreview();
  });

  campForm?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!liveBrandingFields.has(target.name)) return;
    syncBrandingPreview();
  });

  campForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.camp.name = campForm.elements.campName.value.trim() || state.camp.name;

    const restrictedArrivalDays = campForm.elements.restrictedArrivalDays.checked;
    const allowedArrivalDays = Array.from(campForm.querySelectorAll('input[name="arrivalDays"]:checked')).map(
      (checkbox) => checkbox.value,
    );
    const lowThreshold = Math.max(
      1,
      Number(campForm.elements.availabilityLowThreshold.value || seedState.camp.bookingRules.availabilityLowThreshold),
    );
    const midThreshold = Math.max(
      lowThreshold,
      Number(campForm.elements.availabilityMidThreshold.value || seedState.camp.bookingRules.availabilityMidThreshold),
    );
    state.camp.bookingRules = {
      restrictedArrivalDays,
      allowedArrivalDays: allowedArrivalDays.length ? allowedArrivalDays : seedState.camp.bookingRules.allowedArrivalDays,
      availabilityLowThreshold: lowThreshold,
      availabilityMidThreshold: midThreshold,
      availabilityCountVisibilityThreshold:
        campForm.elements.availabilityCountVisibilityThreshold.value === ""
          ? null
          : Math.max(0, Number(campForm.elements.availabilityCountVisibilityThreshold.value)),
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
    saveState();
    applyTheme(state.camp.theme);
    renderAdminPage();
    if (bookingUrlInput) {
      bookingUrlInput.value = bookingUrl();
    }
  });

  analyticsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.camp.analytics = {
      ga4Id: analyticsForm.elements.ga4Id.value.trim(),
      pixelId: analyticsForm.elements.pixelId.value.trim(),
    };
    saveState();
    applyTheme(state.camp.theme);
    renderAdminPage();
  });

  packageForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = packageForm.elements.id.value || `package-${Date.now()}`;
    const existing = state.packages.find((item) => item.id === id);
    const payload = {
      id,
      name: packageForm.elements.name.value.trim(),
      description: packageForm.elements.description.value.trim(),
      nights: Number(packageForm.elements.nights.value),
      basePrice: Number(packageForm.elements.basePrice.value),
      order: existing?.order ?? nextOrderValue(state.packages),
    };
    state.packages = orderedItems([...state.packages.filter((item) => item.id !== id), payload]);
    packageForm.reset();
    packageForm.elements.id.value = "";
    saveState();
    renderAdminPage();
  });

  roomForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = roomForm.elements.id.value || `room-${Date.now()}`;
    const existing = state.rooms.find((item) => item.id === id);
    const imageFile = roomForm.elements.imageFile.files?.[0];
    let imageUrl = roomForm.elements.imageUrl.value.trim();
    if (imageFile) {
      imageUrl = await readFileAsDataUrl(imageFile);
    }
    if (!imageUrl) {
      imageUrl = state.rooms.find((item) => item.id === id)?.imageUrl || logoSvg;
    }

    const payload = {
      id,
      name: roomForm.elements.name.value.trim(),
      description: roomForm.elements.description.value.trim(),
      totalUnits: Number(roomForm.elements.totalUnits.value),
      capacity: Number(roomForm.elements.capacity.value),
      pricePerNight: Number(roomForm.elements.pricePerNight.value),
      imageUrl,
      learnMoreUrl: roomForm.elements.learnMoreUrl.value.trim(),
      order: existing?.order ?? nextOrderValue(state.rooms),
    };
    state.rooms = orderedItems([...state.rooms.filter((item) => item.id !== id), payload]);
    ensureAvailabilityCoverage(state);
    roomForm.reset();
    roomForm.elements.id.value = "";
    saveState();
    renderAdminPage();
  });

  addonForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = addonForm.elements.id.value || `addon-${Date.now()}`;
    const existing = state.addons.find((item) => item.id === id);
    const imageFile = addonForm.elements.imageFile.files?.[0];
    let imageUrl = addonForm.elements.imageUrl.value.trim();
    if (imageFile) {
      imageUrl = await readFileAsDataUrl(imageFile);
    }
    if (!imageUrl) {
      imageUrl = existing?.imageUrl || logoSvg;
    }
    const payload = {
      id,
      name: addonForm.elements.name.value.trim(),
      description: addonForm.elements.description.value.trim(),
      price: Number(addonForm.elements.price.value),
      unitLabel: addonForm.elements.unitLabel.value.trim(),
      imageUrl,
      order: existing?.order ?? nextOrderValue(state.addons),
    };
    state.addons = orderedItems([...state.addons.filter((item) => item.id !== id), payload]);
    addonForm.reset();
    addonForm.elements.id.value = "";
    saveState();
    renderAdminPage();
  });

  promoForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = promoForm.elements.id.value || `promo-${Date.now()}`;
    const existing = state.promos.find((item) => item.id === id);
    const type = promoForm.elements.type.value;
    const code = normalizePromoCode(promoForm.elements.code.value);
    if (!code) {
      alert("Please enter a promo code.");
      return;
    }
    const duplicate = state.promos.find((item) => normalizePromoCode(item.code) === code && item.id !== id);
    if (duplicate) {
      alert("That promo code already exists.");
      return;
    }
    if (type === "percent" && Math.max(0, Number(promoForm.elements.percent.value || 0)) <= 0) {
      alert("Please enter a discount percentage.");
      return;
    }
    if (type === "free-addon" && !promoForm.elements.addonId.value) {
      alert("Please choose an add-on for the free add-on promo.");
      return;
    }
    const payload = {
      id,
      code,
      type,
      percent: type === "percent" ? Math.max(0, Number(promoForm.elements.percent.value || 0)) : 0,
      addonId: type === "free-addon" ? promoForm.elements.addonId.value : "",
      order: existing?.order ?? nextOrderValue(state.promos),
    };

    state.promos = orderedItems([...state.promos.filter((item) => item.id !== id), payload]);
    promoForm.reset();
    promoForm.elements.id.value = "";
    promoForm.elements.type.value = "percent";
    saveState();
    renderAdminPage();
  });

  customerFieldForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = customerFieldForm.elements.id.value || `customer-field-${Date.now()}`;
    const existing = customerFieldDefinitions().find((item) => item.id === id);
    const label = customerFieldForm.elements.label.value.trim();
    const keyInput = customerFieldForm.elements.key.value.trim();
    const key = slugify(keyInput || label) || `field-${Date.now()}`;
    const type = customerFieldForm.elements.type.value;
    const options = String(customerFieldForm.elements.options.value || "")
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!label) {
      alert("Please enter a field label.");
      return;
    }
    if (type === "select" && !options.length) {
      alert("Please add at least one option for the dropdown field.");
      return;
    }

    const duplicate = customerFieldDefinitions().find((item) => item.key === key && item.id !== id);
    if (duplicate) {
      alert("That field key already exists.");
      return;
    }

    const payload = normalizeCustomerField(
      {
        id,
        label,
        key,
        type,
        options,
        placeholder: customerFieldForm.elements.placeholder.value.trim(),
        required: !!customerFieldForm.elements.required.checked,
        order: existing?.order ?? nextOrderValue(state.camp.customerFields || []),
      },
      existing?.order ?? nextOrderValue(state.camp.customerFields || []),
    );

    state.camp.customerFields = orderedItems([
      ...(state.camp.customerFields || []).filter((item) => item.id !== id),
      payload,
    ]);
    customerFieldForm.reset();
    customerFieldForm.elements.id.value = "";
    customerFieldForm.elements.type.value = "text";
    saveState();
    renderAdminPage();
  });

  document.addEventListener("click", (event) => {
    const editPackageButton = event.target?.closest?.("[data-edit-package]");
    const editRoomButton = event.target?.closest?.("[data-edit-room]");
    const editAddonButton = event.target?.closest?.("[data-edit-addon]");
    const movePackageButton = event.target?.closest?.("[data-move-package]");
    const moveRoomButton = event.target?.closest?.("[data-move-room]");
    const moveAddonButton = event.target?.closest?.("[data-move-addon]");
    const editPromoButton = event.target?.closest?.("[data-edit-promo]");
    const movePromoButton = event.target?.closest?.("[data-move-promo]");
    const editCustomerFieldButton = event.target?.closest?.("[data-edit-customer-field]");
    const moveCustomerFieldButton = event.target?.closest?.("[data-move-customer-field]");

    if (movePackageButton) {
      if (moveOrderedItem("packages", movePackageButton.dataset.movePackage, Number(movePackageButton.dataset.moveDirection || 0))) {
        saveState();
        renderAdminPage();
      }
      return;
    }

    if (moveRoomButton) {
      if (moveOrderedItem("rooms", moveRoomButton.dataset.moveRoom, Number(moveRoomButton.dataset.moveDirection || 0))) {
        ensureAvailabilityCoverage(state);
        saveState();
        renderAdminPage();
      }
      return;
    }

    if (moveAddonButton) {
      if (moveOrderedItem("addons", moveAddonButton.dataset.moveAddon, Number(moveAddonButton.dataset.moveDirection || 0))) {
        saveState();
        renderAdminPage();
      }
      return;
    }

    if (movePromoButton) {
      if (moveOrderedItem("promos", movePromoButton.dataset.movePromo, Number(movePromoButton.dataset.moveDirection || 0))) {
        saveState();
        renderAdminPage();
      }
      return;
    }

    if (moveCustomerFieldButton) {
      const customerFields = orderedItems(state.camp.customerFields || []);
      const index = customerFields.findIndex((item) => item.id === moveCustomerFieldButton.dataset.moveCustomerField);
      const swapIndex = index + Number(moveCustomerFieldButton.dataset.moveDirection || 0);
      if (index >= 0 && swapIndex >= 0 && swapIndex < customerFields.length) {
        const nextItems = customerFields.slice();
        [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
        state.camp.customerFields = nextItems.map((item, order) => ({ ...item, order }));
        saveState();
        renderAdminPage();
      }
      return;
    }

    if (editPackageButton && packageForm) {
      const item = state.packages.find((entry) => entry.id === editPackageButton.dataset.editPackage);
      if (!item) return;
      adminUiState.activeTab = "configure";
      adminUiState.configTab = "packages";
      packageForm.elements.id.value = item.id;
      packageForm.elements.name.value = item.name || "";
      packageForm.elements.description.value = item.description || "";
      packageForm.elements.nights.value = item.nights || 7;
      packageForm.elements.basePrice.value = item.basePrice || 0;
      renderAdminPage();
      return;
    }

    if (editRoomButton && roomForm) {
      const item = state.rooms.find((entry) => entry.id === editRoomButton.dataset.editRoom);
      if (!item) return;
      adminUiState.activeTab = "configure";
      adminUiState.configTab = "rooms";
      roomForm.elements.id.value = item.id;
    roomForm.elements.name.value = item.name || "";
    roomForm.elements.description.value = item.description || "";
    roomForm.elements.totalUnits.value = item.totalUnits || 1;
    roomForm.elements.capacity.value = item.capacity || 1;
    roomForm.elements.pricePerNight.value = item.pricePerNight || 0;
    roomForm.elements.imageUrl.value = item.imageUrl?.startsWith("data:") ? "" : item.imageUrl || "";
    roomForm.elements.learnMoreUrl.value = item.learnMoreUrl || "";
    renderAdminPage();
    return;
  }

    if (editAddonButton && addonForm) {
      const item = state.addons.find((entry) => entry.id === editAddonButton.dataset.editAddon);
      if (!item) return;
      adminUiState.activeTab = "configure";
      adminUiState.configTab = "addons";
      addonForm.elements.id.value = item.id;
      addonForm.elements.name.value = item.name || "";
      addonForm.elements.description.value = item.description || "";
      addonForm.elements.price.value = item.price || 0;
      addonForm.elements.unitLabel.value = item.unitLabel || "per stay";
      renderAdminPage();
    }

    if (editPromoButton && promoForm) {
      const item = state.promos.find((entry) => entry.id === editPromoButton.dataset.editPromo);
      if (!item) return;
      adminUiState.activeTab = "configure";
      adminUiState.configTab = "promos";
      promoForm.elements.id.value = item.id;
      promoForm.elements.code.value = item.code || "";
      promoForm.elements.type.value = item.type || "percent";
      promoForm.elements.percent.value = item.percent || "";
      promoForm.elements.addonId.value = item.addonId || "";
      renderAdminPage();
    }

    if (editCustomerFieldButton && customerFieldForm) {
      const item = customerFieldDefinitions().find((entry) => entry.id === editCustomerFieldButton.dataset.editCustomerField);
      if (!item) return;
      adminUiState.activeTab = "configure";
      adminUiState.configTab = "customerFields";
      customerFieldForm.elements.id.value = item.id;
      customerFieldForm.elements.label.value = item.label || "";
      customerFieldForm.elements.key.value = item.key || "";
      customerFieldForm.elements.type.value = item.type || "text";
      customerFieldForm.elements.options.value = Array.isArray(item.options) ? item.options.join("\n") : "";
      customerFieldForm.elements.placeholder.value = item.placeholder || "";
      customerFieldForm.elements.required.checked = !!item.required;
      renderAdminPage();
    }
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









