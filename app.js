const STORAGE_KEY = "surfcamp-os-demo-v2";
const HOLD_MINUTES = 15;
const authState = {
  user: null,
  token: null,
  workspace: null,
  workspaceLoaded: false,
  syncTimer: null,
};

let bookInteractionsInitialized = false;
let embeddedErrorInteractionsInitialized = false;

function bookingEmbedRuntime() {
  return typeof window !== "undefined" ? window.__SURFCAMP_BOOKING_EMBED__ || null : null;
}

function isEmbeddedBooking() {
  return !!bookingEmbedRuntime();
}

function bookingThemeTarget() {
  return bookingEmbedRuntime()?.themeTarget || document.documentElement;
}

function bookingRootNode() {
  return bookingEmbedRuntime()?.root || document;
}

function bookingHostElement() {
  return bookingEmbedRuntime()?.hostElement || null;
}

function fallbackCampContactName() {
  const slug = requestedCampSlug();
  const stateSlug = String(state?.camp?.slug || "").trim();
  const stateName = String(state?.camp?.name || "").trim();
  if (stateName && stateSlug && slug && stateSlug === slug) return stateName;
  if (slug) {
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "the surf camp host";
}

function getBookElement(id) {
  const root = bookingRootNode();
  if (root === document) return document.getElementById(id);
  return root.querySelector(`#${id}`);
}

function hasBookSurface() {
  return Boolean(getBookElement("stepper"));
}

function bookEventTarget() {
  return bookingEmbedRuntime()?.root || document;
}

function currentStorageKey() {
  const slug = requestedCampSlug();
  return slug ? `${STORAGE_KEY}:${slug}` : STORAGE_KEY;
}

function buildPersistedStateSnapshot(source = state) {
  const snapshot = normalizeWorkspaceData({
    __persistedSnapshot: true,
    camp: {
      ...(source?.camp || {}),
      availability: {},
    },
    currentStep: source?.currentStep ?? 0,
    selectedPackageId: source?.selectedPackageId || "",
    packageQuantities: { ...(source?.packageQuantities || {}) },
    selectedRoomId: source?.selectedRoomId || "",
    roomAllocations: { ...(source?.roomAllocations || {}) },
    selectedAddonIds: Array.isArray(source?.selectedAddonIds) ? [...source.selectedAddonIds] : [],
    customerFieldValues:
      source?.customerFieldValues && typeof source.customerFieldValues === "object"
        ? { ...source.customerFieldValues }
        : {},
    startDate: source?.startDate || "",
    endDate: source?.endDate || "",
    guestName: source?.guestName || "",
    guestPhone: source?.guestPhone || "",
    guestEmail: source?.guestEmail || "",
    guestCountry: source?.guestCountry || "",
    guestBirthDay: source?.guestBirthDay || "",
    guestBirthMonth: source?.guestBirthMonth || "",
    guestBirthYear: source?.guestBirthYear || "",
    guestGender: source?.guestGender || "",
    guestGenders: Array.isArray(source?.guestGenders) ? [...source.guestGenders] : [],
    notes: source?.notes || "",
    bookingConfirmation: source?.bookingConfirmation || null,
    promoCodeInput: source?.promoCodeInput || "",
    promoCodes: Array.isArray(source?.promoCodes) ? [...source.promoCodes] : [],
    promoError: source?.promoError || "",
    bookingIntentId: source?.bookingIntentId || "",
    packages: Array.isArray(source?.packages) ? structuredClone(source.packages) : [],
    rooms: Array.isArray(source?.rooms) ? structuredClone(source.rooms) : [],
    addons: Array.isArray(source?.addons) ? structuredClone(source.addons) : [],
    promos: Array.isArray(source?.promos) ? structuredClone(source.promos) : [],
    bookings: [],
    leads: [],
    bookingIntents: [],
  });

  return snapshot;
}

const bookingUiState = {
  submitting: false,
  calendarReloading: false,
  calendarReloadTimer: null,
};

function createDefaultBilling(now = new Date()) {
  const trialStartedAt = now.toISOString();
  const trialEndsAt = addDays(now, 30);
  const gracePeriodEndsAt = addDays(trialEndsAt, 7);
  return {
    status: "trialing",
    plan: "trial",
    currency: "EUR",
    monthlyPrice: 99,
    trialStartedAt,
    trialEndsAt,
    gracePeriodEndsAt,
    paidThroughAt: "",
    nextBillingAt: trialEndsAt,
    notes: "",
  };
}

const adminUiState = {
  availabilityRoomId: "shared-double",
  availabilityViewStart: localDateKey(new Date()),
  availabilityViewDays: 21,
  availabilityBulkStart: "",
  availabilityBulkEnd: "",
  availabilityBulkPricePerNight: "",
  availabilityBulkMinStay: "",
  availabilityBulkUnits: "",
  availabilityBulkOpenWeekdays: [],
  availabilityBulkEditCheckin: false,
  availabilityBulkDirty: false,
  availabilityBulkInitialized: false,
  activeTab: "bookings",
  configTab: "packages",
  bookingSort: { key: "bookedAt", direction: "desc" },
  leadSort: { key: "createdAt", direction: "desc" },
  bookingDateFilter: "",
  bookingStatusFilter: "",
  bookingSearchQuery: "",
  bookingDetailId: "",
  bookingDetailNotice: "",
  bookingDetailNoticeType: "info",
  availabilitySaving: false,
  availabilityNotice: "",
  availabilityNoticeType: "info",
  packageFormDirty: false,
  packageSaving: false,
  packageNotice: "",
  packageNoticeType: "info",
  bookingEngineFormDirty: false,
  bookingEngineSaving: false,
  bookingEngineNotice: "",
  bookingEngineNoticeType: "info",
  bookingEngineLogoPreviewUrl: "",
  loadingVisible: true,
  loadingTitle: "Loading admin panel",
  loadingDetail: "Checking access and preparing the workspace.",
  loadingEmail: "",
  masterWorkspaces: [],
  masterWorkspaceFilter: "",
  masterWorkspaceView: "active",
  masterWorkspaceLoading: false,
  masterWorkspaceReady: false,
  masterWorkspaceError: "",
  masterLoadingVisible: true,
  masterLoadingTitle: "Loading master portal",
  masterLoadingDetail: "Checking owner access and preparing the tenant list.",
  masterLoadingEmail: "",
  tenantWorkspaceId: "",
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
    billing: createDefaultBilling(),
    customerFields: [],
    bookingRules: {
      restrictedArrivalDays: false,
      allowedArrivalDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      availabilityLowThreshold: 5,
      availabilityMidThreshold: 15,
      availabilityCountVisibilityThreshold: null,
      showAvailabilityColors: true,
      showAvailability: true,
      showPricePerNight: false,
      additionalPriceDisplay: "rooms",
      filterByRoomInCalendar: true,
      packageMode: "individual_guests",
      packagesEnabled: true,
    },
  },
  currentStep: 0,
  selectedPackageId: "package-7",
  packageQuantities: {},
  selectedRoomId: "",
  roomAllocations: {},
  selectedAddonIds: [],
  customerFieldValues: {},
  startDate: "",
  endDate: "",
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  guestCountry: "",
  guestBirthDay: "",
  guestBirthMonth: "",
  guestBirthYear: "",
  guestGender: "",
  guestGenders: [],
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
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "package-7-surf",
      name: "7 nights - surf & stay",
      nights: 7,
      basePrice: 1100,
      description: "Breakfast, surf coaching, boards, and daily surf guiding.",
      imageUrl:
        "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80",
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
      enabled: true,
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
      enabled: true,
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

function defaultAvailabilityMinStay(packages = seedState.packages) {
  const firstPackage = Array.isArray(packages) ? packages[0] : null;
  return Math.max(1, Number(firstPackage?.nights || 1));
}

function defaultAvailabilityCheckinOpen(dateInput, bookingRules = seedState.camp.bookingRules) {
  if (!bookingRules?.restrictedArrivalDays) return true;
  return (bookingRules.allowedArrivalDays || []).includes(weekdayName(dateInput));
}

function createSeedAvailability(rooms, dayCount = 365, bookingRules = seedState.camp.bookingRules, packages = seedState.packages) {
  const availability = {};
  const start = parseDateValue(new Date()) || new Date();
  start.setHours(0, 0, 0, 0);
  const defaultMinStay = defaultAvailabilityMinStay(packages);

  rooms.forEach((room) => {
    availability[room.id] = { days: {} };
    for (let i = 0; i < dayCount; i += 1) {
      const cursor = new Date(start);
      cursor.setDate(cursor.getDate() + i);
      const key = localDateKey(cursor);
      availability[room.id].days[key] = {
        units: room.totalUnits,
        pricePerNight: room.pricePerNight,
        minStay: defaultMinStay,
        openForCheckin: defaultAvailabilityCheckinOpen(key, bookingRules),
      };
    }
  });

  return availability;
}

seedState.camp.availability = createSeedAvailability(seedState.rooms);

const state = loadState();
enableAllDemoCheckinDates(state);
const draft = {
  packageId: state.selectedPackageId,
  packageQuantities: { ...(state.packageQuantities || {}) },
  roomId: state.selectedRoomId,
  roomAllocations: { ...(state.roomAllocations || {}) },
  calendarRoomFilter: state.calendarRoomFilter || "all",
  addonIds: [...state.selectedAddonIds],
  customerFieldValues: { ...(state.customerFieldValues || {}) },
  startDate: state.startDate || "",
  endDate: state.endDate || "",
  calendarMonthOffset: 0,
  dateSelectionMode: "start",
  hoverEndDate: "",
  guestName: state.guestName,
  guestEmail: state.guestEmail,
  guestCountry: state.guestCountry,
  guestBirthDay: state.guestBirthDay || "",
  guestBirthMonth: state.guestBirthMonth || "",
  guestBirthYear: state.guestBirthYear || "",
  guestGender: state.guestGender,
  guestGenders: Array.isArray(state.guestGenders) ? [...state.guestGenders] : [],
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

function migrateAvailabilityDays(
  availability = {},
  rooms = seedState.rooms,
  bookingRules = seedState.camp.bookingRules,
  packages = seedState.packages,
) {
  const defaultMinStay = defaultAvailabilityMinStay(packages);
  const roomList = Array.isArray(rooms) ? rooms : [];
  const nextAvailability = {};

  roomList.forEach((room) => {
    const entry = availability?.[room.id] || {};
    const days = {};

    if (entry.days && typeof entry.days === "object") {
      Object.entries(entry.days).forEach(([dateKey, row]) => {
        days[dateKey] = {
          units: Math.max(0, Number(row?.units ?? room.totalUnits ?? 0)),
          pricePerNight: Math.max(0, Number(row?.pricePerNight ?? room.pricePerNight ?? 0)),
          minStay: Math.max(1, Number(row?.minStay ?? defaultMinStay)),
          openForCheckin:
            typeof row?.openForCheckin === "boolean"
              ? row.openForCheckin
              : defaultAvailabilityCheckinOpen(dateKey, bookingRules),
        };
      });
    } else if (entry.weeks && typeof entry.weeks === "object") {
      Object.entries(entry.weeks).forEach(([weekKey, row]) => {
        for (let offset = 0; offset < 7; offset += 1) {
          const dateKey = addDays(weekKey, offset);
          days[dateKey] = {
            units: Math.max(0, Number(row?.units ?? room.totalUnits ?? 0)),
            pricePerNight: Math.max(0, Number(row?.pricePerNight ?? room.pricePerNight ?? 0)),
            minStay: Math.max(1, Number(row?.minStay ?? defaultMinStay)),
            openForCheckin:
              typeof row?.openForCheckin === "boolean"
                ? row.openForCheckin
                : defaultAvailabilityCheckinOpen(dateKey, bookingRules),
          };
        }
      });
    }

    nextAvailability[room.id] = { days };
  });

  return nextAvailability;
}

function normalizeWorkspaceData(data = {}) {
  const normalizeOrderedCollection = (items = []) =>
    items
      .map((item, index) => ({
        ...item,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
      }))
      .sort((a, b) => a.order - b.order);

  const normalizedPackages = Array.isArray(data.packages)
    ? normalizeOrderedCollection(
        data.packages.map((item) => ({
          ...item,
          imageUrl:
            item?.imageUrl ||
            seedState.packages.find((pkg) => pkg.id === item?.id)?.imageUrl ||
            logoSvg,
        })),
      )
    : normalizeOrderedCollection(structuredClone(seedState.packages));
  const normalizedRooms = Array.isArray(data.rooms)
    ? normalizeOrderedCollection(data.rooms).map((room) => ({
        ...room,
        enabled: room?.enabled !== false,
      }))
    : normalizeOrderedCollection(structuredClone(seedState.rooms));
  const normalizedBookingRules = {
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
    filterByRoomInCalendar:
      typeof data?.camp?.bookingRules?.filterByRoomInCalendar === "boolean"
        ? data.camp.bookingRules.filterByRoomInCalendar
        : seedState.camp.bookingRules.filterByRoomInCalendar,
  };
  const isPersistedSnapshot = data?.__persistedSnapshot === true;
  const normalizedAvailability = migrateAvailabilityDays(
    {
      ...(!isPersistedSnapshot ? seedState.camp.availability || {} : {}),
      ...((data.camp && data.camp.availability) || {}),
    },
    normalizedRooms,
    normalizedBookingRules,
    normalizedPackages,
  );

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
      billing: {
        ...seedState.camp.billing,
        ...((data.camp && data.camp.billing) || {}),
      },
      analytics: {
        ...seedState.camp.analytics,
        ...((data.camp && data.camp.analytics) || {}),
      },
      customerFields: Array.isArray(data?.camp?.customerFields)
        ? data.camp.customerFields.map(normalizeCustomerField)
        : structuredClone(seedState.camp.customerFields || []),
      bookingRules: normalizedBookingRules,
      availability: normalizedAvailability,
      slug: (data.camp && data.camp.slug) || slugify((data.camp && data.camp.name) || seedState.camp.name),
    },
    packages: normalizedPackages,
    rooms: normalizedRooms,
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
    roomAllocations:
      data.roomAllocations && typeof data.roomAllocations === "object" ? { ...data.roomAllocations } : {},
    selectedRoomId:
      data.selectedRoomId ||
      (data.roomAllocations && typeof data.roomAllocations === "object"
        ? Object.entries(data.roomAllocations).find(([, quantity]) => Number(quantity) > 0)?.[0] || ""
        : ""),
    calendarRoomFilter: data.calendarRoomFilter || "all",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    guestName: data.guestName || "",
    guestPhone: data.guestPhone || "",
    guestEmail: data.guestEmail || "",
    guestCountry: data.guestCountry || "",
    guestBirthDay: data.guestBirthDay || "",
    guestBirthMonth: data.guestBirthMonth || "",
    guestBirthYear: data.guestBirthYear || "",
    guestGender: data.guestGender || "",
    guestGenders: Array.isArray(data.guestGenders) ? data.guestGenders : data.guestGender ? [data.guestGender] : [],
    notes: data.notes || "",
    bookingConfirmation: data.bookingConfirmation || null,
    promoCodeInput: data.promoCodeInput || "",
    promoCodes: Array.isArray(data.promoCodes) ? data.promoCodes.map(normalizePromoCode).filter(Boolean) : [],
    promoError: data.promoError || "",
    currentStep: Number.isFinite(data.currentStep) ? data.currentStep : 0,
    bookingIntentId: data.bookingIntentId || "",
  };
}

function isLocalFileDemo() {
  return typeof window !== "undefined" && window.location?.protocol === "file:";
}

function enableAllDemoCheckinDates(targetState = state) {
  if (!isLocalFileDemo() || !targetState?.camp) return;
  targetState.camp.bookingRules = {
    ...(targetState.camp.bookingRules || {}),
    restrictedArrivalDays: false,
    allowedArrivalDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  };
  ensureAvailabilityCoverage(targetState);
  for (const room of orderedItems(targetState.rooms || [])) {
    const days = targetState.camp.availability?.[room.id]?.days || {};
    Object.values(days).forEach((row) => {
      if (row) row.openForCheckin = true;
    });
  }
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
  const stayTotal = stayBasePrice();
  const roomTotal = additionalPriceDisplayMode() === "rooms" ? roomPrice() : roomUpgradePrice();
  const baseAddonTotal = draft.addonIds.reduce((sum, addonId) => sum + Number(getAddon(addonId)?.price || 0), 0);
  const freeAddonDiscount = draft.addonIds.reduce(
    (sum, addonId) => sum + (selectedFreeAddonIds().includes(addonId) ? Number(getAddon(addonId)?.price || 0) : 0),
    0,
  );
  const appliedStayTotal = additionalPriceDisplayMode() === "calendar" ? stayTotal : 0;
  const subtotal = packageTotal + appliedStayTotal + roomTotal + baseAddonTotal - freeAddonDiscount;
  const percentPromos = selectedPercentPromos();
  const totalAfterPercent = percentPromos.reduce((running, percent) => running - running * (percent / 100), subtotal);
  const roundedTotal = Math.max(0, Math.round(totalAfterPercent));
  return {
    packageTotal,
    stayTotal,
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
  const root = bookingThemeTarget();
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
  const raw = localStorage.getItem(currentStorageKey());
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
  const storageKey = currentStorageKey();
  const snapshot = JSON.stringify(buildPersistedStateSnapshot(state));

  try {
    localStorage.setItem(storageKey, snapshot);
  } catch (error) {
    console.warn("[storage] failed to persist workspace snapshot", {
      key: storageKey,
      message: error?.message || String(error),
    });
    try {
      localStorage.removeItem(storageKey);
      localStorage.setItem(storageKey, snapshot);
    } catch (retryError) {
      console.warn("[storage] failed to persist workspace snapshot after clearing key", {
        key: storageKey,
        message: retryError?.message || String(retryError),
      });
    }
  }

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

function embedScriptUrl() {
  if (window.location.protocol === "file:") {
    return `./embed.js?slug=${bookingSlug()}`;
  }

  try {
    return new URL("/embed.js", window.location.origin).toString();
  } catch {
    return "/embed.js";
  }
}

function embedScriptSnippet() {
  return `<script src="${embedScriptUrl()}" data-slug="${bookingSlug()}"></script>`;
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
  const embedSlug = String(
    bookingEmbedRuntime()?.slug || bookingEmbedRuntime()?.camp || bookingEmbedRuntime()?.workspaceSlug || "",
  ).trim();
  if (isEmbeddedBooking()) {
    return embedSlug;
  }

  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("camp");
  if (querySlug) return querySlug;

  const match = window.location.pathname.match(/\/book\/([^/?#]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);

  return seedState.camp.slug;
}

function apiUrl(path) {
  const siteUrl = String(bookingEmbedRuntime()?.siteUrl || "").replace(/\/$/, "");
  return `${siteUrl}/.netlify/functions/${path}`;
}

async function apiJson(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (options.body && !("Content-Type" in headers) && !("content-type" in headers)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(apiUrl(path), {
    headers,
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
  return bookingCalendarRooms().some((room) => roomOpenForCheckin(room.id, dateInput));
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

function bookingRulesConfig() {
  return state?.camp?.bookingRules || seedState.camp.bookingRules;
}

function packagesEnabled(bookingRules = bookingRulesConfig()) {
  return bookingRules?.packagesEnabled !== false;
}

function bookingPackageMode(bookingRules = bookingRulesConfig()) {
  return bookingRules?.packageMode === "full_unit" ? "full_unit" : "individual_guests";
}

function isFullUnitMode(bookingRules = bookingRulesConfig()) {
  return bookingPackageMode(bookingRules) === "full_unit";
}

function showAvailabilityColors(bookingRules = bookingRulesConfig()) {
  return bookingRules?.showAvailabilityColors !== false;
}

function showAvailabilityCounts(bookingRules = bookingRulesConfig()) {
  return bookingRules?.showAvailability !== false;
}

function showPricePerNightInCalendar(bookingRules = bookingRulesConfig()) {
  return bookingRules?.additionalPriceDisplay === "calendar" || bookingRules?.showPricePerNight === true;
}

function additionalPriceDisplayMode(bookingRules = bookingRulesConfig()) {
  if (bookingRules?.additionalPriceDisplay === "calendar") return "calendar";
  if (bookingRules?.additionalPriceDisplay === "rooms") return "rooms";
  return isFullUnitMode(bookingRules) ? "calendar" : "rooms";
}

function effectivePackageId() {
  return draft.packageId || orderedItems(state.packages)[0]?.id || "";
}

function bookingStepFlow() {
  return packagesEnabled() ? ["package", "date", "room", "addons", "book"] : ["date", "room", "addons", "book"];
}

function bookingStepIndex(stepKey) {
  const index = bookingStepFlow().indexOf(stepKey);
  return index >= 0 ? index : 0;
}

function currentBookingStepKey() {
  const flow = bookingStepFlow();
  return flow[Math.max(0, Math.min(draft.currentStep || 0, flow.length - 1))] || flow[0] || "date";
}

function normalizeCurrentBookStep() {
  const flow = bookingStepFlow();
  draft.currentStep = Math.max(0, Math.min(draft.currentStep || 0, flow.length - 1));
}

function bookingQuantityLabel() {
  return isFullUnitMode() ? "Units" : "Number of people";
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
  return (
    isArrivalAllowed(startDate, state.camp.bookingRules) &&
    campSpotsLeftForDate(startDate, stayMinimumNightsForDate(startDate)) >= Math.max(1, selectedPackagePeopleCount())
  );
}

function firstBookableStartDate(afterDate = nextDefaultDate(), bookingRules = seedState.camp.bookingRules) {
  const cursor = parseDateValue(afterDate) || new Date();
  for (let i = 0; i < 365; i += 1) {
    const candidate = localDateKey(cursor);
    if (isArrivalAllowed(candidate, bookingRules) && hasAvailabilityForDate(candidate)) {
      return candidate;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return afterDate;
}

function firstBookableMonth() {
  return startOfMonth(parseDateValue(firstBookableStartDate()) || new Date());
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
    draft.endDate = "";
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

function bookingVisibleRooms() {
  return orderedItems(state.rooms).filter((room) => room.enabled !== false);
}

function bookingCalendarFilterEnabled(bookingRules = bookingRulesConfig()) {
  return bookingRules?.filterByRoomInCalendar !== false;
}

function bookingCalendarRooms(roomFilter = draft.calendarRoomFilter) {
  const visibleRooms = bookingVisibleRooms();
  if (!bookingCalendarFilterEnabled()) return visibleRooms;
  if (!roomFilter || roomFilter === "all") return visibleRooms;
  const selectedRoom = visibleRooms.find((room) => room.id === roomFilter);
  return selectedRoom ? [selectedRoom] : visibleRooms;
}

function pricingBaselineRooms() {
  return bookingVisibleRooms();
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

function normalizedGuestGenders(values = [], guestCount = selectedPackagePeopleCount()) {
  const count = Math.max(1, Number(guestCount) || 1);
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return Array.from({ length: count }, (_, index) => String(source[index] || "").trim());
}

function guestGenderEntries(values = draft.guestGenders) {
  return normalizedGuestGenders(values, selectedPackagePeopleCount());
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

function formatDateShort(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function formatDateTimeParts(value) {
  const date = parseDateValue(value);
  if (!date) {
    return { label: "", day: "", month: "", year: "" };
  }

  return {
    label: formatDateTime(date),
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

function bookingGuestCount(booking = {}) {
  if (Number.isFinite(Number(booking.guestCount))) {
    return Number(booking.guestCount);
  }

  if (booking.packageQuantities && typeof booking.packageQuantities === "object") {
    const total = Object.values(booking.packageQuantities).reduce((sum, quantity) => sum + Math.max(0, Number(quantity) || 0), 0);
    if (total > 0) return total;
  }

  return Math.max(1, Number(booking.packagePeople || 1));
}

function bookingLengthOfStay(booking = {}) {
  return Math.max(0, nightsBetween(booking.startDate, booking.endDate));
}

function bookingPackageSummary(booking = {}) {
  if (booking.packageQuantities && typeof booking.packageQuantities === "object") {
    const rows = Object.entries(booking.packageQuantities)
      .map(([packageId, quantity]) => {
        const pkg = state.packages.find((item) => item.id === packageId);
        if (!pkg || !quantity) return null;
        return `${pkg.name} x ${quantity}`;
      })
      .filter(Boolean);
    if (rows.length) return rows.join(", ");
  }

  const fallback = state.packages.find((item) => item.id === booking.packageId);
  return `${fallback?.name || booking.packageId || ""} x ${Math.max(1, Number(booking.packagePeople || 1))}`;
}

function bookingRoomAllocationSummary(booking = {}) {
  const allocations = booking.roomAllocations && typeof booking.roomAllocations === "object" ? booking.roomAllocations : null;
  if (allocations) {
    const rows = Object.entries(allocations)
      .map(([roomId, quantity]) => {
        const room = getRoom(roomId);
        if (!room || !quantity) return null;
        return `${room.name} x ${quantity}`;
      })
      .filter(Boolean);
    if (rows.length) return rows.join(", ");
  }

  const fallbackRoom = getRoom(booking.roomId);
  return fallbackRoom ? `${fallbackRoom.name} x ${bookingGuestCount(booking)}` : booking.roomId || "";
}

function bookingRoomAllocationEntries(booking = {}) {
  if (booking.roomAllocations && typeof booking.roomAllocations === "object") {
    return Object.entries(booking.roomAllocations)
      .map(([roomId, quantity]) => [roomId, Math.max(0, Number(quantity) || 0)])
      .filter(([, quantity]) => quantity > 0);
  }

  if (booking.roomId) {
    return [[booking.roomId, bookingGuestCount(booking)]];
  }

  return [];
}

function bookingRoomAllocationCountForRoom(booking = {}, roomId = "") {
  return bookingRoomAllocationEntries(booking).find(([entryRoomId]) => entryRoomId === roomId)?.[1] || 0;
}

function bookingAddonSummary(booking = {}) {
  const addonIds = Array.isArray(booking.addonIds) ? booking.addonIds : [];
  if (!addonIds.length) return "";

  const counts = addonIds.reduce((map, addonId) => {
    map.set(addonId, (map.get(addonId) || 0) + 1);
    return map;
  }, new Map());

  return Array.from(counts.entries())
    .map(([addonId, quantity]) => {
      const addon = getAddon(addonId);
      return `${addon?.name || addonId} x ${quantity}`;
    })
    .join(", ");
}

function bookingDateOptions() {
  return Array.from(
    new Map(
      state.bookings
        .map((booking) => booking.startDate)
        .filter(Boolean)
        .map((date) => [date, date]),
  ).values(),
  ).sort((a, b) => new Date(a) - new Date(b));
}

function bookingStatusFilterOptions() {
  const preferredOrder = ["confirmed", "held", "cancelled", "expired"];
  const statuses = new Set(state.bookings.map((booking) => booking.status).filter(Boolean));
  return [
    ...preferredOrder.filter((status) => statuses.has(status)),
    ...Array.from(statuses).filter((status) => !preferredOrder.includes(status)).sort(),
  ];
}

function bookingSearchFilterText(booking) {
  return [
    booking.guestName,
    booking.reservationCode,
    booking.reservationId,
    booking.guestEmail,
    booking.guestPhone,
    booking.guestCountry,
    booking.guestBirthDay,
    booking.guestBirthMonth,
    booking.guestBirthYear,
    getRoom(booking.roomId)?.name,
    booking.roomId,
    bookingRoomAllocationSummary(booking),
    bookingPackageSummary(booking),
    bookingAddonSummary(booking),
    booking.status,
    booking.notes,
    booking.customerDetails ? customerDetailsSummaryText(booking.customerDetails) : "",
    formatDateShort(booking.startDate),
    formatDateShort(booking.endDate),
    booking.total,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filteredAdminBookings() {
  const filterDate = adminUiState.bookingDateFilter || "";
  const filterStatus = adminUiState.bookingStatusFilter || "";
  const filterSearch = adminUiState.bookingSearchQuery.trim().toLowerCase();
  return state.bookings.filter((booking) => {
    if (filterDate && booking.startDate !== filterDate) return false;
    if (filterStatus && booking.status !== filterStatus) return false;
    if (filterSearch && !bookingSearchFilterText(booking).includes(filterSearch)) return false;
    return true;
  });
}

function bookingStatusOptions() {
  return [
    { value: "confirmed", label: "Confirmed" },
    { value: "held", label: "Held" },
    { value: "cancelled", label: "Cancelled" },
  ];
}

function businessCheckInDates() {
  return Array.from(
    new Set(
      state.bookings
        .filter((booking) => booking.startDate && bookingCountsTowardBusiness(booking))
        .map((booking) => booking.startDate),
    ),
  ).sort((a, b) => new Date(a) - new Date(b));
}

function businessBookingsForDate(checkInDate) {
  return state.bookings.filter((booking) => booking.startDate === checkInDate && bookingCountsTowardBusiness(booking));
}

function businessGuestCapacityForDate(checkInDate) {
  return state.rooms.reduce((sum, room) => {
    const row = state.camp.availability?.[room.id]?.days?.[localDateKey(checkInDate)];
    const units = Number(row?.units ?? room.totalUnits ?? 0);
    return sum + Math.max(0, units);
  }, 0);
}

function businessWeeklyRows() {
  return businessCheckInDates().map((checkInDate) => {
    const bookings = businessBookingsForDate(checkInDate);
    const spotsBooked = bookings.reduce((sum, booking) => sum + bookingGuestCount(booking), 0);
    const spotsAvailable = Math.max(0, businessGuestCapacityForDate(checkInDate) - spotsBooked);
    const totalCapacity = spotsBooked + spotsAvailable;
    const occupancy = totalCapacity > 0 ? Math.round((spotsBooked / totalCapacity) * 100) : 0;
    const revenueSum = bookings.reduce(
      (sum, booking) => sum + (booking.status === "confirmed" ? Number(booking.total || 0) : 0),
      0,
    );

    return {
      checkInDate,
      spotsBooked,
      spotsAvailable,
      occupancy,
      revenueSum,
    };
  });
}

function bookingCountsTowardBusiness(booking) {
  if (!booking) return false;
  return booking.status === "confirmed" || booking.status === "held";
}

function billingState() {
  return state.camp?.billing || seedState.camp.billing;
}

function billingDueDate(billing = billingState()) {
  if (!billing) return "";
  if (billing.status === "active" && billing.paidThroughAt) return billing.paidThroughAt;
  if (billing.status === "past_due" && billing.gracePeriodEndsAt) return billing.gracePeriodEndsAt;
  if (billing.status === "suspended" && billing.gracePeriodEndsAt) return billing.gracePeriodEndsAt;
  return billing.trialEndsAt || billing.nextBillingAt || billing.paidThroughAt || "";
}

function billingDaysRemaining(billing = billingState()) {
  const dueDate = billingDueDate(billing);
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function billingDisplayStatus(billing = billingState()) {
  const status = String(billing?.status || "trialing");
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function billingStatusTone(billing = billingState()) {
  const days = billingDaysRemaining(billing);
  if (days === null) return "neutral";
  if (days <= 0 || billing.status === "suspended") return "danger";
  if (days <= 7 || billing.status === "past_due") return "warning";
  return "neutral";
}

function billingBannerText(billing = billingState()) {
  const days = billingDaysRemaining(billing);
  if (days === null) return "";
  if (days <= 0 || billing.status === "suspended") {
    return "Billing overdue. The booking engine may stop working.";
  }
  if (days === 1) {
    return "1 day left before the booking engine stops working.";
  }
  if (days <= 7) {
    return `${days} days left before the booking engine stops working.`;
  }
  return "";
}

function bookingDetailNoticeMarkup() {
  if (!adminUiState.bookingDetailNotice) return "";
  const cls = adminUiState.bookingDetailNoticeType === "success" ? "notice success" : "notice";
  return `<div class="${cls}">${escapeHtml(adminUiState.bookingDetailNotice)}</div>`;
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function bookingsToCsv(rows = []) {
  const headers = [
    "Time",
    "Reservation ID",
    "Booking status",
    "Guest name",
    "Nr of guests",
    "Check-in date",
    "Length of stay",
    "Gender",
    "Room",
    "Email",
    "Phone",
  ];

  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((booking) => {
    const bookingTime = formatDateTimeParts(booking.createdAt);
    lines.push(
      [
        bookingTime.label,
        booking.reservationCode || booking.reservationId || "",
        booking.status || "",
        booking.guestName || "",
        bookingGuestCount(booking),
        formatDateShort(booking.startDate),
        bookingLengthOfStay(booking),
        bookingGenderSummary(booking),
        bookingRoomAllocationSummary(booking) || getRoom(booking.roomId)?.name || booking.roomId || "",
        booking.guestEmail || "",
        booking.guestPhone || "",
        ]
          .map(csvEscape)
          .join(","),
    );
  });

  return lines.join("\r\n");
}

function openBookingDetail(bookingId) {
  adminUiState.bookingDetailId = bookingId || "";
  adminUiState.bookingDetailNotice = "";
  adminUiState.bookingDetailNoticeType = "info";
  renderAdminPage();
}

function closeBookingDetail() {
  adminUiState.bookingDetailId = "";
  adminUiState.bookingDetailNotice = "";
  adminUiState.bookingDetailNoticeType = "info";
  renderAdminPage();
}

function currentBookingDetail() {
  return state.bookings.find((booking) => booking.id === adminUiState.bookingDetailId) || null;
}

function setBookingDetailNotice(message, type = "info") {
  adminUiState.bookingDetailNotice = message;
  adminUiState.bookingDetailNoticeType = type;
}

function endDateForDraft() {
  if (!draft.startDate) return "";
  if (draft.endDate) return draft.endDate;
  return addDays(draft.startDate, bookingNights());
}

function nightsBetween(startDate, endDate) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!start || !end) return 0;
  const diff = end.getTime() - start.getTime();
  return diff > 0 ? Math.round(diff / (24 * 60 * 60 * 1000)) : 0;
}

function dateKeysBetween(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const keys = [];
  const cursor = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!cursor || !end || cursor >= end) return [];
  while (cursor < end) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function availabilityDateKeysForRoom(roomId) {
  return Object.keys(state.camp.availability?.[roomId]?.days || {}).sort((a, b) => new Date(a) - new Date(b));
}

function availabilityCalendarBounds() {
  const keys = Array.from(new Set(bookingCalendarRooms().flatMap((room) => availabilityDateKeysForRoom(room.id)))).sort(
    (a, b) => new Date(a) - new Date(b),
  );

  const currentMonth = startOfMonth(new Date());
  if (!keys.length) {
    return {
      hasBounds: false,
      firstMonth: currentMonth,
      lastMonth: currentMonth,
      minOffset: 0,
      maxOffset: 0,
    };
  }

  const firstMonth = startOfMonth(parseDateValue(keys[0]) || new Date());
  const lastMonth = startOfMonth(parseDateValue(keys[keys.length - 1]) || new Date());
  return {
    hasBounds: true,
    firstMonth,
    lastMonth,
    minOffset: monthOffsetBetween(currentMonth, firstMonth),
    maxOffset: monthOffsetBetween(currentMonth, lastMonth),
  };
}

function availabilityHasCoverageForDate(dateInput) {
  const dayKey = localDateKey(dateInput);
  return bookingCalendarRooms().some((room) => !!state.camp.availability?.[room.id]?.days?.[dayKey]);
}

function roomAvailabilityRow(roomId, dateInput) {
  return state.camp.availability?.[roomId]?.days?.[localDateKey(dateInput)] || null;
}

function roomNightRate(roomId, dateInput) {
  const room = getRoom(roomId);
  return Number(roomAvailabilityRow(roomId, dateInput)?.pricePerNight ?? room?.pricePerNight ?? 0);
}

function roomMinimumStay(roomId, dateInput) {
  return Math.max(1, Number(roomAvailabilityRow(roomId, dateInput)?.minStay ?? defaultAvailabilityMinStay(state.packages)));
}

function roomOpenForCheckin(roomId, dateInput) {
  const row = roomAvailabilityRow(roomId, dateInput);
  if (!row) return false;
  return row.openForCheckin !== false;
}

function stayMinimumNightsForDate(dateInput) {
  const openRows = bookingCalendarRooms()
    .map((room) => roomAvailabilityRow(room.id, dateInput))
    .filter((row) => row && row.openForCheckin !== false);
  if (!openRows.length) return defaultAvailabilityMinStay(state.packages);
  return Math.max(1, ...openRows.map((row) => Math.max(1, Number(row.minStay ?? 1))));
}

function bookingNights() {
  if (!draft.startDate) return 0;
  const selectedNights = nightsBetween(draft.startDate, draft.endDate);
  if (selectedNights > 0) return selectedNights;
  return stayMinimumNightsForDate(draft.startDate);
}

function previewStayNights(dateInput = draft.startDate || nextDefaultDate()) {
  if (dateInput) return stayMinimumNightsForDate(dateInput);
  return defaultAvailabilityMinStay(state.packages);
}

function formatCalendarPrice(value) {
  if (!value) return "";
  return `EUR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

function calendarDatePrice(dateInput) {
  if (!dateInput) return 0;
  const stayNights = shouldAutoSelectCheckout(dateInput) ? stayMinimumNightsForDate(dateInput) : 1;
  const stayEndDate = addDays(dateInput, stayNights);
  const totals = pricingBaselineRooms()
    .filter((room) => roomOpenForCheckin(room.id, dateInput) && roomAvailableSpots(room.id, dateInput, stayEndDate) > 0)
    .map((room) => dateKeysBetween(dateInput, stayEndDate).reduce((sum, dateKey) => sum + roomNightRate(room.id, dateKey), 0))
    .filter((value) => value > 0);

  return totals.length ? Math.min(...totals) : 0;
}

function formatSurcharge(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (!amount) return "";
  return `+${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)} \u20AC`;
}

function campSpotsLeftForDate(startDate, nights = previewStayNights()) {
  if (!startDate) return 0;

  const endDate = addDays(startDate, nights);
  const dateKeys = dateKeysBetween(startDate, endDate);
  if (!dateKeys.length) return 0;

  const dayTotals = dateKeys.map((dateKey) =>
    bookingCalendarRooms().reduce((sum, room) => {
      const row = roomAvailabilityRow(room.id, dateKey);
      if (!row) return sum;
      const booked = bookedUnitsForDate(room.id, dateKey);
      return sum + Math.max(0, Number(row.units ?? 0) - booked);
    }, 0),
  );

  return Math.max(0, Math.min(...dayTotals));
}

function roomConfiguredUnits(roomId, startDate) {
  if (!startDate) return 0;
  const row = state.camp.availability?.[roomId]?.days?.[localDateKey(startDate)];
  return Math.max(0, Number(row?.units ?? 0));
}

function campConfiguredSpotsForDate(startDate, nights = previewStayNights()) {
  if (!startDate) return 0;
  return bookingCalendarRooms().reduce(
    (sum, room) => sum + roomConfiguredUnits(room.id, startDate),
    0,
  );
}

function canStayThrough(startDate, endDate, guestCount = selectedPackagePeopleCount()) {
  if (!startDate || !endDate) return false;
  return campSpotsLeftForDate(startDate, nightsBetween(startDate, endDate)) >= Math.max(1, guestCount);
}

function isSelectableCheckoutDate(dateInput, startDate = draft.startDate) {
  const today = new Date();
  const date = parseDateValue(dateInput);
  if (!date || date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
  if (!startDate) return false;
  const minimumStay = stayMinimumNightsForDate(startDate);
  const nights = nightsBetween(startDate, dateInput);
  if (nights < minimumStay) return false;
  return canStayThrough(startDate, dateInput);
}

function previewCheckoutDate() {
  if (draft.dateSelectionMode === "end" && draft.startDate) {
    return draft.hoverEndDate || draft.endDate || addDays(draft.startDate, stayMinimumNightsForDate(draft.startDate));
  }
  return draft.endDate || "";
}

function shouldAutoSelectCheckout(startDate) {
  if (!startDate) return false;
  const minimumStay = stayMinimumNightsForDate(startDate);
  if (minimumStay <= 1) return false;
  const suggestedCheckout = addDays(startDate, minimumStay);
  if (!isSelectableCheckoutDate(suggestedCheckout, startDate)) return false;

  for (let offset = 1; offset < minimumStay; offset += 1) {
    if (isArrivalAllowed(addDays(startDate, offset), state.camp.bookingRules)) {
      return false;
    }
  }

  return true;
}

function availabilityBandClass(spots) {
  const { lowThreshold, midThreshold } = availabilityThresholds();
  if (spots <= 0) return "soldout-day";
  if (spots <= lowThreshold) return "availability-low";
  if (spots <= midThreshold) return "availability-mid";
  return "availability-high";
}

function roomAvailableSpots(roomId, startDate = draft.startDate, endDate = endDateForDraft()) {
  if (getRoom(roomId)?.enabled === false) return 0;
  return availableUnits(roomId, startDate, endDate);
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
  const dayStart = parseDateValue(new Date()) || new Date();
  dayStart.setHours(0, 0, 0, 0);
  const defaultMinStay = defaultAvailabilityMinStay(targetState.packages || seedState.packages);

  targetState.rooms.forEach((room) => {
    if (!targetState.camp.availability[room.id]) {
      targetState.camp.availability[room.id] = { days: {} };
    }
    if (!targetState.camp.availability[room.id].days) {
      const migrated = migrateAvailabilityDays(
        { [room.id]: targetState.camp.availability[room.id] },
        [room],
        targetState.camp.bookingRules,
        targetState.packages || seedState.packages,
      );
      targetState.camp.availability[room.id].days = migrated[room.id]?.days || {};
    }

    for (let i = 0; i < 366; i += 1) {
      const cursor = new Date(dayStart);
      cursor.setDate(cursor.getDate() + i);
      const key = localDateKey(cursor);
      if (!targetState.camp.availability[room.id].days[key]) {
        targetState.camp.availability[room.id].days[key] = {
            units: room.totalUnits,
            pricePerNight: room.pricePerNight,
            minStay: defaultMinStay,
            openForCheckin: defaultAvailabilityCheckinOpen(key, targetState.camp.bookingRules),
        };
      }
    }
    });
}

function packageQuantity(packageId) {
  return Math.max(0, Number(draft.packageQuantities?.[packageId] || 0));
}

function normalizePackageSelections() {
  const firstPackageId = orderedItems(state.packages)[0]?.id || "";
  if (!packagesEnabled()) {
    draft.packageQuantities = {};
    draft.packageId = draft.packageId || firstPackageId;
    return;
  }

  if (isFullUnitMode()) {
    const selectedPackageId = selectedPackageRows()[0]?.id || draft.packageId || firstPackageId;
    const hasSelection = Object.values(draft.packageQuantities || {}).some((quantity) => Number(quantity) > 0);
    draft.packageQuantities = hasSelection && selectedPackageId ? { [selectedPackageId]: 1 } : {};
    draft.packageId = selectedPackageId;
    return;
  }

  draft.packageId = draft.packageId || selectedPackageRows()[0]?.id || firstPackageId;
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
  if (!packagesEnabled()) return 1;
  if (isFullUnitMode()) return Math.min(1, selectedPackageRows().reduce((sum, item) => sum + item.quantity, 0));
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

function roomAllocationQuantity(roomId, allocations = draft.roomAllocations) {
  return Math.max(0, Number(allocations?.[roomId] || 0));
}

function selectedRoomAllocationRows() {
  return bookingVisibleRooms()
    .map((room) => ({
      ...room,
      quantity: roomAllocationQuantity(room.id),
    }))
    .filter((room) => room.quantity > 0);
}

function selectedRoomAllocationPeopleCount() {
  return selectedRoomAllocationRows().reduce((sum, room) => sum + room.quantity, 0);
}

function normalizeRoomAllocations() {
  const guestLimit = selectedPackagePeopleCount();
  if (!guestLimit) {
    draft.roomAllocations = {};
    draft.roomId = "";
    return;
  }

  const nextAllocations = {};
  let remaining = guestLimit;
  for (const room of bookingVisibleRooms()) {
    const current = roomAllocationQuantity(room.id);
    const maxForRoom = Math.min(roomAvailableSpots(room.id, draft.startDate, endDateForDraft()), remaining);
    const next = Math.max(0, Math.min(current, maxForRoom));
    if (next > 0) {
      nextAllocations[room.id] = next;
      remaining -= next;
    }
  }

  draft.roomAllocations = nextAllocations;
  draft.roomId = selectedRoomAllocationRows()[0]?.id || "";
}

function setRoomAllocationQuantity(roomId, quantity) {
  const guestLimit = selectedPackagePeopleCount();
  const current = roomAllocationQuantity(roomId);
  const otherAllocated = selectedRoomAllocationPeopleCount() - current;
  const availableSpots = roomAvailableSpots(roomId, draft.startDate, endDateForDraft());
  const maxForRoom = Math.min(
    availableSpots,
    Math.max(0, guestLimit - otherAllocated),
  );
  const nextQuantity = Math.max(0, Math.min(maxForRoom, Number(quantity) || 0));
  draft.roomAllocations = {
    ...(draft.roomAllocations || {}),
    [roomId]: nextQuantity,
  };
  if (nextQuantity <= 0) {
    delete draft.roomAllocations[roomId];
  }
  normalizeRoomAllocations();
}

function debugRoomAllocationChange(roomId, delta) {
  const current = roomAllocationQuantity(roomId);
  setRoomAllocationQuantity(roomId, current + delta);
  state.bookingConfirmation = null;
  updateBookPage();
  return false;
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

function overlappingBookings(roomId, startDate, endDate) {
  return state.bookings.filter((booking) => {
    if (!bookingRoomAllocationCountForRoom(booking, roomId)) return false;
    if (!blocksInventory(booking)) return false;
    return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
  });
}

function availableUnits(roomId, startDate, endDate) {
  const room = getRoom(roomId);
  if (!startDate || !endDate) {
    return Math.max(0, Number(room?.totalUnits ?? 0));
  }
  if (!roomOpenForCheckin(roomId, startDate)) {
    return 0;
  }
  const dateKeys = dateKeysBetween(startDate, endDate);
  if (!dateKeys.length) return 0;
  const availableByDate = dateKeys.map((dateKey) => {
    const row = roomAvailabilityRow(roomId, dateKey);
    const total = Number(row?.units ?? room?.totalUnits ?? 0);
    const booked = bookedUnitsForDate(roomId, dateKey);
    return Math.max(0, total - booked);
  });
  return Math.max(0, Math.min(...availableByDate));
}

function bookedUnitsForDate(roomId, dateKey) {
  const startDate = dateKey;
  const endDate = addDays(dateKey, 1);
  return state.bookings
    .filter((booking) => {
      if (!bookingRoomAllocationCountForRoom(booking, roomId)) return false;
      if (!blocksInventory(booking)) return false;
      return rangesOverlap(startDate, endDate, booking.startDate, booking.endDate);
    })
    .reduce((sum, booking) => sum + bookingRoomAllocationCountForRoom(booking, roomId), 0);
}

function roomAvailabilitySnapshot(roomId, startDate = draft.startDate, endDate = endDateForDraft()) {
  const room = getRoom(roomId);
  if (!startDate || !endDate) {
    const available = Math.max(0, Number(room?.totalUnits ?? 0));
    return {
      available,
      booked: 0,
      forSale: available,
    };
  }
  if (!roomOpenForCheckin(roomId, startDate)) {
    return {
      available: 0,
      booked: 0,
      forSale: 0,
    };
  }
  const dateKeys = dateKeysBetween(startDate, endDate);

  if (!dateKeys.length) {
    const available = 0;
    const booked = overlappingBookings(roomId, startDate, endDate).reduce((sum, booking) => sum + bookingGuestCount(booking), 0);
    return {
      available,
      booked,
      forSale: Math.max(0, available - booked),
    };
  }

  const dayStats = dateKeys.map((dateKey) => {
    const row = roomAvailabilityRow(roomId, dateKey);
    const available = Number(row?.units ?? 0);
    const booked = bookedUnitsForDate(roomId, dateKey);
    return {
      available,
      booked,
      forSale: Math.max(0, available - booked),
    };
  });

  return {
    available: Math.min(...dayStats.map((item) => item.available)),
    booked: Math.max(...dayStats.map((item) => item.booked)),
    forSale: Math.min(...dayStats.map((item) => item.forSale)),
  };
}

function firstAvailableRoom(startDate = draft.startDate, endDate = endDateForDraft()) {
  return bookingVisibleRooms().find((room) => availableUnits(room.id, startDate, endDate) > 0)?.id || null;
}

function firstRoomForParty(
  startDate = draft.startDate,
  endDate = endDateForDraft(),
  guestCount = selectedPackagePeopleCount(),
) {
  return bookingVisibleRooms().find((room) => roomCanFitParty(room.id, startDate, endDate, guestCount))?.id || null;
}

function ensureRoomSelection() {
  normalizeRoomAllocations();
}

function roomPrice() {
  if (!draft.startDate || !selectedRoomAllocationRows().length) return 0;
  const endDate = endDateForDraft();
  const dateKeys = dateKeysBetween(draft.startDate, endDate);
  if (!dateKeys.length) return 0;
  return selectedRoomAllocationRows().reduce((sum, room) => {
    const nightlyTotal = dateKeys.reduce((nightSum, dateKey) => nightSum + roomNightRate(room.id, dateKey), 0);
    return sum + nightlyTotal * room.quantity;
  }, 0);
}

function stayBasePrice(startDate = draft.startDate, endDate = endDateForDraft()) {
  if (!startDate || !endDate) return 0;
  const dateKeys = dateKeysBetween(startDate, endDate);
  if (!dateKeys.length) return 0;
  const roomTotals = pricingBaselineRooms()
    .filter((room) => roomOpenForCheckin(room.id, startDate) && roomAvailableSpots(room.id, startDate, endDate) > 0)
    .map((room) => dateKeys.reduce((sum, dateKey) => sum + roomNightRate(room.id, dateKey), 0))
    .filter((value) => value > 0);
  return roomTotals.length ? Math.min(...roomTotals) : 0;
}

function roomExtraTotal(roomTotalPrice) {
  return Math.max(0, Number(roomTotalPrice) - stayBasePrice());
}

function formatExtraPrice(value) {
  return `+${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0))} \u20AC`;
}

function roomUpgradePrice() {
  return roomExtraTotal(roomPrice());
}

function roomDisplayedPrice(roomTotalPrice) {
  return roomExtraTotal(roomTotalPrice);
}

function selectedRoomDisplayedPrice() {
  return additionalPriceDisplayMode() === "rooms" ? roomPrice() : roomExtraTotal(roomPrice());
}

function calendarOffsetForDate(dateInput) {
  return monthOffsetBetween(firstBookableMonth(), dateInput);
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
  if (snapshot.forSale === 1) return { label: "1 remaining to sell", cls: "low" };
  return { label: `${snapshot.forSale} remaining to sell`, cls: "" };
}

function isSoldOutStartDate(dateInput) {
  const today = new Date();
  const date = new Date(dateInput);
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
  if (!isArrivalAllowed(dateInput, state.camp.bookingRules)) return false;
  return !hasAvailabilityForDate(dateInput);
}

function refreshCalendarPreview(roomFilter = draft.calendarRoomFilter) {
  draft.calendarRoomFilter = roomFilter || "all";
  syncDraftToState();
  saveState();
  bookingUiState.calendarReloading = true;
  if (bookingUiState.calendarReloadTimer) {
    clearTimeout(bookingUiState.calendarReloadTimer);
  }
  renderBookPage();
  bookingUiState.calendarReloadTimer = window.setTimeout(() => {
    bookingUiState.calendarReloading = false;
    renderBookPage();
  }, 180);
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
  const today = new Date();
  const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const hasCoverage = availabilityHasCoverageForDate(iso);
  const checkinOpen = isArrivalAllowed(iso, state.camp.bookingRules);
  const selectingCheckout = draft.dateSelectionMode === "end" && !!draft.startDate;
  const selected = iso === draft.startDate;
  const previewEndDate = previewCheckoutDate();
  const selectedCheckout = !selected && iso === previewEndDate;
  const rangeStart = draft.startDate;
  const rangeEnd = selectingCheckout ? previewEndDate : endDateForDraft();
  const inRange = !selected && !selectedCheckout && rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd;
  const isStart = selected;
  const isEnd = selectedCheckout;
  const selectable = inMonth && !isPast && hasCoverage && (selectingCheckout ? isSelectableCheckoutDate(iso) : isSelectableDate(iso));
  const spotsLeft = inMonth && !isPast && hasCoverage ? campSpotsLeftForDate(iso) : 0;
  const configuredSpots = inMonth && !isPast && hasCoverage ? campConfiguredSpotsForDate(iso) : 0;
  const requiredGuests = Math.max(1, selectedPackagePeopleCount());
  const isClosed = inMonth && !isPast && hasCoverage && configuredSpots <= 0;
  const soldOut =
    inMonth &&
    !isPast &&
    hasCoverage &&
    !isClosed &&
    checkinOpen &&
    spotsLeft < requiredGuests;
  const showColors = showAvailabilityColors();
  const availabilityClass = isPast
    ? "past-day"
    : !hasCoverage || isClosed
      ? "availability-none"
      : !checkinOpen
        ? showColors ? availabilityBandClass(spotsLeft) : ""
      : soldOut
          ? "soldout-day"
          : showColors ? availabilityBandClass(spotsLeft) : "";
  const { showCountThreshold } = availabilityThresholds();
  const shouldShowCount =
    showAvailabilityCounts() &&
    !selectingCheckout &&
    !isPast &&
    hasCoverage &&
    checkinOpen &&
    (soldOut || showCountThreshold === null || spotsLeft <= showCountThreshold);
  const showPrice = showPricePerNightInCalendar();
  const priceLabel =
    !selectingCheckout && !isPast && hasCoverage && checkinOpen && !isClosed && !soldOut && showPrice
      ? formatCalendarPrice(calendarDatePrice(iso))
      : "";
  const dayStatus = selectingCheckout
    ? ""
    : priceLabel
      ? priceLabel
      : soldOut
        ? shouldShowCount ? "FULL" : ""
        : shouldShowCount && spotsLeft > 0
          ? `${spotsLeft} left`
          : "";

  const classes = [
    "day-cell",
    inMonth ? "" : "muted-day",
    !selectable && (isPast || !hasCoverage || isClosed) ? "disabled-day" : "",
    !checkinOpen && hasCoverage && !isClosed ? "checkin-closed-day" : "",
    availabilityClass,
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
      data-date="${iso}"
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

function renderDateSelector(stepNumber = bookingStepIndex("date") + 1) {
  const baseAnchor = firstBookableMonth();
  const baseMonth = addMonths(baseAnchor, draft.calendarMonthOffset);
  const nextMonth = addMonths(baseMonth, 1);
  const singleMonth = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  const minimumStay = draft.startDate ? stayMinimumNightsForDate(draft.startDate) : 0;
  const autoSelectedStay = draft.startDate && draft.endDate && draft.dateSelectionMode === "start" && shouldAutoSelectCheckout(draft.startDate);
  const roomFilterEnabled = bookingCalendarFilterEnabled();
  const roomFilterRooms = bookingVisibleRooms();
  const showRoomFilter = roomFilterEnabled && roomFilterRooms.length > 1;
  const currentRoomFilter =
    roomFilterEnabled && (draft.calendarRoomFilter === "all" || roomFilterRooms.some((room) => room.id === draft.calendarRoomFilter))
      ? draft.calendarRoomFilter
      : "all";

  return `
      <section class="calendar-card ${bookingUiState.calendarReloading ? "is-reloading" : ""}" aria-busy="${bookingUiState.calendarReloading ? "true" : "false"}">
        <div class="date-intro">
          <h3>${stepNumber}. Select your dates</h3>
          <p class="helper">${
            draft.dateSelectionMode === "end" && draft.startDate
              ? `Hover to preview your check-out date, then click to confirm. Minimum stay: ${minimumStay} night${minimumStay === 1 ? "" : "s"}.`
              : autoSelectedStay
                ? `Fixed stay selected automatically. Check-out is set to ${formatDate(endDateForDraft())}.`
              : "Choose a check-in date, then choose a check-out date."
          }</p>
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

      <div class="calendar-footer">
        <div class="calendar-note">
          ${
            draft.startDate
              ? `Selected stay: ${formatDate(draft.startDate)} to ${formatDate(endDateForDraft())}`
              : ""
          }
        </div>
        ${
          showRoomFilter
            ? `
        <label class="calendar-filter-row">
          <span>Room filter</span>
          <select data-calendar-room-filter aria-label="Filter calendar by room">
            <option value="all" ${currentRoomFilter === "all" ? "selected" : ""}>All rooms</option>
            ${roomFilterRooms
              .map(
                (room) =>
                  `<option value="${escapeHtml(room.id)}" ${currentRoomFilter === room.id ? "selected" : ""}>${escapeHtml(
                    `${room.name || room.id} (+${formatCalendarPrice(room.pricePerNight || 0)} / night)`,
                  )}</option>`,
              )
              .join("")}
          </select>
        </label>`
            : ""
        }
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

  const genders = guestGenderEntries();

  return {
    country: draft.guestCountry || "",
    dateOfBirth: {
      day: draft.guestBirthDay || "",
      month: draft.guestBirthMonth || "",
      year: draft.guestBirthYear || "",
    },
    gender: genders[0] || draft.guestGender || "",
    genders,
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

  const genders = Array.isArray(customerDetails.genders)
    ? customerDetails.genders.filter(Boolean)
    : customerDetails.gender
      ? [customerDetails.gender]
      : [];
  if (genders.length) {
    parts.push(`Gender ${genders.join(", ")}`);
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

function bookingGenderEntries(booking = {}) {
  const genders = Array.isArray(booking.guestGenders) && booking.guestGenders.length
    ? booking.guestGenders
    : booking.guestGender
      ? [booking.guestGender]
      : [];
  return normalizedGuestGenders(genders, bookingGuestCount(booking));
}

function bookingGenderSummary(booking = {}) {
  const genders = bookingGenderEntries(booking).filter(Boolean);
  if (!genders.length) return "No gender";
  const counts = new Map();
  genders.forEach((gender) => {
    const key = String(gender || "").trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([gender, count]) => (count > 1 ? `${gender} ${count}x` : gender))
    .join(", ");
}

function bookingCustomerFieldEntries(booking = {}) {
  const details = booking.customerDetails || {};
  return customerFieldDefinitions().map((field) => ({
    label: field.label,
    value: String(details.customFields?.[field.key] ?? "").trim(),
  }));
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

function renderGuestGenderControls() {
  const guestCount = Math.max(1, selectedPackagePeopleCount());
  const genders = guestGenderEntries();
  const blocks = Array.from({ length: guestCount }, (_, index) => {
    const value = genders[index] || "";
    const fieldId = `fieldGuestGender${index}`;
    const label = guestCount === 1 ? "Gender" : `Guest ${index + 1} gender`;
    return `
      <label class="field" id="${fieldId}">
        ${escapeHtml(label)}
        <select data-guest-gender-index="${index}">
          <option value="" ${value ? "" : "selected"}>Select gender</option>
          <option value="Female" ${value === "Female" ? "selected" : ""}>Female</option>
          <option value="Male" ${value === "Male" ? "selected" : ""}>Male</option>
        </select>
      </label>
    `;
  });

  return `
    <div class="customer-fields customer-fields-genders">
      ${blocks.join("")}
    </div>
  `;
}

function bookShellMarkup() {
  const shellHeader = isEmbeddedBooking()
    ? ""
    : `
    <header class="book-header">
      <img id="campLogo" class="camp-logo" alt="Camp logo" />
      <div>
        <h1 id="campName">Surf Camp Booking</h1>
      </div>
    </header>
  `;
  return `
    ${shellHeader}
    <main class="booking-shell">
      <section class="panel wizard-panel">
        <nav class="stepper" id="stepper" aria-label="Booking steps"></nav>
        <div id="wizardContent"></div>
      </section>
      <aside class="panel summary-panel" id="summaryPanel" aria-live="polite"></aside>
      <div id="summaryActionsShell"></div>
    </main>
  `;
}

function renderEmbeddedBookError(message) {
  const host = bookingHostElement();
  if (!host) return;
  const contactName = fallbackCampContactName();
  host.innerHTML = `
    <section class="panel wizard-panel">
      <div class="notice">
        <strong>We couldn’t load the booking engine right now.</strong>
        <div style="margin-top: 8px;">${escapeHtml(message)}</div>
        <div style="margin-top: 8px;">Please refresh and, if it keeps happening, contact ${escapeHtml(contactName)}.</div>
        <div style="margin-top: 14px;">
          <button type="button" class="button button-secondary" data-embedded-refresh>Refresh booking engine</button>
        </div>
      </div>
    </section>
  `;
}

function ensureEmbeddedBookShell() {
  if (!isEmbeddedBooking()) return;
  const host = bookingHostElement();
  if (!host || host.querySelector("#stepper")) return;
  host.innerHTML = bookShellMarkup();
}

function renderBookPage() {
  const logo = getBookElement("campLogo");
  const name = getBookElement("campName");
  const stepper = getBookElement("stepper");
  const wizard = getBookElement("wizardContent");
  const summary = getBookElement("summaryPanel");
  const summaryActionsShell = getBookElement("summaryActionsShell");

  if (!stepper || !wizard || !summary || !summaryActionsShell) return;

  if (logo) logo.src = state.camp.logoUrl;
  if (name) name.textContent = state.camp.name;
  applyTheme(state.camp.theme);

  ensureRoomSelection();

  const stepFlow = bookingStepFlow();
  const stepLabels = {
    package: "Package",
    date: "Date",
    room: "Room",
    addons: "Add-ons",
    book: "Book",
  };
  const maxUnlockedStep = Math.max(0, Math.min(draft.currentStep, stepFlow.length - 1));
  const currentStepKey = currentBookingStepKey();
  const orderedPackages = orderedItems(state.packages);
  const orderedRooms = bookingCalendarRooms(draft.calendarRoomFilter);
  const orderedAddons = orderedItems(state.addons);
  const addonGuestLimit = selectedPackagePeopleCount();
  const allocatedRoomGuests = selectedRoomAllocationPeopleCount();
  const quantityLabel = bookingQuantityLabel();
  const addonRows = selectedAddonRows();
  const packageRows = selectedPackageRows();
  const customerFields = customerFieldDefinitions();
  const countryChoices = countryOptions();
  const sharedRoomMode = !isFullUnitMode();
  const packageStepNumber = bookingStepIndex("package") + 1;
  const dateStepNumber = bookingStepIndex("date") + 1;
  const roomStepNumber = bookingStepIndex("room") + 1;
  const addonsStepNumber = bookingStepIndex("addons") + 1;
  const bookStepNumber = bookingStepIndex("book") + 1;
  const packageHelperText = isFullUnitMode()
    ? "Select the unit you want to sell for this booking."
    : "Set the number of people for each package row.";
  const roomHelperText = isFullUnitMode()
    ? "Assign this booking to one or more room types. Each room caps at its own remaining units."
    : "Assign guests to one or more room types. Each room caps at its own remaining spots.";

  stepper.innerHTML = stepFlow
    .map(
      (stepKey, index) => `
        <button
          type="button"
          class="${index === draft.currentStep ? "active" : ""}"
          ${index > maxUnlockedStep ? "disabled" : ""}
          data-step="${index}"
        >
          ${index + 1}. ${stepLabels[stepKey] || stepKey}
        </button>
      `,
    )
    .join("");

  const packageCards = orderedPackages
    .map((item) => {
      const quantity = packageQuantity(item.id);
      return `
        <article class="package-row">
          <div class="option-media">${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" />` : ""}</div>
          <div class="option-body">
            <h3>${item.name}</h3>
            <p>${item.nights} nights</p>
            <details class="package-more">
              <summary>Included <span aria-hidden="true">▾</span></summary>
              <p>${item.description}</p>
            </details>
            <div class="option-meta">
              <span>From ${money(item.basePrice)}</span>
            </div>
          </div>
          <div class="package-row-actions">
            <span class="tiny">${quantityLabel}</span>
            <div class="people-control" role="group" aria-label="${item.name} people count">
              <button type="button" class="people-button${quantity <= 0 ? " is-disabled" : ""}" data-package-row-change="${item.id}:-1" ${quantity <= 0 ? "disabled" : ""}>-</button>
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
      const quantity = roomAllocationQuantity(room.id);
      const otherAllocatedGuests = allocatedRoomGuests - quantity;
      const remainingGuests = Math.max(0, addonGuestLimit - otherAllocatedGuests);
      const roomAvailability = roomAvailableSpots(room.id);
      const isUnavailable = Boolean(draft.startDate && roomAvailability <= 0);
      const maxForRoom = Math.min(roomAvailability, remainingGuests);
      const canIncrease = quantity < maxForRoom;
      const roomTotalPrice =
        draft.startDate && endDateForDraft()
          ? dateKeysBetween(draft.startDate, endDateForDraft()).reduce((sum, dateKey) => sum + roomNightRate(room.id, dateKey), 0)
          : 0;
      const roomPriceLabel = roomTotalPrice ? money(roomTotalPrice) : "";
      return `
        <article class="option-card addon-card ${quantity > 0 ? "selected" : ""} ${isUnavailable ? "unavailable" : ""}">
          <div class="option-media">${room.imageUrl ? `<img src="${room.imageUrl}" alt="${room.name}" />` : ""}</div>
          <div class="option-body">
            <h3>${room.name}</h3>
            <p>${room.description}</p>
            ${
              room.learnMoreUrl
                ? `<a class="learn-more-link" href="${escapeHtml(room.learnMoreUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Learn more</a>`
                : ""
            }
            <div class="option-meta room-card-price">
              <span>${roomPriceLabel}</span>
            </div>
            <div class="tiny">${room.capacity} guests per room</div>
          </div>
          <div class="package-row-actions addon-row-actions">
            <span class="tiny">${quantityLabel}</span>
            <div class="people-control" role="group" aria-label="${room.name} guest allocation">
              <button type="button" class="people-button" data-room-row-change="${room.id}:-1" ${quantity <= 0 ? "disabled" : ""} aria-label="Decrease ${room.name} allocation">-</button>
              <div class="people-count" aria-live="polite" aria-label="${room.name} allocated guests">${quantity}</div>
              <button type="button" class="people-button" data-room-row-change="${room.id}:1" ${canIncrease ? "" : "disabled"} aria-label="Increase ${room.name} allocation">+</button>
            </div>
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
            <span class="tiny">${quantityLabel}</span>
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

  const viewsByKey = {
    package: `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>${packageStepNumber}. Pick a package</h3>
            <p class="helper">${packageHelperText}</p>
          </div>
        </div>
        <div class="stack">${packageCards}</div>
        <div class="mobile-only">
          ${renderPromoEntry({ variant: "mobile" })}
        </div>
      </section>
    `,
    date: renderDateSelector(dateStepNumber),
    room: `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>${roomStepNumber}. Pick room allocations</h3>
            <p class="helper">${roomHelperText}</p>
          </div>
        </div>
        <div class="card-grid addon-grid room-allocation-grid">${roomCards}</div>
      </section>
    `,
    addons: `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>${addonsStepNumber}. Select add-ons</h3>
          </div>
        </div>
        <div class="card-grid addon-grid">${addonCards}</div>
      </section>
    `,
    book: `
      <section class="wizard-step">
        <div class="step-title">
          <div>
            <h3>${bookStepNumber}. Book</h3>
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
                      <strong>Reservation ID</strong>
                      <span>${escapeHtml(state.bookingConfirmation.reservationCode || state.bookingConfirmation.bookingId || "")}</span>
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
              ${
                sharedRoomMode
                  ? `
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
                    <div id="fieldGuestGenderGroup" style="margin-top: 14px;">
                      ${renderGuestGenderControls()}
                    </div>
                  `
                  : ""
              }
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
  };

  wizard.innerHTML = viewsByKey[currentStepKey] || viewsByKey[stepFlow[0]] || "";
  const summaryHasData =
    packageRows.length > 0 || !!draft.startDate || selectedRoomAllocationRows().length > 0 || draft.addonIds.length > 0;
  const isMobileSummary = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  const showMobileTripSummary = isMobileSummary && currentStepKey === "book";
  const summaryButtonLoading = currentStepKey === "book" && bookingUiState.submitting;
  const summaryButton = currentStepKey === "package"
    ? {
        id: "nextFromPackage",
        disabled: !packageRows.length,
        label: "Select dates >",
      }
    : currentStepKey === "date"
      ? {
          id: "nextFromDate",
          disabled: !draft.startDate,
          label: "Select room >",
        }
      : currentStepKey === "room"
        ? {
            id: "nextFromRoom",
            disabled: selectedRoomAllocationPeopleCount() !== selectedPackagePeopleCount(),
            label: "Add-ons >",
          }
        : currentStepKey === "addons"
          ? {
              id: "continueToBook",
              disabled: false,
              label: "Booking details >",
            }
          : currentStepKey === "book"
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
    <button class="button button-primary summary-button${summaryButtonLoading ? " is-loading" : ""}" type="button" ${summaryButton.id ? `id="${summaryButton.id}"` : ""} ${summaryButton.disabled ? 'disabled aria-busy="true" aria-disabled="true"' : 'aria-disabled="false"'}>${summaryButtonLoading ? `<span class="button-spinner" aria-hidden="true"></span><span>${summaryButton.label}</span>` : summaryButton.label}</button>
  `;

  summary.hidden = isMobileSummary && !showMobileTripSummary;
  summary.innerHTML = `
    <div class="summary-hero">
      <h3 class="summary-title">Trip summary</h3>
      <div class="summary-list">
        ${
          packagesEnabled()
            ? `
              <div class="summary-item">
                <div>
                  <strong>Package</strong>
                  <span class="summary-package-lines">
                    ${packageRows
                      .map((item) => `<span class="summary-package-line">${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}.</span>`)
                      .join("")}
                  </span>
                </div>
                <strong>${packageRows.length ? money(packagePrice()) : ""}</strong>
              </div>
            `
            : ""
        }
        <div class="summary-item">
          <div>
            <strong>Date</strong>
            <span>
              ${draft.startDate ? `${formatDate(draft.startDate)} to ${formatDate(endDateForDraft())}` : ""}
              ${draft.startDate ? `<span class="summary-subline">${bookingNights()} night${bookingNights() === 1 ? "" : "s"}</span>` : ""}
            </span>
          </div>
          <strong>${draft.startDate && additionalPriceDisplayMode() === "calendar" ? money(stayBasePrice()) : ""}</strong>
        </div>
        <div class="summary-item">
          <div>
            <strong>Room</strong>
            <span>
              ${selectedRoomAllocationRows().length
                ? selectedRoomAllocationRows()
                    .map((room) => `${escapeHtml(room.name)} x ${escapeHtml(room.quantity)}`)
                    .join("<br />")
                : ""}
            </span>
          </div>
          <strong>${selectedRoomAllocationRows().length ? money(selectedRoomDisplayedPrice()) : ""}</strong>
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
        Choose dates that are open for check-in in the calendar.
      </div>
      ${isMobileSummary ? "" : `<div class="summary-actions">${summaryActions}</div>`}
    </div>
  `;
  summaryActionsShell.hidden = !isMobileSummary;
  summaryActionsShell.innerHTML = isMobileSummary ? `<div class="summary-actions">${summaryActions}</div>` : "";
  if (!analyticsState.loadTracked && (analyticsConfig().ga4Id || analyticsConfig().pixelId)) {
    trackAnalyticsEvent("booking_engine_load", {
      camp: bookingSlug(),
      step: bookingStepIndex(currentStepKey) + 1,
    });
    analyticsState.loadTracked = true;
  }
}

function renderAdminPage() {
  const roomCount = document.getElementById("roomCount");
  const packageCount = document.getElementById("packageCount");
  const addonCount = document.getElementById("addonCount");
  const businessCount = document.getElementById("businessCount");
  const billingBadge = document.getElementById("billingBadge");
  const billingCountdown = document.getElementById("billingCountdown");
  const billingNotice = document.getElementById("billingNotice");
  const billingForm = document.getElementById("billingForm");
  const bookingCount = document.getElementById("bookingCount");
  const leadCount = document.getElementById("leadCount");
  const canEditBilling = currentIdentityIsPlatformOwner();
  let activeTab = adminUiState.activeTab || "bookings";
  if (activeTab === "analytics") {
    activeTab = "bookings";
    adminUiState.activeTab = activeTab;
  }
  if (activeTab === "billing" && !canEditBilling) {
    activeTab = "bookings";
    adminUiState.activeTab = activeTab;
  }
  document.querySelectorAll("[data-booking-link]").forEach((bookingLink) => {
    bookingLink.setAttribute("href", bookingUrl());
  });
  if (roomCount) roomCount.textContent = `${state.rooms.length} rooms`;
  if (packageCount) packageCount.textContent = `${state.packages.length} packages`;
  if (addonCount) addonCount.textContent = `${state.addons.length} add-ons`;
  const businessRows = businessWeeklyRows();
  if (businessCount) businessCount.textContent = `${businessRows.length} weeks`;
  const billing = billingState();
  const billingDays = billingDaysRemaining(billing);
  if (billingBadge) {
    billingBadge.textContent = billingDisplayStatus(billing);
  }
  if (billingCountdown) {
    billingCountdown.textContent =
      billingDays === null
        ? "No billing deadline"
        : billingDays <= 0
          ? "Access stopping now"
          : `${billingDays} days left`;
  }
  if (billingNotice) {
    const bannerText = billingBannerText(billing);
    billingNotice.innerHTML = bannerText
      ? `<div class="notice ${billingStatusTone(billing) === "danger" ? "error" : "warning"}">${escapeHtml(bannerText)}</div>`
      : `<div class="notice success">Subscription is active. No action is needed right now.</div>`;
    if (!canEditBilling) {
      billingNotice.innerHTML += `<div class="notice">Billing is managed by the master portal and is read-only here.</div>`;
    }
  }
  if (billingForm) {
    billingForm.elements.status.value = billing.status || "trialing";
    billingForm.elements.plan.value = billing.plan || "trial";
    billingForm.elements.monthlyPrice.value = billing.monthlyPrice ?? 99;
    billingForm.elements.currency.value = billing.currency || "EUR";
    billingForm.elements.trialStartedAt.value = billing.trialStartedAt ? String(billing.trialStartedAt).slice(0, 10) : "";
    billingForm.elements.trialEndsAt.value = billing.trialEndsAt ? String(billing.trialEndsAt).slice(0, 10) : "";
    billingForm.elements.gracePeriodEndsAt.value = billing.gracePeriodEndsAt ? String(billing.gracePeriodEndsAt).slice(0, 10) : "";
    billingForm.elements.paidThroughAt.value = billing.paidThroughAt ? String(billing.paidThroughAt).slice(0, 10) : "";
    billingForm.elements.nextBillingAt.value = billing.nextBillingAt ? String(billing.nextBillingAt).slice(0, 10) : "";
    billingForm.elements.notes.value = billing.notes || "";
    billingForm.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = !canEditBilling;
    });
  }
  if (bookingCount) bookingCount.textContent = `${state.bookings.length} bookings`;
  const visibleBookingRows = filteredAdminBookings();
  const bookingFilterCount = document.getElementById("bookingFilterCount");
  if (bookingFilterCount) {
    bookingFilterCount.textContent =
      adminUiState.bookingDateFilter || adminUiState.bookingStatusFilter || adminUiState.bookingSearchQuery
      ? `${visibleBookingRows.length} filtered`
      : `${visibleBookingRows.length} shown`;
  }
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
  const businessTableBody = document.getElementById("businessTableBody");
  const bookingDateFilter = document.getElementById("bookingDateFilter");
  const bookingStatusFilter = document.getElementById("bookingStatusFilter");
  const bookingSearch = document.getElementById("bookingSearch");
  const bookingRefresh = document.getElementById("bookingRefresh");
  const bookingCsvExport = document.getElementById("bookingCsvExport");
  const bookingDetailModal = document.getElementById("bookingDetailModal");
  const bookingDetailTitle = document.getElementById("bookingDetailTitle");
  const bookingDetailSubtitle = document.getElementById("bookingDetailSubtitle");
  const bookingDetailNotice = document.getElementById("bookingDetailNotice");
  const bookingDetailContent = document.getElementById("bookingDetailContent");
  let bookingDetailStatus = document.getElementById("bookingDetailStatus");
  let bookingDetailSaveStatus = document.getElementById("bookingDetailSaveStatus");
  const leadTableBody = document.getElementById("leadTableBody");
  const campForm = document.getElementById("campForm");
  const packageForm = document.getElementById("packageForm");
  const roomForm = document.getElementById("roomForm");
  const addonForm = document.getElementById("addonForm");
  const promoForm = document.getElementById("promoForm");
  const bookingUrlInput = document.getElementById("bookingUrl");
  const embedUrlInput = document.getElementById("embedUrl");
  const embedCodeInput = document.getElementById("embedCode");
  const availabilityRoomSelect = document.getElementById("availabilityRoomSelect");
  const availabilityBulkStart = document.getElementById("availabilityBulkStart");
  const availabilityBulkEnd = document.getElementById("availabilityBulkEnd");
  const availabilityBulkPricePerNight = document.getElementById("availabilityBulkPricePerNight");
  const availabilityBulkMinStay = document.getElementById("availabilityBulkMinStay");
  const availabilityBulkUnits = document.getElementById("availabilityBulkUnits");
  const availabilityBulkEditCheckin = document.getElementById("availabilityBulkEditCheckin");
  const availabilityBulkWeekdayInputs = availabilityWeekdayOptions().map((day) => ({
    day,
    input: document.getElementById(`availabilityBulk${day}`),
  }));
  const applyAvailabilityBulkEditButton = document.getElementById("applyAvailabilityBulkEdit");
  const saveAvailabilityButton = document.getElementById("saveAvailability");
  const availabilityMatrix = document.getElementById("availabilityMatrix");
  const panes = document.querySelectorAll("[data-admin-pane]");
  const tabButtons = document.querySelectorAll("[data-admin-tab]");
  const configPanes = document.querySelectorAll("[data-config-pane]");
  const configTabButtons = document.querySelectorAll("[data-config-tab]");

  ensureAvailabilityCoverage(state);

  if (!state.rooms.some((room) => room.id === adminUiState.availabilityRoomId)) {
    adminUiState.availabilityRoomId = state.rooms[0]?.id || "shared-double";
  }

  const shouldHydrateBookingEngineForm = !adminUiState.bookingEngineFormDirty && !adminUiState.bookingEngineSaving;

  if (campForm && shouldHydrateBookingEngineForm) {
    campForm.elements.campName.value = state.camp.name;
    campForm.elements.logoUrl.value = state.camp.logoUrl.startsWith("data:") ? "" : state.camp.logoUrl;
    campForm.elements.ga4Id.value = state.camp.analytics?.ga4Id || "";
    campForm.elements.pixelId.value = state.camp.analytics?.pixelId || "";
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
    campForm.elements.availabilityLowThreshold.value =
      state.camp.bookingRules?.availabilityLowThreshold ?? seedState.camp.bookingRules.availabilityLowThreshold;
    campForm.elements.availabilityMidThreshold.value =
      state.camp.bookingRules?.availabilityMidThreshold ?? seedState.camp.bookingRules.availabilityMidThreshold;
    campForm.elements.availabilityCountVisibilityThreshold.value =
      state.camp.bookingRules?.availabilityCountVisibilityThreshold ?? "";
    campForm.elements.showAvailabilityColors.checked = showAvailabilityColors(state.camp.bookingRules);
    campForm.elements.showAvailability.checked = showAvailabilityCounts(state.camp.bookingRules);
    campForm.elements.showPricePerNight.checked = showPricePerNightInCalendar(state.camp.bookingRules);
    const additionalPriceDisplay = campForm.elements.namedItem("additionalPriceDisplay");
    if (additionalPriceDisplay instanceof HTMLSelectElement) {
      additionalPriceDisplay.value = state.camp.bookingRules?.additionalPriceDisplay === "calendar" ? "calendar" : "rooms";
    }
    const filterByRoomInCalendar = campForm.elements.namedItem("filterByRoomInCalendar");
    if (filterByRoomInCalendar instanceof HTMLInputElement) {
      filterByRoomInCalendar.checked = bookingCalendarFilterEnabled(state.camp.bookingRules);
    }
    campForm.elements.packageMode.value = bookingPackageMode(state.camp.bookingRules);
    campForm.elements.packagesEnabled.checked = packagesEnabled(state.camp.bookingRules);
    adminUiState.bookingEngineLogoPreviewUrl = "";
  }

  if (campForm) {
    const bookingEngineNotice = document.getElementById("bookingEngineNotice");
    if (bookingEngineNotice) {
      bookingEngineNotice.innerHTML = bookingEngineNoticeMarkup();
    }
    setBookingEngineSaveLoading(adminUiState.bookingEngineSaving);
  }

  if (bookingUrlInput) {
    bookingUrlInput.value = bookingUrl();
  }
  if (embedUrlInput) {
    embedUrlInput.value = embedScriptUrl();
  }
  if (embedCodeInput) {
    embedCodeInput.value = embedScriptSnippet();
  }
  if (topbarBookingUrl) {
    topbarBookingUrl.setAttribute("href", bookingUrl());
  }
  const bookingEngineLogoPreview = document.getElementById("bookingEngineLogoPreview");
  if (bookingEngineLogoPreview instanceof HTMLImageElement) {
    bookingEngineLogoPreview.src = adminUiState.bookingEngineLogoPreviewUrl || state.camp.logoUrl || logoSvg;
  }
  applyTheme(state.camp.theme);

  if (bookingDateFilter) {
    const currentFilter = adminUiState.bookingDateFilter || "";
    bookingDateFilter.innerHTML = `
      <option value="">All check-in dates</option>
      ${bookingDateOptions()
        .map(
          (date) =>
            `<option value="${date}" ${date === currentFilter ? "selected" : ""}>${formatDateShort(date) || formatDate(date)}</option>`,
        )
        .join("")}
    `;
    bookingDateFilter.value = currentFilter;
  }

  if (bookingStatusFilter) {
    const currentFilter = adminUiState.bookingStatusFilter || "";
    bookingStatusFilter.innerHTML = `
      <option value="">All booking statuses</option>
      ${bookingStatusFilterOptions()
        .map((status) => {
          const label = status.charAt(0).toUpperCase() + status.slice(1);
          return `<option value="${status}" ${status === currentFilter ? "selected" : ""}>${label}</option>`;
        })
        .join("")}
    `;
    bookingStatusFilter.value = currentFilter;
  }

  if (bookingSearch) {
    bookingSearch.value = adminUiState.bookingSearchQuery || "";
  }

  panes.forEach((pane) => {
    pane.hidden = pane.dataset.adminPane !== activeTab;
  });
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === activeTab);
    if (button.dataset.adminTab === "billing") {
      button.classList.toggle("billing-alert", !!billingBannerText(billing));
      button.disabled = !canEditBilling;
      button.classList.toggle("is-disabled", !canEditBilling);
    }
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

  if (availabilityMatrix) {
    availabilityMatrix.innerHTML = renderAvailabilityMatrix(adminUiState.availabilityRoomId);
  }

  const bulkEditorReady = !!state.camp?.availability && authState.workspaceLoaded !== false;
  const shouldHydrateBulkEditor = bulkEditorReady && (!adminUiState.availabilityBulkInitialized || !adminUiState.availabilityBulkDirty);
  if (shouldHydrateBulkEditor) {
    if (!adminUiState.availabilityBulkStart) {
      adminUiState.availabilityBulkStart = adminUiState.availabilityViewStart;
    }
    if (!adminUiState.availabilityBulkEnd) {
      adminUiState.availabilityBulkEnd = addDays(adminUiState.availabilityBulkStart, 6);
    }
    const hydratedRow = roomAvailabilityRow(adminUiState.availabilityRoomId, adminUiState.availabilityBulkStart);
    if (!adminUiState.availabilityBulkPricePerNight) {
      adminUiState.availabilityBulkPricePerNight = String(hydratedRow?.pricePerNight ?? "");
    }
    if (!adminUiState.availabilityBulkMinStay) {
      adminUiState.availabilityBulkMinStay = String(hydratedRow?.minStay ?? "");
    }
    if (!adminUiState.availabilityBulkUnits) {
      adminUiState.availabilityBulkUnits = String(hydratedRow?.units ?? "");
    }
    adminUiState.availabilityBulkInitialized = true;
  }
  const bulkEditorDisabled = !bulkEditorReady;
  if (availabilityBulkStart) {
    availabilityBulkStart.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkStart.value = adminUiState.availabilityBulkStart || "";
  }
  if (availabilityBulkEnd) {
    availabilityBulkEnd.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkEnd.value = adminUiState.availabilityBulkEnd || "";
  }
  if (availabilityBulkPricePerNight) {
    availabilityBulkPricePerNight.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkPricePerNight.value = adminUiState.availabilityBulkPricePerNight;
  }
  if (availabilityBulkMinStay) {
    availabilityBulkMinStay.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkMinStay.value = adminUiState.availabilityBulkMinStay;
  }
  if (availabilityBulkUnits) {
    availabilityBulkUnits.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkUnits.value = adminUiState.availabilityBulkUnits;
  }
  if (availabilityBulkEditCheckin) {
    availabilityBulkEditCheckin.disabled = bulkEditorDisabled;
    if (shouldHydrateBulkEditor) availabilityBulkEditCheckin.checked = !!adminUiState.availabilityBulkEditCheckin;
  }
  availabilityBulkWeekdayInputs.forEach(({ day, input }) => {
    if (!input) return;
    input.disabled = bulkEditorDisabled || !adminUiState.availabilityBulkEditCheckin;
    if (shouldHydrateBulkEditor) input.checked = (adminUiState.availabilityBulkOpenWeekdays || []).includes(day);
  });
  if (saveAvailabilityButton) {
    saveAvailabilityButton.disabled = bulkEditorDisabled || adminUiState.availabilitySaving;
    saveAvailabilityButton.dataset.ready = bulkEditorDisabled ? "false" : "true";
    saveAvailabilityButton.textContent = adminUiState.availabilitySaving ? "Saving..." : "Save availability";
  }
  if (applyAvailabilityBulkEditButton) {
    applyAvailabilityBulkEditButton.disabled = bulkEditorDisabled || adminUiState.availabilitySaving;
  }
  if (bookingRefresh) {
    bookingRefresh.disabled = adminUiState.availabilityBulkDirty;
  }

  if (bookingList) {
    bookingList.innerHTML = state.bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((booking) => {
        const pkg = getPackage(booking.packageId);
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
            <small>${packageSummary} &middot; ${escapeHtml(bookingRoomAllocationSummary(booking) || getRoom(booking.roomId)?.name || booking.roomId || "")}</small>
            <div class="tiny">${booking.guestEmail || "No email"} &middot; ${booking.guestPhone || "No phone"}</div>
            <div class="tiny">${escapeHtml(bookingGenderSummary(booking))} &middot; ${booking.guestCountry || "No country"}</div>
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

  const bookingSort = adminUiState.bookingSort || { key: "bookedAt", direction: "desc" };
  const leadSort = adminUiState.leadSort || { key: "createdAt", direction: "desc" };
  const bookingsForTable = sortAdminRows(visibleBookingRows, bookingSort, {
    guest: (item) => item.guestName || "",
    checkIn: (item) => item.startDate || "",
    lengthOfStay: (item) => bookingLengthOfStay(item),
    gender: (item) => bookingGenderSummary(item),
    email: (item) => item.guestEmail || "",
    phone: (item) => item.guestPhone || "",
    room: (item) => getRoom(item.roomId)?.name || "",
    guests: (item) => bookingGuestCount(item),
    status: (item) => item.status || "",
    bookedAt: (item) => item.createdAt || "",
    reservationId: (item) => item.reservationCode || item.reservationId || "",
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
        const bookingTime = formatDateTimeParts(booking.createdAt);
        return `
          <tr class="booking-row" tabindex="0" role="button" data-booking-open="${booking.id}">
            <td>
              ${bookingTime.label}
            </td>
            <td>${booking.reservationCode || booking.reservationId || "pending"}</td>
            <td><span class="status ${booking.status}">${booking.status}</span></td>
            <td><strong>${booking.guestName || "Guest"}</strong></td>
            <td>${bookingGuestCount(booking)}</td>
            <td>${formatDateShort(booking.startDate)}</td>
            <td>${bookingLengthOfStay(booking)}</td>
            <td>${escapeHtml(bookingGenderSummary(booking))}</td>
            <td>${escapeHtml(bookingRoomAllocationSummary(booking) || getRoom(booking.roomId)?.name || booking.roomId || "")}</td>
            <td>${booking.guestEmail || "No email"}</td>
            <td>${booking.guestPhone || "No phone"}</td>
            </tr>
          `;
        })
      .join("");
  }

  if (businessTableBody) {
    businessTableBody.innerHTML = businessRows.length
      ? businessRows
          .map((row) => {
            const occupancyLabel = `${row.occupancy}%`;
            return `
              <tr>
                <td><strong>${formatDateShort(row.checkInDate)}</strong></td>
                <td>${row.spotsBooked}</td>
                <td>${row.spotsAvailable}</td>
                <td><strong>${occupancyLabel}</strong></td>
                <td><strong>${money(row.revenueSum)}</strong></td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="5">
            <div class="availability-empty">No bookings yet for the business summary.</div>
          </td>
        </tr>
      `;
  }

  const bookingDetail = currentBookingDetail();
  if (bookingDetailModal) {
    bookingDetailModal.hidden = !bookingDetail;
  }

  if (bookingDetail && bookingDetailTitle && bookingDetailSubtitle && bookingDetailContent) {
    const room = getRoom(bookingDetail.roomId);
    const bookingTime = formatDateTimeParts(bookingDetail.createdAt);
    const genderEntries = bookingGenderEntries(bookingDetail);
    bookingDetailTitle.textContent = bookingDetail.guestName || "Reservation details";
    bookingDetailSubtitle.textContent = `${bookingDetail.reservationCode || "pending"} · ${bookingDetail.status}`;
    bookingDetailContent.innerHTML = `
      <div class="booking-detail-status-bar">
        <label>
          Booking status
          <select id="bookingDetailStatus"></select>
        </label>
        <button class="button button-primary" type="button" id="bookingDetailSaveStatus">Save status</button>
      </div>
      <div class="booking-detail-grid">
        <div class="booking-detail-meta">
          <span class="tiny">Guest</span>
          <strong>${escapeHtml(bookingDetail.guestName || "Guest")}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Check-in</span>
          <strong>${escapeHtml(formatDateShort(bookingDetail.startDate))}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Check-out</span>
          <strong>${escapeHtml(formatDateShort(bookingDetail.endDate))}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Email</span>
          <strong>${escapeHtml(bookingDetail.guestEmail || "No email")}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Phone</span>
          <strong>${escapeHtml(bookingDetail.guestPhone || "No phone")}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Room</span>
          <strong>${escapeHtml(bookingRoomAllocationSummary(bookingDetail) || room?.name || bookingDetail.roomId || "")}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Guests</span>
          <strong>${bookingGuestCount(bookingDetail)}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Package</span>
          <strong>${escapeHtml(bookingPackageSummary(bookingDetail))}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Add-ons</span>
          <strong>${escapeHtml(bookingAddonSummary(bookingDetail) || "None")}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Total</span>
          <strong>${money(bookingDetail.total)}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Booked</span>
          <strong>${escapeHtml(bookingTime.label)}</strong>
        </div>
        <div class="booking-detail-meta">
          <span class="tiny">Reservation ID</span>
          <strong>${escapeHtml(bookingDetail.reservationCode || bookingDetail.reservationId || "")}</strong>
        </div>
      </div>
      <div class="booking-detail-notes">
        <div><span class="tiny">Country</span><strong>${escapeHtml(bookingDetail.guestCountry || "No country")}</strong></div>
        <div><span class="tiny">Date of birth</span><strong>${escapeHtml(
          [bookingDetail.guestBirthDay, bookingDetail.guestBirthMonth, bookingDetail.guestBirthYear].filter(Boolean).join("-"),
        ) || "Not set"}</strong></div>
        ${genderEntries
          .map((gender, index) => {
            const label = genderEntries.length === 1 ? "Gender" : `Guest ${index + 1} gender`;
            return `<div><span class="tiny">${escapeHtml(label)}</span><strong>${escapeHtml(gender || "Not set")}</strong></div>`;
          })
          .join("")}
        <div><span class="tiny">Notes</span><strong>${escapeHtml(bookingDetail.notes || bookingDetail.customerDetails?.notes || "No notes")}</strong></div>
        ${bookingCustomerFieldEntries(bookingDetail)
          .map(
            (field) =>
              `<div><span class="tiny">${escapeHtml(field.label)}</span><strong>${escapeHtml(field.value || "Not set")}</strong></div>`,
          )
          .join("")}
        <div><span class="tiny">Confirmation email</span><strong>${escapeHtml(bookingDetail.confirmationEmail?.status || "not sent")}</strong></div>
      </div>
    `;

    bookingDetailStatus = bookingDetailContent.querySelector("#bookingDetailStatus");
    bookingDetailSaveStatus = bookingDetailContent.querySelector("#bookingDetailSaveStatus");
    bookingDetailStatus.innerHTML = bookingStatusOptions()
      .map(
        (option) =>
          `<option value="${option.value}" ${bookingDetail.status === option.value ? "selected" : ""}>${option.label}</option>`,
      )
      .join("");

    if (bookingDetailSaveStatus) {
      bookingDetailSaveStatus.dataset.bookingId = bookingDetail.id;
    }
    if (bookingDetailStatus) {
      bookingDetailStatus.value = bookingDetail.status || "confirmed";
    }
    if (bookingDetailNotice) {
      bookingDetailNotice.innerHTML = bookingDetailNoticeMarkup();
    }
  } else if (bookingDetailContent) {
    bookingDetailContent.innerHTML = "";
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
              <div class="tiny muted">${escapeHtml(bookingGenderSummary(lead))} &middot; ${lead.guestCountry || "No country"}</div>
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
              <span class="pill">${room.enabled !== false ? "Enabled" : "Disabled"}</span>
            </div>
            <div class="tiny">${money(room.pricePerNight)} per night &middot; ${room.capacity} guests per room &middot; ${room.totalUnits} sellable spots</div>
            ${room.learnMoreUrl ? `<div class="tiny"><a class="learn-more-link" href="${escapeHtml(room.learnMoreUrl)}" target="_blank" rel="noopener noreferrer">Learn more</a></div>` : ""}
            <div class="stack-item-actions">
              <button type="button" class="button button-secondary" data-move-room="${room.id}" data-move-direction="-1">Up</button>
              <button type="button" class="button button-secondary" data-move-room="${room.id}" data-move-direction="1">Down</button>
              <button type="button" class="button button-secondary" data-edit-room="${room.id}">Edit</button>
              <button type="button" class="button button-secondary" data-toggle-room-enabled="${room.id}">
                ${room.enabled === false ? "Enable" : "Disable"}
              </button>
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
            <div class="stack-item-media">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.name)}" />` : ""}
            </div>
            <div class="stack-item-top">
              <strong>${item.name}</strong>
              <span class="pill">${item.nights} nights</span>
            </div>
            <div class="tiny">${escapeHtml(item.description || "No description set.")}</div>
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
    if (editing && !adminUiState.packageFormDirty) {
      packageForm.elements.name.value = editing.name || "";
      packageForm.elements.description.value = editing.description || "";
      packageForm.elements.nights.value = editing.nights || 7;
      packageForm.elements.basePrice.value = editing.basePrice || 0;
      if (packageForm.elements.imageUrl) {
        packageForm.elements.imageUrl.value = editing.imageUrl?.startsWith("data:") ? "" : editing.imageUrl || "";
      }
    }
    const packageNotice = document.getElementById("packageNotice");
    if (packageNotice) {
      packageNotice.innerHTML = packageNoticeMarkup();
    }
    setPackageSaveLoading(adminUiState.packageSaving);
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
      roomForm.elements.enabled.checked = editing.enabled !== false;
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

function availabilityMatrixDateKeys(count = adminUiState.availabilityViewDays || 21) {
  const start = parseDateValue(adminUiState.availabilityViewStart) || parseDateValue(new Date()) || new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + index);
    return localDateKey(cursor);
  });
}

function availabilityDaySummary(roomId, dateKey) {
  const room = getRoom(roomId);
  const row = roomAvailabilityRow(roomId, dateKey) || {};
  const units = Math.max(0, Number(row.units ?? room?.totalUnits ?? 0));
  const booked = bookedUnitsForDate(roomId, dateKey);
  return {
    dateKey,
    units,
    booked,
    forSale: Math.max(0, units - booked),
    pricePerNight: Math.max(0, Number(row.pricePerNight ?? room?.pricePerNight ?? 0)),
    minStay: Math.max(1, Number(row.minStay ?? defaultAvailabilityMinStay(state.packages))),
    openForCheckin: row.openForCheckin !== false,
  };
}

function availabilityWeekdayOptions() {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
}

function ensureAvailabilityDayEntry(roomId, dateKey, targetState = state) {
  const room = (targetState.rooms || []).find((item) => item.id === roomId);
  if (!room || !dateKey) return null;
  ensureAvailabilityCoverage(targetState);
  if (!targetState.camp.availability[roomId]) {
    targetState.camp.availability[roomId] = { days: {} };
  }
  if (!targetState.camp.availability[roomId].days[dateKey]) {
    targetState.camp.availability[roomId].days[dateKey] = {
      units: room.totalUnits,
      pricePerNight: room.pricePerNight,
      minStay: defaultAvailabilityMinStay(targetState.packages || seedState.packages),
      openForCheckin: defaultAvailabilityCheckinOpen(dateKey, targetState.camp.bookingRules),
    };
  }
  return targetState.camp.availability[roomId].days[dateKey];
}

function updateAvailabilityDayField(roomId, dateKey, field, rawValue) {
  const row = ensureAvailabilityDayEntry(roomId, dateKey);
  if (!row) return;

  if (field === "openForCheckin") {
    row.openForCheckin = !!rawValue;
    return;
  }

  if (field === "minStay") {
    row.minStay = Math.max(1, Number(rawValue || defaultAvailabilityMinStay(state.packages)));
    return;
  }

  if (field === "units") {
    row.units = Math.max(0, Number(rawValue || 0));
    return;
  }

  if (field === "pricePerNight") {
    row.pricePerNight = Math.max(0, Number(rawValue || 0));
  }
}

function applyAvailabilityBulkEdit(roomId, bulkEdit = {}) {
  const room = getRoom(roomId);
  const startDate = bulkEdit.startDate || adminUiState.availabilityBulkStart;
  const endDate = bulkEdit.endDate || adminUiState.availabilityBulkEnd || startDate;
  if (!room || !startDate || !endDate) {
    adminUiState.availabilityNotice = "Choose a valid start and end date for the bulk edit.";
    adminUiState.availabilityNoticeType = "error";
    return false;
  }

  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!start || !end || end < start) {
    adminUiState.availabilityNotice = "The bulk edit end date must be on or after the start date.";
    adminUiState.availabilityNoticeType = "error";
    return false;
  }

  const applyPrice = bulkEdit.pricePerNight !== "" && bulkEdit.pricePerNight !== null && bulkEdit.pricePerNight !== undefined;
  const applyMinStay = bulkEdit.minStay !== "" && bulkEdit.minStay !== null && bulkEdit.minStay !== undefined;
  const applyUnits = bulkEdit.units !== "" && bulkEdit.units !== null && bulkEdit.units !== undefined;
  const editCheckinDays = !!bulkEdit.editCheckinDays;
  const openWeekdays = Array.isArray(bulkEdit.openWeekdays) ? bulkEdit.openWeekdays : [];
  const applyOpen = editCheckinDays && openWeekdays.length > 0;

  if (!applyPrice && !applyMinStay && !applyUnits && !applyOpen) {
    adminUiState.availabilityNotice = "Choose at least one field to update in the bulk editor.";
    adminUiState.availabilityNoticeType = "error";
    return false;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    const dateKey = localDateKey(cursor);
    const row = ensureAvailabilityDayEntry(roomId, dateKey);
    if (row) {
      if (applyPrice) row.pricePerNight = Math.max(0, Number(bulkEdit.pricePerNight));
      if (applyMinStay) row.minStay = Math.max(1, Number(bulkEdit.minStay));
      if (applyUnits) row.units = Math.max(0, Number(bulkEdit.units));
      if (applyOpen) row.openForCheckin = openWeekdays.includes(weekdayName(dateKey));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  adminUiState.availabilityNotice = `Bulk edit applied for ${formatDateShort(startDate)} to ${formatDateShort(endDate)}. Save to keep it.`;
  adminUiState.availabilityNoticeType = "success";
  return true;
}

function renderAvailabilityMatrix(roomId) {
  const dateKeys = availabilityMatrixDateKeys();
  const cells = dateKeys.map((dateKey) => availabilityDaySummary(roomId, dateKey));
  const noticeMarkup = adminUiState.availabilityNotice
    ? `<div class="notice notice-${adminUiState.availabilityNoticeType}">${escapeHtml(adminUiState.availabilityNotice)}</div>`
    : "";

  const renderInputRow = (label, field, options = {}) => `
    <tr>
      <th scope="row">${label}</th>
      ${cells
        .map((cell) => {
          if (field === "openForCheckin") {
            return `
              <td>
                <label class="availability-checkbox">
                  <input
                    type="checkbox"
                    ${cell.openForCheckin ? "checked" : ""}
                    data-availability-field="${field}"
                    data-availability-date="${cell.dateKey}"
                    data-availability-room="${roomId}"
                  />
                </label>
              </td>
            `;
          }
          return `
            <td>
              <input
                type="number"
                min="${options.min ?? 0}"
                step="${options.step ?? 1}"
                value="${cell[field]}"
                data-availability-field="${field}"
                data-availability-date="${cell.dateKey}"
                data-availability-room="${roomId}"
              />
            </td>
          `;
        })
        .join("")}
    </tr>
  `;

  const renderReadOnlyRow = (label, field) => `
    <tr>
      <th scope="row">${label}</th>
      ${cells.map((cell) => `<td><strong>${cell[field]}</strong></td>`).join("")}
    </tr>
  `;

  return `
    ${noticeMarkup}
    <div class="availability-window-nav">
      <button class="button button-secondary" type="button" data-availability-shift="-7">&lt; 7 days</button>
      <strong>${formatDate(dateKeys[0])} to ${formatDate(dateKeys[dateKeys.length - 1])}</strong>
      <button class="button button-secondary" type="button" data-availability-shift="7">7 days &gt;</button>
    </div>
    <div class="table-shell availability-table-shell">
      <table class="admin-table availability-table" aria-label="Daily availability matrix">
        <thead>
          <tr>
            <th>Setting</th>
            ${cells.map((cell) => `<th>${escapeHtml(formatDateShort(cell.dateKey))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${renderInputRow("Price per night", "pricePerNight")}
          ${renderInputRow("Minimum length of stay", "minStay", { min: 1 })}
          ${renderInputRow("Open for checkin", "openForCheckin")}
          ${renderInputRow("Available count", "units")}
          ${renderReadOnlyRow("Sold count", "booked")}
          ${renderReadOnlyRow("For sale count", "forSale")}
        </tbody>
      </table>
    </div>
  `;
}

function readAvailabilityMatrix(roomId) {
  const room = getRoom(roomId);
  const existingDays = { ...(state.camp.availability?.[roomId]?.days || {}) };
  availabilityMatrixDateKeys().forEach((dateKey) => {
    const priceInput = document.querySelector(
      `[data-availability-room="${roomId}"][data-availability-date="${dateKey}"][data-availability-field="pricePerNight"]`,
    );
    const minStayInput = document.querySelector(
      `[data-availability-room="${roomId}"][data-availability-date="${dateKey}"][data-availability-field="minStay"]`,
    );
    const unitsInput = document.querySelector(
      `[data-availability-room="${roomId}"][data-availability-date="${dateKey}"][data-availability-field="units"]`,
    );
    const openInput = document.querySelector(
      `[data-availability-room="${roomId}"][data-availability-date="${dateKey}"][data-availability-field="openForCheckin"]`,
    );

    existingDays[dateKey] = {
      ...(existingDays[dateKey] || {}),
      units: Math.max(0, Number(unitsInput?.value ?? room?.totalUnits ?? 0)),
      pricePerNight: Math.max(0, Number(priceInput?.value ?? room?.pricePerNight ?? 0)),
      minStay: Math.max(1, Number(minStayInput?.value ?? defaultAvailabilityMinStay(state.packages))),
      openForCheckin: !!openInput?.checked,
    };
  });
  return existingDays;
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
  enableAllDemoCheckinDates(state);
  ensureAvailabilityCoverage(state);
  applyStateToDraft();
  applyTheme(state.camp.theme);
  saveState();
}

function currentIdentityRoles() {
  const user = window.netlifyIdentity?.currentUser?.();
  return Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles.map((role) => String(role).trim()) : [];
}

function currentIdentityEmail() {
  const user = window.netlifyIdentity?.currentUser?.();
  return String(user?.email || "").trim();
}

function currentIdentityIsPlatformOwner() {
  return currentIdentityRoles().includes("platform-owner");
}

function requestedTenantWorkspaceId() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("tenant") || params.get("workspaceId") || "";
  } catch {
    return "";
  }
}

async function loadPublicWorkspace() {
  if (window.location.protocol === "file:") {
    return;
  }

  try {
    const slug = requestedCampSlug();
    if (!slug) {
      if (isEmbeddedBooking()) {
        renderEmbeddedBookError("Missing camp slug for the embedded booking engine. Add data-slug to the script tag.");
      }
      return;
    }
    const workspace = await apiJson(`public-workspace?slug=${encodeURIComponent(slug)}`);
    if (workspace) {
      if (isEmbeddedBooking()) {
        ensureEmbeddedBookShell();
        initBookInteractions();
      }
      hydrateStateFromWorkspace(workspace);
      renderBookPage();
    }
  } catch (error) {
    if (isEmbeddedBooking()) {
      renderEmbeddedBookError(
        error instanceof Error ? error.message : "Could not load this booking engine right now.",
      );
      return;
    }
    // Fall back to local demo state when the public API is unavailable.
  }
}

async function loadAdminWorkspace({ showLoading = true } = {}) {
  if (!window.netlifyIdentity?.currentUser) return;

  const user = window.netlifyIdentity.currentUser();
  if (!user) return;
  const email = String(user.email || "").trim();
  console.log("[admin] loadAdminWorkspace:start", { email, showLoading });

  authState.user = user;
  authState.workspaceLoaded = false;
  const loadSequence = (authState.workspaceLoadSequence || 0) + 1;
  authState.workspaceLoadSequence = loadSequence;
  if (showLoading) {
    setAdminLoadingState(true, "Loading workspace", "Loading bookings, availability, business data, and settings.", email);
  }
  try {
    authState.token = await user.jwt();
    const tenantWorkspaceId = requestedTenantWorkspaceId();
    const workspaceUrl =
      tenantWorkspaceId && currentIdentityIsPlatformOwner()
        ? `master-workspace?workspaceId=${encodeURIComponent(tenantWorkspaceId)}`
        : "me-workspace";
    const workspace = await apiJson(workspaceUrl, {
      headers: {
        Authorization: `Bearer ${authState.token}`,
      },
    });

    if (authState.workspaceLoadSequence !== loadSequence) return;
    if (workspace) {
      authState.workspace = workspace;
      authState.workspaceLoaded = true;
      hydrateStateFromWorkspace(workspace);
      renderAdminPage();
      setAdminLoadingState(false);
      updateAdminAuthUI(user);
      console.log("[admin] loadAdminWorkspace:success", { email, workspaceId: workspace.id });
    }
  } catch (error) {
    if (authState.workspaceLoadSequence !== loadSequence) return;
    const authStatus = document.getElementById("authStatus");
    if (authStatus) {
      authStatus.textContent = error instanceof Error ? error.message : "Could not load your workspace.";
    }
    console.log("[admin] loadAdminWorkspace:error", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    setAdminLoadingState(
      true,
      "Could not load workspace",
      error instanceof Error ? error.message : "Could not load your workspace.",
      email,
    );
  }
}

async function refreshAdminWorkspace({ silent = false } = {}) {
  if (!window.netlifyIdentity?.currentUser || !window.netlifyIdentity.currentUser()) return;
  if (adminUiState.availabilityBulkDirty || adminUiState.bookingEngineFormDirty) {
    if (!silent) {
      if (adminUiState.availabilityBulkDirty) {
        adminUiState.availabilityNotice = "Finish or save the bulk edit before refreshing.";
        adminUiState.availabilityNoticeType = "warning";
      }
      if (adminUiState.bookingEngineFormDirty) {
        adminUiState.bookingEngineNotice = "Finish or save the booking engine changes before refreshing.";
        adminUiState.bookingEngineNoticeType = "warning";
      }
      renderAdminPage();
    }
    return;
  }

  try {
    if (!silent) {
      setAdminLoadingState(true, "Refreshing workspace", "Updating bookings, availability, and business data.");
    }
    await loadAdminWorkspace({ showLoading: !silent });
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
      if (targetStatus === "cancelled") {
        setBookingDetailNotice("Cancellation processed. The blocked spot has been released.", "success");
      } else {
        setBookingDetailNotice("Reservation reinstated.", "success");
      }
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
  const adminLoading = document.getElementById("adminLoading");

  if (!adminWorkspace) return;

  const signedIn = !!user;
  const workspaceReady = signedIn && !!authState.workspace && authState.workspaceLoaded !== false;
  const email = String(user?.email || "").trim();
  console.log("[admin] updateAdminAuthUI", { signedIn, email, workspaceLoaded: authState.workspaceLoaded, workspaceReady });
  adminWorkspace.hidden = !workspaceReady;
  if (adminLoading) {
    adminLoading.hidden = workspaceReady;
    adminLoading.setAttribute("aria-busy", workspaceReady ? "false" : "true");
  }
  renderTopbarActions(user, workspaceReady);

  if (!signedIn) {
    setAdminLoadingState(true, "Login required", "Sign in to load bookings, availability, and settings.", "");
  } else if (!workspaceReady) {
    setAdminLoadingState(true, "Loading workspace", "Loading bookings, availability, business data, and settings.", email);
  } else {
    setAdminLoadingState(false);
  }

  if (authStatus) {
    authStatus.textContent = signedIn
      ? workspaceReady
        ? email
          ? `Signed in as ${email}`
          : ""
        : email
          ? `Signed in as ${email}`
          : "Loading workspace..."
      : "Loading access state...";
  }
}

function setAdminLoadingState(visible, title = "Loading admin panel", detail = "", email = "") {
  adminUiState.loadingVisible = !!visible;
  adminUiState.loadingTitle = title || "Loading admin panel";
  adminUiState.loadingDetail = detail || "";
  adminUiState.loadingEmail = email || "";
  renderAdminLoadingState();
}

function renderAdminLoadingState() {
  const loading = document.getElementById("adminLoading");
  const title = document.getElementById("adminLoadingTitle");
  const detail = document.getElementById("adminLoadingDetail");
  if (!loading) return;
  loading.hidden = !adminUiState.loadingVisible;
  loading.setAttribute("aria-busy", adminUiState.loadingVisible ? "true" : "false");
  if (title) title.textContent = adminUiState.loadingTitle || "Loading admin panel";
  if (detail) detail.textContent = adminUiState.loadingDetail || "";
  const email = document.getElementById("adminLoadingEmail");
  if (email) {
    email.hidden = !adminUiState.loadingEmail;
    email.textContent = adminUiState.loadingEmail ? `Signed in as ${adminUiState.loadingEmail}` : "";
  }
  console.log("[admin] renderAdminLoadingState", {
    visible: adminUiState.loadingVisible,
    title: adminUiState.loadingTitle,
    email: adminUiState.loadingEmail,
  });
}

function setMasterLoadingState(visible, title = "Loading master portal", detail = "", email = "") {
  adminUiState.masterLoadingVisible = !!visible;
  adminUiState.masterLoadingTitle = title || "Loading master portal";
  adminUiState.masterLoadingDetail = detail || "";
  adminUiState.masterLoadingEmail = email || "";
  const loading = document.getElementById("masterLoading");
  const titleNode = document.getElementById("masterLoadingTitle");
  const detailNode = document.getElementById("masterLoadingDetail");
  const emailNode = document.getElementById("masterLoadingEmail");
  if (!loading) return;
  loading.hidden = !adminUiState.masterLoadingVisible;
  loading.setAttribute("aria-busy", adminUiState.masterLoadingVisible ? "true" : "false");
  if (titleNode) titleNode.textContent = adminUiState.masterLoadingTitle || "Loading master portal";
  if (detailNode) detailNode.textContent = adminUiState.masterLoadingDetail || "";
  if (emailNode) {
    emailNode.hidden = !adminUiState.masterLoadingEmail;
    emailNode.textContent = adminUiState.masterLoadingEmail ? `Signed in as ${adminUiState.masterLoadingEmail}` : "";
  }
  console.log("[master] setMasterLoadingState", {
    visible: adminUiState.masterLoadingVisible,
    title: adminUiState.masterLoadingTitle,
    email: adminUiState.masterLoadingEmail,
    detail: adminUiState.masterLoadingDetail,
  });
}

function renderMasterTopbarActions(user, workspaceReady) {
  const topbarActions = document.getElementById("masterTopbarActions");
  if (!topbarActions) return;

  if (!user) {
    topbarActions.innerHTML = `
      <button class="button button-primary" type="button" id="masterAuthButton" data-master-auth-action="login">
        Login
      </button>
    `;
    return;
  }

  topbarActions.innerHTML = `
    <button class="button button-secondary" type="button" id="masterTopbarRefresh">Refresh</button>
    <button class="button button-secondary" type="button" id="masterLogout" data-master-auth-action="logout">
      Log out
    </button>
  `;
  if (!workspaceReady) {
    topbarActions.querySelector("#masterTopbarRefresh")?.setAttribute("disabled", "true");
  }
}

function updateMasterAuthUI(user) {
  const masterWorkspace = document.getElementById("masterWorkspace");
  const masterLoading = document.getElementById("masterLoading");
  const authStatus = document.getElementById("masterAuthStatus");
  if (!masterWorkspace) return;

  const signedIn = !!user;
  const workspaceReady = signedIn && adminUiState.masterWorkspaceReady && !adminUiState.masterWorkspaceLoading;
  const email = String(user?.email || "").trim();
  console.log("[master] updateMasterAuthUI", {
    signedIn,
    email,
    masterWorkspaceReady: adminUiState.masterWorkspaceReady,
    masterWorkspaceLoading: adminUiState.masterWorkspaceLoading,
    masterWorkspaceError: adminUiState.masterWorkspaceError,
    workspaceReady,
  });
  masterWorkspace.hidden = !workspaceReady;
  if (masterLoading) {
    masterLoading.hidden = workspaceReady;
  }
  if (!signedIn) {
    setMasterLoadingState(true, "Login required", "Log in with the SaaS owner account to see all tenants.", "");
  } else if (adminUiState.masterWorkspaceError) {
    setMasterLoadingState(true, "Owner access required", adminUiState.masterWorkspaceError, email);
  } else if (!workspaceReady) {
    setMasterLoadingState(true, "Loading master portal", "Loading all tenant accounts and booking links.", email);
  } else {
    setMasterLoadingState(false, "Loading master portal", "Loading all tenant accounts and booking links.", email);
  }
  renderMasterTopbarActions(user, workspaceReady);
  if (authStatus) {
    authStatus.textContent = !signedIn
      ? "Loading access state..."
      : adminUiState.masterWorkspaceError
        ? email
          ? `Owner access required for ${email}.`
          : "Owner access required."
        : email
          ? `Signed in as ${email}`
          : "";
  }
}

function masterWorkspaceFilteredRows() {
  const query = adminUiState.masterWorkspaceFilter.trim().toLowerCase();
  return (adminUiState.masterWorkspaces || []).filter((workspace) => {
    if (!query) return true;
    return [
      workspace.campName,
      workspace.ownerEmail,
      workspace.slug,
      workspace.billing?.status,
      workspace.id,
      workspace.bookingUrl,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

async function loadMasterWorkspaces({ showLoading = true } = {}) {
  if (!window.netlifyIdentity?.currentUser) return;
  const email = currentIdentityEmail();
  console.log("[master] loadMasterWorkspaces:start", { email, showLoading });
  adminUiState.masterWorkspaceLoading = true;
  adminUiState.masterWorkspaceReady = false;
  adminUiState.masterWorkspaceError = "";
  if (showLoading) {
    setMasterLoadingState(true, "Loading master portal", "Loading all tenant accounts and booking links.", email);
  }
  try {
    const token = await window.netlifyIdentity.currentUser().jwt();
    const archived = adminUiState.masterWorkspaceView === "archived";
    const data = await apiJson(`master-workspaces?archived=${archived ? 1 : 0}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    adminUiState.masterWorkspaces = Array.isArray(data?.workspaces) ? data.workspaces : [];
    adminUiState.masterWorkspaceReady = true;
    renderMasterPage();
    adminUiState.masterWorkspaceLoading = false;
    adminUiState.masterWorkspaceError = "";
    setMasterLoadingState(false);
    updateMasterAuthUI(window.netlifyIdentity.currentUser());
    console.log("[master] loadMasterWorkspaces:success", { email, count: adminUiState.masterWorkspaces.length });
  } catch (error) {
    adminUiState.masterWorkspaceLoading = false;
    adminUiState.masterWorkspaceReady = false;
    adminUiState.masterWorkspaceError = error instanceof Error ? error.message : "Could not load master portal.";
    const message = adminUiState.masterWorkspaceError === "Forbidden"
      ? "This portal is reserved for the SaaS owner account."
      : adminUiState.masterWorkspaceError;
    setMasterLoadingState(true, "Owner access required", message, email);
    console.log("[master] loadMasterWorkspaces:error", { email, error: adminUiState.masterWorkspaceError });
  }
}

function renderMasterPage() {
  const masterCount = document.getElementById("masterCount");
  const masterFilter = document.getElementById("masterFilter");
  const masterViewToggle = document.getElementById("masterViewToggle");
  const masterTableBody = document.getElementById("masterTableBody");
  const masterNotice = document.getElementById("masterNotice");
  const visibleRows = masterWorkspaceFilteredRows();
  const user = window.netlifyIdentity?.currentUser?.();
  const workspaceReady = !!user && adminUiState.masterWorkspaceReady && !adminUiState.masterWorkspaceLoading;
  if (masterCount) {
    masterCount.textContent = `${visibleRows.length} ${adminUiState.masterWorkspaceView === "archived" ? "archived" : "active"} tenants`;
  }
  if (masterFilter) {
    masterFilter.value = adminUiState.masterWorkspaceFilter || "";
  }
  if (masterViewToggle) {
    masterViewToggle.querySelectorAll("[data-master-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.masterView === adminUiState.masterWorkspaceView);
    });
  }
  if (masterNotice) {
    masterNotice.innerHTML = workspaceReady
      ? adminUiState.masterWorkspaceView === "archived"
        ? `<div class="notice warning">Archived workspaces are hidden from the main portal. Delete here only when you are sure you do not need the data anymore.</div>`
        : `<div class="notice success">You can open any tenant and fine-tune its settings. Archive mistaken workspaces instead of deleting them.</div>`
      : `<div class="notice">Log in with the owner account to view tenants.</div>`;
  }
  if (masterTableBody) {
    masterTableBody.innerHTML = visibleRows
      .map((workspace) => {
        const archived = !!workspace.archivedAt;
        const daysLeft = workspace.billing?.daysLeft;
        const daysLabel =
          daysLeft === null
            ? "No deadline"
            : daysLeft <= 0
              ? "Expired"
              : `${daysLeft} days left`;
        const adminHref = escapeHtml(workspace.adminUrl || `./admin.html?tenant=${encodeURIComponent(workspace.id)}`);
        const archiveAction = archived
          ? ""
          : `<button class="button button-secondary" type="button" data-archive-tenant-workspace="${escapeHtml(workspace.id)}">Archive</button>`;
        const deleteAction = archived
          ? `<button class="button button-danger" type="button" data-delete-tenant-workspace="${escapeHtml(workspace.id)}">Delete</button>`
          : "";
        const bookingLink = workspace.bookingUrl || "";
        return `
          <tr>
            <td><strong>${escapeHtml(workspace.campName)}</strong></td>
            <td>${escapeHtml(workspace.ownerEmail || "Unknown")}</td>
            <td>
              ${bookingLink ? `<a href="${escapeHtml(bookingLink)}" target="_blank" rel="noreferrer">${escapeHtml(workspace.slug || "")}</a>` : escapeHtml(workspace.slug || "")}
            </td>
            <td><span class="status ${escapeHtml(workspace.billing?.status || "trialing")}">${escapeHtml(workspace.billing?.status || "trialing")}</span>${archived ? ' <span class="pill">Archived</span>' : ""}</td>
            <td>${escapeHtml(daysLabel)}</td>
            <td>${escapeHtml(formatDateTime(workspace.updatedAt || workspace.createdAt || ""))}</td>
            <td>
              <div class="master-actions">
                ${archived ? "" : `<a class="button button-primary" href="${adminHref}">Open admin</a>`}
                ${archiveAction}
                ${deleteAction}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }
}

function initMasterAuth() {
  if (!window.netlifyIdentity || typeof window.netlifyIdentity.on !== "function") {
    updateMasterAuthUI(null);
    console.log("[master] initMasterAuth:identity unavailable");
    return;
  }

  window.netlifyIdentity.on("init", (user) => {
    console.log("[master] identity:init", {
      email: user?.email || "",
      roles: user?.app_metadata?.roles || [],
    });
    updateMasterAuthUI(user);
    if (user) {
      void loadMasterWorkspaces();
    }
  });

  window.netlifyIdentity.on("login", (user) => {
    console.log("[master] identity:login", {
      email: user?.email || "",
      roles: user?.app_metadata?.roles || [],
    });
    window.netlifyIdentity.close();
    updateMasterAuthUI(user);
    if (user) {
      void loadMasterWorkspaces();
    }
  });

  window.netlifyIdentity.on("logout", () => {
    console.log("[master] identity:logout");
    adminUiState.masterWorkspaces = [];
    adminUiState.masterWorkspaceFilter = "";
    adminUiState.masterWorkspaceView = "active";
    adminUiState.masterWorkspaceReady = false;
    adminUiState.masterWorkspaceError = "";
    updateMasterAuthUI(null);
  });

  window.netlifyIdentity.init();
  const currentUser = window.netlifyIdentity.currentUser();
  console.log("[master] initMasterAuth:currentUser", {
    email: currentUser?.email || "",
    roles: currentUser?.app_metadata?.roles || [],
  });
  updateMasterAuthUI(currentUser);
  if (currentUser) {
    void loadMasterWorkspaces();
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
  const masterLink = currentIdentityIsPlatformOwner()
    ? `<a href="./master.html" class="button button-secondary">Master portal</a>`
    : "";
  const billingText = workspaceReady ? billingBannerText() : "";
  const billingPill = billingText ? `<span class="pill billing-pill billing-pill-urgent">${escapeHtml(billingText)}</span>` : "";

  topbarActions.innerHTML = `
    ${billingPill}
    <span class="topbar-url">${openLink}</span>
    ${masterLink}
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
    setAdminLoadingState(true, "Netlify Identity unavailable", "Enable Netlify Identity to load bookings, availability, and settings.");
    console.log("[admin] initNetlifyIdentityAuth:identity unavailable");
    return;
  }

  window.netlifyIdentity.on("init", (user) => {
    console.log("[admin] identity:init", {
      email: user?.email || "",
      roles: user?.app_metadata?.roles || [],
    });
    updateAdminAuthUI(user);
    if (user) {
      void loadAdminWorkspace();
    }
  });

  window.netlifyIdentity.on("login", (user) => {
    console.log("[admin] identity:login", {
      email: user?.email || "",
      roles: user?.app_metadata?.roles || [],
    });
    window.netlifyIdentity.close();
    updateAdminAuthUI(user);
    void loadAdminWorkspace();
  });

  window.netlifyIdentity.on("logout", () => {
    console.log("[admin] identity:logout");
    authState.user = null;
    authState.token = null;
    authState.workspace = null;
    authState.workspaceLoaded = false;
    adminUiState.bookingEngineLogoPreviewUrl = "";
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
  console.log("[admin] initNetlifyIdentityAuth:currentUser", {
    email: window.netlifyIdentity.currentUser()?.email || "",
    roles: window.netlifyIdentity.currentUser()?.app_metadata?.roles || [],
  });
  updateAdminAuthUI(window.netlifyIdentity.currentUser());
}

function syncDraftToState() {
  state.currentStep = draft.currentStep;
  state.selectedPackageId = effectivePackageId();
  state.packageQuantities = { ...draft.packageQuantities };
  state.selectedRoomId = draft.roomId;
  state.roomAllocations = { ...(draft.roomAllocations || {}) };
  state.calendarRoomFilter = draft.calendarRoomFilter || "all";
  state.selectedAddonIds = [...draft.addonIds];
  state.customerFieldValues = { ...(draft.customerFieldValues || {}) };
  state.startDate = draft.startDate;
  state.endDate = draft.endDate;
  state.guestName = draft.guestName;
  state.guestPhone = draft.guestPhone;
  state.guestEmail = draft.guestEmail;
  state.guestCountry = draft.guestCountry;
  state.guestBirthDay = draft.guestBirthDay;
  state.guestBirthMonth = draft.guestBirthMonth;
  state.guestBirthYear = draft.guestBirthYear;
  state.guestGenders = normalizedGuestGenders(draft.guestGenders, selectedPackagePeopleCount());
  state.guestGender = state.guestGenders[0] || draft.guestGender || "";
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
  draft.roomAllocations = { ...(state.roomAllocations || {}) };
  draft.calendarRoomFilter = state.calendarRoomFilter || "all";
  draft.addonIds = [...(state.selectedAddonIds || [])];
  draft.customerFieldValues = { ...(state.customerFieldValues || {}) };
  draft.startDate = state.startDate || "";
  draft.endDate = state.endDate || "";
  draft.guestName = state.guestName || "";
  draft.guestPhone = state.guestPhone || "";
  draft.guestEmail = state.guestEmail || "";
  draft.guestCountry = state.guestCountry || "";
  draft.guestBirthDay = state.guestBirthDay || "";
  draft.guestBirthMonth = state.guestBirthMonth || "";
  draft.guestBirthYear = state.guestBirthYear || "";
  draft.guestGenders = normalizedGuestGenders(state.guestGenders || (state.guestGender ? [state.guestGender] : []));
  draft.guestGender = draft.guestGenders[0] || state.guestGender || "";
  draft.notes = state.notes || "";
  draft.promoCodeInput = state.promoCodeInput || "";
  draft.promoCodes = [...(state.promoCodes || [])];
  draft.promoError = state.promoError || "";
  draft.currentStep = state.currentStep ?? 0;
  draft.bookingIntentId = state.bookingIntentId || "";
  draft.calendarMonthOffset = draft.startDate ? calendarOffsetForDate(draft.startDate) : 0;
  normalizePackageSelections();
  normalizeCurrentBookStep();
  draft.dateSelectionMode = draft.startDate && !draft.endDate ? "end" : "start";
  if (draft.dateSelectionMode !== "end") {
    draft.hoverEndDate = "";
  }
  normalizeAddonSelections();
}

function upsertCheckoutLead(stage = "checkout") {
  const now = new Date().toISOString();
  const id = draft.bookingIntentId || `intent-${Date.now()}`;
  draft.bookingIntentId = id;
  const existing = state.bookingIntents.find((item) => item.id === id);
  const packageId = effectivePackageId();
  const payload = {
    id,
    guestName: draft.guestName || existing?.guestName || "",
    guestPhone: draft.guestPhone || existing?.guestPhone || "",
    guestEmail: draft.guestEmail || existing?.guestEmail || "",
    guestCountry: draft.guestCountry || existing?.guestCountry || "",
    guestGender: draft.guestGenders?.[0] || draft.guestGender || existing?.guestGender || "",
    guestGenders: normalizedGuestGenders(draft.guestGenders || (draft.guestGender ? [draft.guestGender] : [])),
    packageId,
    packagePeople: selectedPackagePeopleCount(),
    packageMode: bookingPackageMode(),
    packageQuantities: { ...draft.packageQuantities },
    roomId: draft.roomId,
    roomAllocations: { ...(draft.roomAllocations || {}) },
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
  if (isFullUnitMode()) {
    const nextQuantity = Number(quantity) > 0 ? 1 : 0;
    draft.packageQuantities = nextQuantity > 0 ? { [packageId]: 1 } : {};
    draft.packageId = packageId || effectivePackageId();
    draft.guestGenders = normalizedGuestGenders(draft.guestGenders || (draft.guestGender ? [draft.guestGender] : []));
    draft.guestGender = draft.guestGenders[0] || draft.guestGender || "";
    normalizeAddonSelections();
    normalizeRoomAllocations();
    return;
  }

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
  draft.guestGenders = normalizedGuestGenders(draft.guestGenders || (draft.guestGender ? [draft.guestGender] : []));
  draft.guestGender = draft.guestGenders[0] || draft.guestGender || "";
  normalizeAddonSelections();
  normalizeRoomAllocations();
}

function updateBookPage() {
  normalizePackageSelections();
  normalizeCurrentBookStep();
  syncDraftToState();
  saveState();
  cleanExpiredHolds();
  applyTheme(state.camp.theme);
  renderBookPage();
}

function scrollBookPageToTop() {
  if (typeof window === "undefined") return;
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  if (isEmbeddedBooking()) {
    if (!isMobile) return;
    bookingHostElement()?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    return;
  }
  if (!isMobile) return;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function setBookingFieldErrors(fieldIds = []) {
  const sharedRoomMode = !isFullUnitMode();
  const allFieldIds = [
    "fieldGuestName",
    "fieldGuestEmail",
    "fieldGuestPhone",
    "fieldGuestCountry",
    "fieldGuestNotes",
    ...customerFieldDefinitions().map((field) => customerFieldDomId(field)),
  ];
  if (sharedRoomMode) {
    allFieldIds.push(
      "fieldGuestBirthDay",
      "fieldGuestBirthMonth",
      "fieldGuestBirthYear",
      "fieldGuestGenderGroup",
      ...Array.from({ length: Math.max(1, selectedPackagePeopleCount()) }, (_, index) => `fieldGuestGender${index}`),
    );
  }
  for (const id of allFieldIds) {
    getBookElement(id)?.classList.toggle("is-invalid", fieldIds.includes(id));
  }
}

function setBookingDetailSaveLoading(isLoading) {
  const button = document.getElementById("bookingDetailSaveStatus");
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.innerHTML = isLoading
    ? `<span class="button-spinner" aria-hidden="true"></span><span>Saving...</span>`
    : "Save status";
}

function setPackageSaveLoading(isLoading) {
  const button = document.getElementById("packageSaveButton");
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.innerHTML = isLoading
    ? `<span class="button-spinner" aria-hidden="true"></span><span>Saving...</span>`
    : "Save package";
}

function setBookingEngineSaveLoading(isLoading) {
  const button = document.getElementById("bookingEngineSaveButton");
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.innerHTML = isLoading
    ? `<span class="button-spinner" aria-hidden="true"></span><span>Saving...</span>`
    : "Save booking engine";
}

function packageNoticeMarkup() {
  if (!adminUiState.packageNotice) return "";
  const tone = adminUiState.packageNoticeType === "success" ? "success" : adminUiState.packageNoticeType === "error" ? "error" : "warning";
  return `<div class="notice ${tone}">${escapeHtml(adminUiState.packageNotice)}</div>`;
}

function bookingEngineNoticeMarkup() {
  if (!adminUiState.bookingEngineNotice) return "";
  const tone =
    adminUiState.bookingEngineNoticeType === "success"
      ? "success"
      : adminUiState.bookingEngineNoticeType === "error"
        ? "error"
        : "warning";
  return `<div class="notice ${tone}">${escapeHtml(adminUiState.bookingEngineNotice)}</div>`;
}

async function saveBookingStatus(bookingId, targetStatus, reservationCode = "", currentStatus = "") {
  if (!bookingId || !targetStatus) return;
  const normalizedStatus = ["confirmed", "held", "cancelled"].includes(targetStatus) ? targetStatus : "confirmed";
  const confirmed =
    normalizedStatus === "cancelled"
      ? window.confirm("Cancel this reservation and release the room back into availability?")
      : true;
  if (!confirmed) return;

  setBookingDetailSaveLoading(true);
  try {
    const result = await apiJson("cancel-booking", {
      method: "POST",
      headers: authState.token ? { Authorization: `Bearer ${authState.token}` } : {},
      body: JSON.stringify({
        bookingId,
        reservationCode,
        targetStatus: normalizedStatus,
      }),
    });

    if (result?.workspace) {
      hydrateStateFromWorkspace(result.workspace);
      authState.workspace = result.workspace;
      if (normalizedStatus === "cancelled") {
        setBookingDetailNotice("Cancellation processed. The blocked spot has been released.", "success");
      } else if (normalizedStatus === "held") {
        setBookingDetailNotice("Reservation status updated to held.", "success");
      } else {
        setBookingDetailNotice("Reservation status updated to confirmed.", "success");
      }
      renderAdminPage();
      updateAdminAuthUI(authState.user);
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : "Could not update reservation.");
  } finally {
    setBookingDetailSaveLoading(false);
  }
}

async function confirmBookingReservation() {
  if (bookingUiState.submitting) return;

  const guestName = getBookElement("guestName")?.value.trim();
  const guestPhone = getBookElement("guestPhone")?.value.trim();
  const guestEmail = getBookElement("guestEmail")?.value.trim();
  const guestCountry = getBookElement("guestCountry")?.value.trim();
  const sharedRoomMode = !isFullUnitMode();
  const guestBirthDay = sharedRoomMode ? getBookElement("guestBirthDay")?.value.trim() : "";
  const guestBirthMonth = sharedRoomMode ? getBookElement("guestBirthMonth")?.value.trim() : "";
  const guestBirthYear = sharedRoomMode ? getBookElement("guestBirthYear")?.value.trim() : "";
  const notes = getBookElement("guestNotes")?.value.trim();
  const guestGenders = normalizedGuestGenders(
    sharedRoomMode
      ? Array.from({ length: Math.max(1, selectedPackagePeopleCount()) }, (_, index) =>
          bookingRootNode().querySelector(`[data-guest-gender-index="${index}"]`)?.value.trim() || "",
        )
      : [],
  );

  const missingFields = [];
  if (!guestName) missingFields.push("fieldGuestName");
  if (!guestEmail) missingFields.push("fieldGuestEmail");
  if (!guestPhone) missingFields.push("fieldGuestPhone");
  if (!guestCountry) missingFields.push("fieldGuestCountry");
  if (sharedRoomMode) {
    if (!guestBirthDay) missingFields.push("fieldGuestBirthDay");
    if (!guestBirthMonth) missingFields.push("fieldGuestBirthMonth");
    if (!guestBirthYear) missingFields.push("fieldGuestBirthYear");
    guestGenders.forEach((gender, index) => {
      if (!gender) missingFields.push(`fieldGuestGender${index}`);
    });
  }
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
  const selectedRooms = selectedRoomAllocationRows();
  const totalRoomGuests = selectedRoomAllocationPeopleCount();
  if (!selectedRooms.length) {
    alert("Please assign guests to at least one room type.");
    return;
  }
  if (totalRoomGuests !== selectedPackagePeopleCount()) {
    alert("Please assign all guests to room types before confirming the booking.");
    return;
  }
  for (const room of selectedRooms) {
    if (room.quantity > roomAvailableSpots(room.id, startDate, endDate)) {
      alert(`${room.name} no longer has enough sellable spots for these dates.`);
      return;
    }
  }
  if (campSpotsLeftForDate(startDate, nightsBetween(startDate, endDate)) < selectedPackagePeopleCount()) {
    alert("There are not enough sellable spots for that date.");
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
    guestGender: guestGenders[0] || "",
    guestGenders,
    packageId: effectivePackageId(),
    packagePeople: selectedPackagePeopleCount(),
    packageMode: bookingPackageMode(),
    packagesEnabled: packagesEnabled(),
    packageQuantities: packagesEnabled() ? { ...draft.packageQuantities } : null,
    roomId: selectedRooms[0]?.id || "",
    roomAllocations: Object.fromEntries(selectedRooms.map((room) => [room.id, room.quantity])),
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
  draft.guestGenders = guestGenders;
  draft.guestGender = guestGenders[0] || "";
  draft.notes = notes;

  try {
    const result = await apiJson("confirm-booking", {
      method: "POST",
      body: JSON.stringify({
        workspaceSlug: bookingSlug(),
        booking: bookingPayload,
      }),
    });

    const confirmedBooking =
      result?.workspace?.bookings?.find((item) => item.reservationCode === result?.reservationCode) ||
      result?.workspace?.bookings?.find((item) => item.id === result?.booking?.id) ||
      result?.booking ||
      null;

    if (!result?.workspace || !confirmedBooking) {
      throw new Error("The booking could not be verified after saving.");
    }

    hydrateStateFromWorkspace(result.workspace);
    upsertCheckoutLead("confirmed");
    state.bookingConfirmation = {
      bookingId: confirmedBooking.id || result.booking.id,
      emailStatus: result?.email?.status || "skipped",
      confirmedAt: now.toISOString(),
      guestEmail,
      guestName,
      guestGender: guestGenders[0] || "",
      guestGenders,
      customerDetails: customerDetailsPayload(),
      promoCodes: [...(draft.promoCodes || [])],
      promoSummary: promoBookingSummary(),
      reservationCode: result?.reservationCode || confirmedBooking.reservationCode || "",
    };
    draft.bookingConfirmation = state.bookingConfirmation;
    syncDraftToState();
    saveState();
    trackAnalyticsEvent("checkout", {
      camp: bookingSlug(),
      package: getPackage(draft.packageId)?.name || draft.packageId,
      room: bookingRoomAllocationSummary({ roomAllocations: bookingPayload.roomAllocations }),
      total: totalPrice(),
    });
    alert(
      result?.email?.status === "sent"
        ? "Booking confirmed and confirmation email sent."
        : "Booking confirmed. Confirmation email will be sent when email delivery is configured.",
    );
    if (isEmbeddedBooking()) {
      draft.currentStep = 4;
      renderBookPage();
      scrollBookPageToTop();
    } else {
      window.location.assign(confirmationUrl(state.bookingConfirmation.reservationCode, guestEmail));
    }
  } catch (error) {
    setBookingDetailNotice?.("", "info");
    alert(
      `The booking was not saved. ${error instanceof Error ? error.message : "Unknown server error."} Please try again before leaving this page.`,
    );
  } finally {
    bookingUiState.submitting = false;
  }
}

function initBookInteractions() {
  if (bookInteractionsInitialized) return;
  bookInteractionsInitialized = true;
  let lastHoverCheckoutDate = "";
  const eventRoot = bookEventTarget();

  eventRoot.addEventListener("pointermove", (event) => {
    if (draft.dateSelectionMode !== "end" || !draft.startDate) {
      if (lastHoverCheckoutDate && draft.hoverEndDate) {
        lastHoverCheckoutDate = "";
        draft.hoverEndDate = "";
        renderBookPage();
      }
      return;
    }

    const hoveredCell = event.target?.closest?.("[data-select-date]");
    const nextHoverDate = hoveredCell?.dataset.selectDate || "";
    if (nextHoverDate === lastHoverCheckoutDate) return;
    lastHoverCheckoutDate = nextHoverDate;
    draft.hoverEndDate = nextHoverDate && isSelectableCheckoutDate(nextHoverDate, draft.startDate) ? nextHoverDate : "";
    renderBookPage();
  });

  eventRoot.addEventListener("click", (event) => {
      const target = event.target.closest(
        "[data-step], [data-select-package], [data-select-room], [data-room-row-change], [data-addon-row-change], [data-month-nav], [data-select-date], [data-package-row-change], [data-package-row-input], [data-go-step], [data-apply-promo], #nextFromPackage, #nextFromDate, #nextFromRoom, #continueToBook",
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
      const bounds = availabilityCalendarBounds();
      const nextOffset = draft.calendarMonthOffset + Number(target.dataset.monthNav);
      draft.calendarMonthOffset = Math.max(bounds.minOffset, Math.min(bounds.maxOffset, nextOffset));
      renderBookPage();
      return;
    }

    if (target.dataset.calendarRoomFilter !== undefined) {
      refreshCalendarPreview(target.value || "all");
      return;
    }

    if (target.dataset.selectDate) {
      const nextDate = target.dataset.selectDate;
      if (!draft.startDate || draft.dateSelectionMode !== "end") {
        draft.startDate = nextDate;
        draft.endDate = addDays(nextDate, stayMinimumNightsForDate(nextDate));
        draft.dateSelectionMode = shouldAutoSelectCheckout(nextDate) ? "start" : "end";
        draft.hoverEndDate = "";
        draft.roomAllocations = {};
      } else if (isSelectableCheckoutDate(nextDate, draft.startDate)) {
        draft.endDate = nextDate;
        draft.dateSelectionMode = "start";
        draft.hoverEndDate = "";
        draft.roomAllocations = {};
      } else {
        draft.startDate = nextDate;
        draft.endDate = addDays(nextDate, stayMinimumNightsForDate(nextDate));
        draft.dateSelectionMode = shouldAutoSelectCheckout(nextDate) ? "start" : "end";
        draft.hoverEndDate = "";
        draft.roomAllocations = {};
      }
        state.bookingConfirmation = null;
        trackAnalyticsEvent("search", {
          camp: bookingSlug(),
          check_in: draft.startDate,
          check_out: draft.endDate,
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

    if (target.dataset.roomRowChange) {
      const [roomId, delta] = target.dataset.roomRowChange.split(":");
      debugRoomAllocationChange(roomId, Number(delta));
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
      draft.currentStep = bookingStepIndex("date");
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

      if (target.id === "nextFromDate") {
        if (!draft.startDate || !endDateForDraft()) {
          alert("Please select both a check-in and a check-out date first.");
          return;
        }
        if (!isSelectableCheckoutDate(endDateForDraft(), draft.startDate)) {
          alert("Please choose a valid check-out date for this stay.");
          return;
        }
        draft.currentStep = bookingStepIndex("room");
        draft.dateSelectionMode = "start";
        updateBookPage();
        scrollBookPageToTop();
        return;
      }

    if (target.id === "nextFromRoom") {
      if (selectedRoomAllocationPeopleCount() !== selectedPackagePeopleCount()) {
        alert("Please assign all guests to room types before continuing.");
        return;
      }
      draft.currentStep = bookingStepIndex("addons");
      trackAnalyticsEvent("add_to_cart", {
        camp: bookingSlug(),
        room: bookingRoomAllocationSummary({ roomAllocations: draft.roomAllocations }),
        package: getPackage(effectivePackageId())?.name || effectivePackageId(),
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
      draft.currentStep = bookingStepIndex("book");
      state.bookingConfirmation = null;
      upsertCheckoutLead("checkout");
      updateBookPage();
      scrollBookPageToTop();
      return;
    }

    if (target.dataset.applyPromo !== undefined) {
      const promoInput = getBookElement(
        target.dataset.applyPromo === "mobile" ? "promoCodeInputMobile" : "promoCodeInputDesktop",
      );
      applyPromoCodesFromInput(promoInput?.value || "");
      return;
    }
  });

  eventRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches?.("[data-calendar-room-filter]")) {
      refreshCalendarPreview(target instanceof HTMLSelectElement ? target.value : "all");
    }
  });

  eventRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === "startDate") {
      draft.startDate = target.value;
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
    if (target.matches?.("[data-guest-gender-index]")) {
      const index = Number(target.dataset.guestGenderIndex || 0);
      const nextGenders = guestGenderEntries();
      nextGenders[index] = target.value;
      draft.guestGenders = normalizedGuestGenders(nextGenders);
      draft.guestGender = draft.guestGenders[0] || "";
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

  eventRoot.addEventListener("click", (event) => {
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
  const topbarLogout = document.getElementById("topbarLogout");
  const packageForm = document.getElementById("packageForm");
  const roomForm = document.getElementById("roomForm");
  const addonForm = document.getElementById("addonForm");
  const bookingUrlInput = document.getElementById("bookingUrl");
  const copyBookingUrlButton = document.getElementById("copyBookingUrl");
  const embedUrlInput = document.getElementById("embedUrl");
  const copyEmbedUrlButton = document.getElementById("copyEmbedUrl");
  const embedCodeInput = document.getElementById("embedCode");
  const copyEmbedCodeButton = document.getElementById("copyEmbedCode");
  const availabilityRoomSelect = document.getElementById("availabilityRoomSelect");
  const availabilityBulkStart = document.getElementById("availabilityBulkStart");
  const availabilityBulkEnd = document.getElementById("availabilityBulkEnd");
  const availabilityBulkPricePerNight = document.getElementById("availabilityBulkPricePerNight");
  const availabilityBulkMinStay = document.getElementById("availabilityBulkMinStay");
  const availabilityBulkUnits = document.getElementById("availabilityBulkUnits");
  const availabilityBulkEditCheckin = document.getElementById("availabilityBulkEditCheckin");
  const availabilityBulkWeekdayInputs = availabilityWeekdayOptions().map((day) => ({
    day,
    input: document.getElementById(`availabilityBulk${day}`),
  }));
  const applyAvailabilityBulkEditButton = document.getElementById("applyAvailabilityBulkEdit");
  const saveAvailabilityButton = document.getElementById("saveAvailability");
  const bookingDateFilter = document.getElementById("bookingDateFilter");
  const bookingStatusFilter = document.getElementById("bookingStatusFilter");
  const bookingSearch = document.getElementById("bookingSearch");
  const bookingCsvExport = document.getElementById("bookingCsvExport");

  if (bookingUrlInput) {
    bookingUrlInput.value = bookingUrl();
  }
  if (embedUrlInput) {
    embedUrlInput.value = embedScriptUrl();
  }
  if (embedCodeInput) {
    embedCodeInput.value = embedScriptSnippet();
  }

  document.addEventListener("click", (event) => {
    const bookingRow = event.target?.closest?.("[data-booking-open]");
    if (bookingRow && !event.target?.closest?.("button, a, select, input, textarea")) {
      openBookingDetail(bookingRow.dataset.bookingOpen);
      return;
    }

    const bookingDetailSaveStatus = event.target?.closest?.("#bookingDetailSaveStatus");
    if (bookingDetailSaveStatus) {
      const bookingId = bookingDetailSaveStatus.dataset.bookingId;
      const bookingDetailStatus = document.getElementById("bookingDetailStatus");
      if (!bookingId || !bookingDetailStatus) return;
      const booking = state.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      void saveBookingStatus(bookingId, bookingDetailStatus.value, booking.reservationCode || "", booking.status || "");
      return;
    }

    const bookingSortButton = event.target?.closest?.("[data-booking-sort]");
    if (bookingSortButton) {
      adminUiState.bookingSort = toggleSortState(adminUiState.bookingSort, bookingSortButton.dataset.bookingSort || "createdAt");
      renderAdminPage();
      return;
    }

    const availabilityShiftButton = event.target?.closest?.("[data-availability-shift]");
    if (availabilityShiftButton) {
      const shiftBy = Number(availabilityShiftButton.dataset.availabilityShift || 0);
      if (!shiftBy) return;
      adminUiState.availabilityViewStart = addDays(adminUiState.availabilityViewStart || localDateKey(new Date()), shiftBy);
      if (!adminUiState.availabilityBulkStart) {
        adminUiState.availabilityBulkStart = adminUiState.availabilityViewStart;
      }
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

  document.addEventListener("change", (event) => {
    const bookingDetailStatus = event.target?.closest?.("#bookingDetailStatus");
    if (!bookingDetailStatus) return;
    adminUiState.bookingDetailNotice = "";
    adminUiState.bookingDetailNoticeType = "info";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const bookingRow = event.target?.closest?.("[data-booking-open]");
    if (!bookingRow) return;
    event.preventDefault();
    openBookingDetail(bookingRow.dataset.bookingOpen);
  });

  document.addEventListener("click", (event) => {
    const configTabButton = event.target?.closest?.("[data-config-tab]");
    if (!configTabButton) return;
    adminUiState.configTab = configTabButton.dataset.configTab || "packages";
    renderAdminPage();
  });

  availabilityRoomSelect?.addEventListener("change", (event) => {
    adminUiState.availabilityRoomId = event.target.value;
    adminUiState.availabilityNotice = "";
    renderAdminPage();
  });

  availabilityBulkStart?.addEventListener("change", (event) => {
    adminUiState.availabilityBulkStart = event.target.value || "";
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkEnd?.addEventListener("change", (event) => {
    adminUiState.availabilityBulkEnd = event.target.value || "";
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkPricePerNight?.addEventListener("input", (event) => {
    adminUiState.availabilityBulkPricePerNight = event.target.value;
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkMinStay?.addEventListener("input", (event) => {
    adminUiState.availabilityBulkMinStay = event.target.value;
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkUnits?.addEventListener("input", (event) => {
    adminUiState.availabilityBulkUnits = event.target.value;
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkEditCheckin?.addEventListener("change", (event) => {
    adminUiState.availabilityBulkEditCheckin = !!event.target.checked;
    adminUiState.availabilityBulkDirty = true;
  });

  availabilityBulkWeekdayInputs.forEach(({ day, input }) => {
    input?.addEventListener("change", () => {
      const selected = new Set(adminUiState.availabilityBulkOpenWeekdays || []);
      if (input.checked) {
        selected.add(day);
      } else {
        selected.delete(day);
      }
      adminUiState.availabilityBulkOpenWeekdays = Array.from(selected);
      adminUiState.availabilityBulkDirty = true;
    });
  });

  applyAvailabilityBulkEditButton?.addEventListener("click", () => {
    const applied = applyAvailabilityBulkEdit(adminUiState.availabilityRoomId, {
      startDate: adminUiState.availabilityBulkStart,
      endDate: adminUiState.availabilityBulkEnd,
      pricePerNight: adminUiState.availabilityBulkPricePerNight,
      minStay: adminUiState.availabilityBulkMinStay,
      units: adminUiState.availabilityBulkUnits,
      openWeekdays: adminUiState.availabilityBulkOpenWeekdays,
      editCheckinDays: adminUiState.availabilityBulkEditCheckin,
    });
    if (applied) {
      adminUiState.availabilityBulkDirty = false;
      renderAdminPage();
    } else {
      renderAdminPage();
    }
  });

  bookingDateFilter?.addEventListener("change", (event) => {
    adminUiState.bookingDateFilter = event.target.value || "";
    renderAdminPage();
  });

  bookingStatusFilter?.addEventListener("change", (event) => {
    adminUiState.bookingStatusFilter = event.target.value || "";
    renderAdminPage();
  });

  bookingSearch?.addEventListener("input", (event) => {
    adminUiState.bookingSearchQuery = event.target.value || "";
    renderAdminPage();
  });

  bookingRefresh?.addEventListener("click", () => {
    void refreshAdminWorkspace({ silent: false });
  });

  bookingCsvExport?.addEventListener("click", () => {
    const rows = sortAdminRows(filteredAdminBookings(), adminUiState.bookingSort || { key: "bookedAt", direction: "desc" }, {
      guest: (item) => item.guestName || "",
      checkIn: (item) => item.startDate || "",
      checkOut: (item) => item.endDate || "",
      email: (item) => item.guestEmail || "",
      phone: (item) => item.guestPhone || "",
      room: (item) => getRoom(item.roomId)?.name || "",
      guests: (item) => bookingGuestCount(item),
      package: (item) => bookingPackageSummary(item),
      addons: (item) => bookingAddonSummary(item),
      total: (item) => Number(item.total || 0),
      status: (item) => item.status || "",
      bookedAt: (item) => item.createdAt || "",
      day: (item) => formatDateTimeParts(item.createdAt).day,
      month: (item) => formatDateTimeParts(item.createdAt).month,
      year: (item) => formatDateTimeParts(item.createdAt).year,
      reservationId: (item) => item.reservationCode || item.reservationId || "",
    });
    downloadCsv(`bookings-${bookingSlug()}-${new Date().toISOString().slice(0, 10)}.csv`, bookingsToCsv(rows));
  });

  saveAvailabilityButton?.addEventListener("click", async () => {
    adminUiState.availabilitySaving = true;
    adminUiState.availabilityNotice = "Saving availability...";
    adminUiState.availabilityNoticeType = "info";
    renderAdminPage();
    saveState();
    adminUiState.availabilitySaving = false;
    adminUiState.availabilityNotice = "Availability saved.";
    adminUiState.availabilityNoticeType = "success";
    adminUiState.availabilityBulkDirty = false;
    applyTheme(state.camp.theme);
    renderAdminPage();
  });

  document.addEventListener("input", (event) => {
    const availabilityField = event.target?.closest?.("[data-availability-field]");
    if (!availabilityField) return;
    updateAvailabilityDayField(
      availabilityField.dataset.availabilityRoom || adminUiState.availabilityRoomId,
      availabilityField.dataset.availabilityDate || "",
      availabilityField.dataset.availabilityField || "",
      availabilityField.type === "checkbox" ? availabilityField.checked : availabilityField.value,
    );
  });

  document.addEventListener("change", (event) => {
    const availabilityField = event.target?.closest?.("[data-availability-field]");
    if (!availabilityField) return;
    updateAvailabilityDayField(
      availabilityField.dataset.availabilityRoom || adminUiState.availabilityRoomId,
      availabilityField.dataset.availabilityDate || "",
      availabilityField.dataset.availabilityField || "",
      availabilityField.type === "checkbox" ? availabilityField.checked : availabilityField.value,
    );
    renderAdminPage();
  });

  topbarLogout?.addEventListener("click", () => {
    window.netlifyIdentity?.logout?.();
  });

  const copyValue = async (value, button, idleLabel, fallbackLabel) => {
    try {
      await navigator.clipboard.writeText(value);
      if (button) button.textContent = "Copied";
      setTimeout(() => {
        if (button) button.textContent = idleLabel;
      }, 1800);
    } catch {
      alert(`${fallbackLabel}: ${value}`);
    }
  };

  copyBookingUrlButton?.addEventListener("click", async () => {
    await copyValue(bookingUrl(), copyBookingUrlButton, "Copy link", "Copy this link");
  });

  copyEmbedUrlButton?.addEventListener("click", async () => {
    await copyValue(embedScriptUrl(), copyEmbedUrlButton, "Copy URL", "Copy this URL");
  });

  copyEmbedCodeButton?.addEventListener("click", async () => {
    await copyValue(embedScriptSnippet(), copyEmbedCodeButton, "Copy code", "Copy this embed code");
  });

  const liveBrandingFields = new Set([
    "campName",
    "logoUrl",
    "ga4Id",
    "pixelId",
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
    state.camp.analytics = {
      ...(state.camp.analytics || {}),
      ga4Id: campForm.elements.ga4Id.value.trim(),
      pixelId: campForm.elements.pixelId.value.trim(),
    };
    if (campForm.elements.logoUrl.value.trim()) {
      state.camp.logoUrl = campForm.elements.logoUrl.value.trim();
      adminUiState.bookingEngineLogoPreviewUrl = "";
    }
    state.camp.theme = nextTheme;
    applyTheme(state.camp.theme);
    saveState();
    if (bookingUrlInput) {
      bookingUrlInput.value = bookingUrl();
    }
    if (embedUrlInput) {
      embedUrlInput.value = embedScriptUrl();
    }
    if (embedCodeInput) {
      embedCodeInput.value = embedScriptSnippet();
    }
    if (bookingEngineLogoPreview instanceof HTMLImageElement) {
      bookingEngineLogoPreview.src = adminUiState.bookingEngineLogoPreviewUrl || state.camp.logoUrl || logoSvg;
    }
  };

  campForm?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    adminUiState.bookingEngineFormDirty = true;
    adminUiState.bookingEngineNotice = "";
    adminUiState.bookingEngineNoticeType = "info";
    if (target.name === "logoFile") {
      const file = campForm.elements.logoFile.files?.[0];
      if (file) {
        void readFileAsDataUrl(file).then((dataUrl) => {
          adminUiState.bookingEngineLogoPreviewUrl = String(dataUrl || "");
          if (bookingEngineLogoPreview instanceof HTMLImageElement) {
            bookingEngineLogoPreview.src = adminUiState.bookingEngineLogoPreviewUrl || state.camp.logoUrl || logoSvg;
          }
        });
      } else {
        adminUiState.bookingEngineLogoPreviewUrl = "";
      }
    }
    if (!liveBrandingFields.has(target.name)) return;
    syncBrandingPreview();
  });

  campForm?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    adminUiState.bookingEngineFormDirty = true;
    adminUiState.bookingEngineNotice = "";
    adminUiState.bookingEngineNoticeType = "info";
    if (target.name === "logoFile" && !campForm.elements.logoFile.files?.[0]) {
      adminUiState.bookingEngineLogoPreviewUrl = "";
      if (bookingEngineLogoPreview instanceof HTMLImageElement) {
        bookingEngineLogoPreview.src = state.camp.logoUrl || logoSvg;
      }
    }
    if (!liveBrandingFields.has(target.name)) return;
    syncBrandingPreview();
  });

  campForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminUiState.bookingEngineSaving = true;
    adminUiState.bookingEngineNotice = "Saving booking engine...";
    adminUiState.bookingEngineNoticeType = "info";
    renderAdminPage();
    try {
      state.camp.name = campForm.elements.campName.value.trim() || state.camp.name;

      const lowThreshold = Math.max(
        1,
        Number(campForm.elements.availabilityLowThreshold.value || seedState.camp.bookingRules.availabilityLowThreshold),
      );
      const midThreshold = Math.max(
        lowThreshold,
        Number(campForm.elements.availabilityMidThreshold.value || seedState.camp.bookingRules.availabilityMidThreshold),
      );
      state.camp.bookingRules = {
        ...(state.camp.bookingRules || {}),
        availabilityLowThreshold: lowThreshold,
        availabilityMidThreshold: midThreshold,
        availabilityCountVisibilityThreshold:
          campForm.elements.availabilityCountVisibilityThreshold.value === ""
            ? null
            : Math.max(0, Number(campForm.elements.availabilityCountVisibilityThreshold.value)),
        showAvailabilityColors: !!campForm.elements.showAvailabilityColors.checked,
        showAvailability: !!campForm.elements.showAvailability.checked,
        showPricePerNight: !!campForm.elements.showPricePerNight.checked,
        additionalPriceDisplay:
          campForm.elements.namedItem("additionalPriceDisplay") instanceof HTMLSelectElement &&
          campForm.elements.namedItem("additionalPriceDisplay").value === "calendar"
            ? "calendar"
            : "rooms",
        filterByRoomInCalendar: !!campForm.elements.filterByRoomInCalendar.checked,
        packageMode: campForm.elements.packageMode.value === "full_unit" ? "full_unit" : "individual_guests",
        packagesEnabled: !!campForm.elements.packagesEnabled.checked,
      };

      const logoFile = campForm.elements.logoFile.files?.[0];
      if (logoFile) {
        state.camp.logoUrl = await readFileAsDataUrl(logoFile);
        adminUiState.bookingEngineLogoPreviewUrl = "";
      } else if (campForm.elements.logoUrl.value.trim()) {
        state.camp.logoUrl = campForm.elements.logoUrl.value.trim();
        adminUiState.bookingEngineLogoPreviewUrl = "";
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
      normalizePackageSelections();
      normalizeCurrentBookStep();
      normalizeAddonSelections();
      normalizeRoomAllocations();
      saveState();
      applyTheme(state.camp.theme);
      adminUiState.bookingEngineFormDirty = false;
      adminUiState.bookingEngineNotice = "Booking engine saved.";
      adminUiState.bookingEngineNoticeType = "success";
    } catch (error) {
      adminUiState.bookingEngineNotice = error instanceof Error ? error.message : "Could not save booking engine.";
      adminUiState.bookingEngineNoticeType = "error";
    } finally {
      adminUiState.bookingEngineSaving = false;
      renderAdminPage();
      if (bookingUrlInput) {
        bookingUrlInput.value = bookingUrl();
      }
      if (embedUrlInput) {
        embedUrlInput.value = embedScriptUrl();
      }
      if (embedCodeInput) {
        embedCodeInput.value = embedScriptSnippet();
      }
      if (bookingEngineLogoPreview instanceof HTMLImageElement) {
        bookingEngineLogoPreview.src = adminUiState.bookingEngineLogoPreviewUrl || state.camp.logoUrl || logoSvg;
      }
    }
  });

  packageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminUiState.packageSaving = true;
    adminUiState.packageNotice = "Saving package...";
    adminUiState.packageNoticeType = "info";
    renderAdminPage();
    try {
      const id = packageForm.elements.id.value || `package-${Date.now()}`;
      const existing = state.packages.find((item) => item.id === id);
      const imageFile = packageForm.elements.imageFile?.files?.[0];
      let imageUrl = packageForm.elements.imageUrl?.value.trim() || "";
      if (imageFile) {
        imageUrl = await readFileAsDataUrl(imageFile);
      }
      if (!imageUrl) {
        imageUrl = existing?.imageUrl || logoSvg;
      }
      const payload = {
        id,
        name: packageForm.elements.name.value.trim(),
        description: packageForm.elements.description.value.trim(),
        nights: Number(packageForm.elements.nights.value),
        basePrice: Number(packageForm.elements.basePrice.value),
        imageUrl,
        order: existing?.order ?? nextOrderValue(state.packages),
      };
      state.packages = orderedItems([...state.packages.filter((item) => item.id !== id), payload]);
      packageForm.reset();
      packageForm.elements.id.value = "";
      if (packageForm.elements.imageUrl) packageForm.elements.imageUrl.value = "";
      adminUiState.packageFormDirty = false;
      saveState();
      adminUiState.packageNotice = "Package saved.";
      adminUiState.packageNoticeType = "success";
    } catch (error) {
      adminUiState.packageNotice = error instanceof Error ? error.message : "Could not save package.";
      adminUiState.packageNoticeType = "error";
    } finally {
      adminUiState.packageSaving = false;
      renderAdminPage();
    }
  });

  packageForm?.addEventListener("input", () => {
    adminUiState.packageFormDirty = true;
  });

  packageForm?.addEventListener("change", () => {
    adminUiState.packageFormDirty = true;
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
      enabled: !!roomForm.elements.enabled.checked,
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

  billingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentIdentityIsPlatformOwner()) {
      return;
    }
    const toIso = (value) => (value ? new Date(`${value}T00:00:00`).toISOString() : "");
    const existingBilling = state.camp.billing || createDefaultBilling();
    state.camp.billing = {
      ...existingBilling,
      status: existingBilling.status || "trialing",
      plan: billingForm.elements.plan.value.trim() || "trial",
      monthlyPrice: Math.max(0, Number(billingForm.elements.monthlyPrice.value || 99)),
      currency: billingForm.elements.currency.value.trim().toUpperCase() || "EUR",
      trialStartedAt: toIso(billingForm.elements.trialStartedAt.value) || (state.camp.billing?.trialStartedAt || createDefaultBilling().trialStartedAt),
      trialEndsAt: toIso(billingForm.elements.trialEndsAt.value) || (state.camp.billing?.trialEndsAt || createDefaultBilling().trialEndsAt),
      gracePeriodEndsAt: toIso(billingForm.elements.gracePeriodEndsAt.value) || (state.camp.billing?.gracePeriodEndsAt || createDefaultBilling().gracePeriodEndsAt),
      paidThroughAt: toIso(billingForm.elements.paidThroughAt.value),
      nextBillingAt: toIso(billingForm.elements.nextBillingAt.value) || "",
      notes: billingForm.elements.notes.value.trim(),
    };
    if (!state.camp.billing.nextBillingAt) {
      state.camp.billing.nextBillingAt = state.camp.billing.trialEndsAt;
    }
    saveState();
    renderAdminPage();
  });

  document.addEventListener("click", (event) => {
    const closeDetailButton = event.target?.closest?.("[data-close-booking-detail]");
    if (closeDetailButton) {
      closeBookingDetail();
    }
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
    const toggleRoomEnabledButton = event.target?.closest?.("[data-toggle-room-enabled]");
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

    if (toggleRoomEnabledButton) {
      const item = state.rooms.find((entry) => entry.id === toggleRoomEnabledButton.dataset.toggleRoomEnabled);
      if (!item) return;
      item.enabled = item.enabled === false;
      ensureAvailabilityCoverage(state);
      saveState();
      renderAdminPage();
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
      adminUiState.packageFormDirty = false;
      packageForm.elements.id.value = item.id;
      packageForm.elements.name.value = item.name || "";
      packageForm.elements.description.value = item.description || "";
      packageForm.elements.nights.value = item.nights || 7;
      packageForm.elements.basePrice.value = item.basePrice || 0;
      if (packageForm.elements.imageUrl) {
        packageForm.elements.imageUrl.value = item.imageUrl?.startsWith("data:") ? "" : item.imageUrl || "";
      }
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
      roomForm.elements.enabled.checked = item.enabled !== false;
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

function initEmbeddedErrorInteractions() {
  if (embeddedErrorInteractionsInitialized || typeof document === "undefined") return;
  embeddedErrorInteractionsInitialized = true;

  document.addEventListener("click", (event) => {
    const retryButton = event.target?.closest?.("[data-embedded-refresh]");
    if (!retryButton) return;
    event.preventDefault();
    if (!isEmbeddedBooking()) {
      window.location.reload();
      return;
    }
    retryButton.disabled = true;
    retryButton.textContent = "Refreshing...";
    void loadPublicWorkspace();
  });
}

function initMasterInteractions() {
  document.addEventListener("click", (event) => {
    const authButton = event.target?.closest?.("[data-master-auth-action]");
    if (authButton) {
      console.log("[master] auth button click", authButton.dataset.masterAuthAction);
      if (authButton.dataset.masterAuthAction === "login") {
        window.netlifyIdentity?.open?.();
      } else if (authButton.dataset.masterAuthAction === "logout") {
        window.netlifyIdentity?.logout?.();
      }
      return;
    }

    const openAdminButton = event.target?.closest?.("[data-open-tenant-admin]");
    if (openAdminButton) {
      const workspaceId = openAdminButton.dataset.openTenantAdmin || "";
      if (!workspaceId) return;
      window.location.assign(`./admin.html?tenant=${encodeURIComponent(workspaceId)}`);
      return;
    }

    if (event.target?.id === "masterRefresh") {
      void loadMasterWorkspaces({ showLoading: false });
      return;
    }

    if (event.target?.id === "masterTopbarRefresh") {
      void loadMasterWorkspaces({ showLoading: false });
      return;
    }

    const viewButton = event.target?.closest?.("[data-master-view]");
    if (viewButton) {
      adminUiState.masterWorkspaceView = viewButton.dataset.masterView || "active";
      void loadMasterWorkspaces();
      return;
    }

    const archiveWorkspaceButton = event.target?.closest?.("[data-archive-tenant-workspace]");
    if (archiveWorkspaceButton) {
      const workspaceId = archiveWorkspaceButton.dataset.archiveTenantWorkspace || "";
      const workspace = (adminUiState.masterWorkspaces || []).find((entry) => entry.id === workspaceId);
      const label = workspace?.campName || workspaceId;
      const confirmed = window.confirm(`Archive ${label}? It will disappear from the active list but remain recoverable in the archive.`);
      if (!confirmed) return;
      void (async () => {
        try {
          const token = await window.netlifyIdentity.currentUser().jwt();
          const result = await apiJson("master-archive-workspace", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ workspaceId }),
          });
          if (result?.success) {
            adminUiState.masterWorkspaces = (adminUiState.masterWorkspaces || []).filter((entry) => entry.id !== workspaceId);
            renderMasterPage();
            console.log("[master] archive workspace success", { workspaceId });
          }
        } catch (error) {
          alert(error instanceof Error ? error.message : "Could not archive workspace.");
          console.log("[master] archive workspace error", { workspaceId, error: error instanceof Error ? error.message : String(error) });
        }
      })();
      return;
    }

    const deleteWorkspaceButton = event.target?.closest?.("[data-delete-tenant-workspace]");
    if (deleteWorkspaceButton) {
      const workspaceId = deleteWorkspaceButton.dataset.deleteTenantWorkspace || "";
      const workspace = (adminUiState.masterWorkspaces || []).find((entry) => entry.id === workspaceId);
      const label = workspace?.campName || workspaceId;
      const confirmed = window.confirm(`Delete ${label}? This permanently removes the archived workspace data.`);
      if (!confirmed) return;
      void (async () => {
        try {
          const token = await window.netlifyIdentity.currentUser().jwt();
          const result = await apiJson("master-delete-workspace", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ workspaceId }),
          });
          if (result?.success) {
            adminUiState.masterWorkspaces = (adminUiState.masterWorkspaces || []).filter((entry) => entry.id !== workspaceId);
            renderMasterPage();
            console.log("[master] delete workspace success", { workspaceId });
          }
        } catch (error) {
          alert(error instanceof Error ? error.message : "Could not delete workspace.");
          console.log("[master] delete workspace error", { workspaceId, error: error instanceof Error ? error.message : String(error) });
        }
      })();
    }
  });

  document.addEventListener("input", (event) => {
    const filter = event.target?.closest?.("#masterFilter");
    if (!filter) return;
    adminUiState.masterWorkspaceFilter = filter.value || "";
    renderMasterPage();
  });
}

function initBookSurface() {
  if (isEmbeddedBooking()) {
    if (!requestedCampSlug()) {
      renderEmbeddedBookError("Missing camp slug for the embedded booking engine. Add data-slug to the script tag.");
      return;
    }
    void loadPublicWorkspace();
    return;
  }

  if (!hasBookSurface()) return;
  initBookInteractions();
  ensureAvailabilityCoverage(state);
  saveState();
  draft.calendarMonthOffset = draft.startDate ? calendarOffsetForDate(draft.startDate) : 0;
  renderBookPage();
  void loadPublicWorkspace();
}

function init() {
  cleanExpiredHolds();
  applyTheme(state.camp.theme);
  if (!isEmbeddedBooking()) {
    renderLandingPage();
    initLandingAuth();
  }
  if (typeof window !== "undefined") {
    window.bookRoomAllocationDebug = debugRoomAllocationChange;
    window.SurfCampBookingEmbed = {
      boot: initBookSurface,
    };
  }

  initEmbeddedErrorInteractions();
  initBookSurface();

  if (document.getElementById("adminWorkspace")) {
    initNetlifyIdentityAuth();
    initAdminInteractions();
    renderAdminPage();
    updateAdminAuthUI(window.netlifyIdentity?.currentUser?.());
  }

  if (document.getElementById("masterWorkspace")) {
    initMasterAuth();
    initMasterInteractions();
    renderMasterPage();
    updateMasterAuthUI(window.netlifyIdentity?.currentUser?.());
  }
}

init();
setInterval(() => {
  cleanExpiredHolds();
  if (hasBookSurface()) renderBookPage();
  if (document.getElementById("adminWorkspace")) {
    renderAdminPage();
    void refreshAdminWorkspace({ silent: true });
  }
}, 30000);









