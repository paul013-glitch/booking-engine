(function () {
  const currentScript =
    document.currentScript ||
    Array.from(document.scripts).find((script) => /\/embed\.js(?:[?#]|$)/i.test(script.src || ""));

  if (!currentScript || !currentScript.parentNode) return;

  const scriptUrl = new URL(currentScript.src, window.location.href);
  const slug =
    currentScript.dataset.slug ||
    currentScript.dataset.camp ||
    scriptUrl.searchParams.get("slug") ||
    scriptUrl.searchParams.get("camp") ||
    window.bookingEngineConfig?.slug ||
    "";
  const returnUrl =
    currentScript.dataset.returnUrl ||
    currentScript.dataset.successUrl ||
    window.bookingEngineConfig?.returnUrl ||
    window.location.href;

  const mount = document.createElement("div");
  mount.className = "booking-engine-embed-mount";
  currentScript.parentNode.insertBefore(mount, currentScript);

  const shadow = mount.attachShadow({ mode: "open" });

  const baseStyle = document.createElement("style");
  baseStyle.textContent = `
    :host {
      display: block;
      width: 100%;
      overflow: visible;
    }

    .booking-embed-root {
      --bg: #f4ecdf;
      --panel: #fffaf1;
      --panel-soft: #f8f1e4;
      --border: #ded2c1;
      --text: #2f261d;
      --muted: #6f6255;
      --accent: #8a6d49;
      --accent-soft: #efe2cf;
      --shadow: 0 10px 24px rgba(63, 47, 28, 0.08);
      --title-font: Georgia, "Times New Roman", serif;
      --body-font: Arial, Helvetica, sans-serif;
      --radius-xl: 24px;
      --radius-lg: 18px;
      --radius-md: 14px;
      display: block;
      width: 100%;
      overflow: visible;
      background: var(--bg);
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.5;
    }

    .booking-embed-root .book-header,
    .booking-embed-root .booking-shell {
      width: 100%;
      max-width: none;
    }

    .booking-embed-root .summary-panel {
      overflow: visible;
    }

    .book-loading-screen {
      min-height: min(480px, 62vh);
      display: grid;
      place-items: center;
    }

    .book-loading-card {
      width: min(100%, 560px);
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 18px;
      align-items: center;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--panel);
      box-shadow: none;
      color: var(--text);
      opacity: 0;
      animation: bookingEmbedLoadingFade 160ms ease forwards;
    }

    .book-loading-orbit {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 999px;
      border: 1px solid rgba(138, 109, 73, 0.22);
      background: var(--accent-soft);
    }

    .book-loading-orbit::before {
      content: "";
      position: absolute;
      inset: 9px;
      border-radius: inherit;
      border: 3px solid rgba(138, 109, 73, 0.18);
      border-top-color: var(--accent);
      animation: bookingEmbedLoadingSpin 800ms linear infinite;
    }

    .book-loading-orbit span {
      position: absolute;
      inset: 20px;
      border-radius: inherit;
      background: var(--accent);
    }

    .book-loading-copy strong {
      display: block;
      font-size: 1.35rem;
      line-height: 1.15;
    }

    .book-loading-copy p {
      margin: 6px 0 0;
      color: var(--muted);
    }

    .book-loading-progress {
      height: 9px;
      margin-top: 16px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(138, 109, 73, 0.16);
    }

    .book-loading-progress span {
      display: block;
      height: 100%;
      width: 8%;
      border-radius: inherit;
      background: var(--accent);
      transition: width 260ms ease;
    }

    .book-loading-percent {
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    @keyframes bookingEmbedLoadingFade {
      to {
        opacity: 1;
      }
    }

    @keyframes bookingEmbedLoadingSpin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  const linkedStyles = document.createElement("link");
  linkedStyles.rel = "stylesheet";
  linkedStyles.href = new URL("styles.css", scriptUrl).toString();

  const preloadStyles = document.createElement("link");
  preloadStyles.rel = "preload";
  preloadStyles.as = "style";
  preloadStyles.href = linkedStyles.href;

  const preloadApp = document.createElement("link");
  preloadApp.rel = "preload";
  preloadApp.as = "script";
  preloadApp.href = new URL("app.js", scriptUrl).toString();
  document.head.append(preloadStyles, preloadApp);

  const host = document.createElement("div");
  host.className = "page-book booking-embed-root is-book-loading";
  host.innerHTML = `
    <section id="bookLoading" class="book-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div class="book-loading-card">
        <div class="book-loading-orbit" aria-hidden="true">
          <span></span>
        </div>
        <div class="book-loading-copy">
          <p class="eyebrow">Booking engine</p>
          <strong id="bookLoadingTitle">Preparing your booking flow</strong>
          <p id="bookLoadingDetail">Loading the booking engine.</p>
          <div class="book-loading-progress" aria-hidden="true">
            <span id="bookLoadingBar" style="width: 8%;"></span>
          </div>
          <p class="book-loading-percent"><span id="bookLoadingPercent">8</span>% complete</p>
        </div>
      </div>
    </section>
  `;

  shadow.append(baseStyle, linkedStyles, host);

  window.__SURFCAMP_BOOKING_EMBED__ = {
    slug: String(slug || "").trim(),
    root: shadow,
    hostElement: host,
    themeTarget: host,
    siteUrl: scriptUrl.origin,
    returnUrl: String(returnUrl || window.location.href),
    hostPageUrl: window.location.href,
    inlineConfirmation: true,
  };

  if (window.SurfCampBookingEmbed?.boot) {
    window.SurfCampBookingEmbed.boot();
    return;
  }

  const existingAppScript = document.querySelector('script[data-booking-engine-app="true"]');
  if (existingAppScript) {
    existingAppScript.addEventListener(
      "load",
      function handleExistingLoad() {
        window.SurfCampBookingEmbed?.boot?.();
      },
      { once: true },
    );
    return;
  }

  const appScript = document.createElement("script");
  appScript.src = preloadApp.href;
  appScript.dataset.bookingEngineApp = "true";
  appScript.addEventListener(
    "load",
    function handleAppLoad() {
      window.SurfCampBookingEmbed?.boot?.();
    },
    { once: true },
  );
  document.head.appendChild(appScript);
})();
