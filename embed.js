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

    .booking-embed-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 24px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: none;
      color: var(--muted);
      opacity: 0;
      animation: bookingEmbedLoadingFade 160ms ease forwards;
    }

    .booking-embed-loading::before {
      content: "";
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid rgba(138, 109, 73, 0.22);
      border-top-color: var(--accent);
      animation: bookingEmbedLoadingSpin 800ms linear infinite;
      flex: 0 0 auto;
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
  host.className = "page-book booking-embed-root";
  host.innerHTML = `<div class="booking-embed-loading">Loading booking engine...</div>`;

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
