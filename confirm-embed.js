(function () {
  const currentScript =
    document.currentScript ||
    Array.from(document.scripts).find((script) => /\/confirm-embed\.js(?:[?#]|$)/i.test(script.src || ""));

  if (!currentScript || !currentScript.parentNode) return;

  const scriptUrl = new URL(currentScript.src, window.location.href);
  const apiOrigin = scriptUrl.origin;
  const slug =
    currentScript.dataset.slug ||
    currentScript.dataset.camp ||
    scriptUrl.searchParams.get("slug") ||
    scriptUrl.searchParams.get("camp") ||
    window.bookingEngineConfig?.slug ||
    "";

  const mount = document.createElement("div");
  mount.className = "booking-confirmation-embed-mount";
  currentScript.parentNode.insertBefore(mount, currentScript);

  const shadow = mount.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      display: block;
      width: 100%;
    }

    .confirmation-root {
      --bg: #f4ecdf;
      --panel: #fffaf1;
      --border: #ded2c1;
      --text: #2f261d;
      --muted: #6f6255;
      --accent: #8a6d49;
      --shadow: 0 18px 40px rgba(63, 47, 28, 0.12);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
      width: 100%;
    }

    .confirmation-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: var(--shadow);
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 760px;
      padding: 28px;
    }

    .eyebrow {
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    h2 {
      font-size: clamp(1.7rem, 4vw, 2.6rem);
      line-height: 1.05;
      margin: 0 0 10px;
    }

    .helper {
      color: var(--muted);
      margin: 0;
    }

    .summary-list {
      border-top: 1px solid var(--border);
      margin-top: 22px;
      padding-top: 10px;
    }

    .summary-item {
      align-items: center;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 14px 0;
    }

    .summary-item:last-child {
      border-bottom: 0;
    }

    .summary-item div {
      display: grid;
      gap: 2px;
    }

    .summary-item span {
      color: var(--muted);
    }

    .summary-item strong:last-child {
      text-align: right;
      white-space: nowrap;
    }

    .status-pill {
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      border-radius: 999px;
      color: var(--accent);
      display: inline-flex;
      font-weight: 800;
      padding: 6px 12px;
    }

    @media (max-width: 620px) {
      .confirmation-card {
        border-radius: 18px;
        padding: 20px;
      }

      .summary-item {
        align-items: flex-start;
        flex-direction: column;
      }

      .summary-item strong:last-child {
        text-align: left;
      }
    }
  `;

  const root = document.createElement("div");
  root.className = "confirmation-root";
  shadow.append(style, root);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  }

  function money(value) {
    const amount = Math.max(0, Number(value) || 0);
    return `€ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function nightsBetween(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function paymentStatusLabel(status) {
    if (status === "paid") return "Paid";
    if (status === "deposit_paid") return "Deposit paid";
    if (status === "pending") return "Pending";
    return status ? String(status).replace(/_/g, " ") : "Confirmed";
  }

  function renderLoading() {
    root.innerHTML = `
      <div class="confirmation-card">
        <p class="eyebrow">Confirming reservation</p>
        <h2>Checking your payment...</h2>
        <p class="helper">This usually takes a moment.</p>
      </div>
    `;
  }

  function renderError(message, hostName = "the host") {
    root.innerHTML = `
      <div class="confirmation-card">
        <p class="eyebrow">Confirmation unavailable</p>
        <h2>We could not load the confirmation right now.</h2>
        <p class="helper">${escapeHtml(message)} Please refresh and, if it keeps happening, contact ${escapeHtml(hostName)}.</p>
      </div>
    `;
  }

  function renderConfirmation(booking, workspace) {
    const reservationCode = booking.reservationCode || "";
    const amountPaid = Math.max(0, Number(booking.amountPaid || booking.stripePaymentAmount || 0));
    const amountDue = Math.max(0, Number(booking.amountDue ?? Number(booking.total || 0) - amountPaid));
    const total = Math.max(0, Number(booking.total || amountPaid + amountDue || 0));
    const nights = nightsBetween(booking.startDate, booking.endDate);
    const hostName = workspace?.camp?.name || "your host";
    root.innerHTML = `
      <div class="confirmation-card">
        <p class="eyebrow">Booking confirmed</p>
        <h2>Thank you${booking.guestName ? `, ${escapeHtml(booking.guestName)}` : ""}.</h2>
        <p class="helper">Your reservation is saved with ${escapeHtml(hostName)}.</p>
        <div class="summary-list">
          <div class="summary-item">
            <div>
              <strong>Reservation number</strong>
              <span>${escapeHtml(reservationCode)}</span>
            </div>
            <strong class="status-pill">Confirmed</strong>
          </div>
          <div class="summary-item">
            <div>
              <strong>Dates booked</strong>
              <span>${escapeHtml(formatDate(booking.startDate))} to ${escapeHtml(formatDate(booking.endDate))}</span>
            </div>
            <strong>${nights} night${nights === 1 ? "" : "s"}</strong>
          </div>
          <div class="summary-item">
            <div>
              <strong>Payment status</strong>
              <span>${escapeHtml(paymentStatusLabel(booking.paymentStatus))}</span>
            </div>
            <strong>${money(amountPaid)} paid</strong>
          </div>
          <div class="summary-item">
            <div>
              <strong>Total</strong>
              <span>${money(total)}</span>
            </div>
            <strong>Balance due ${money(amountDue)}</strong>
          </div>
          <div class="summary-item">
            <div>
              <strong>Guest email</strong>
              <span>${escapeHtml(booking.guestEmail || "")}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function apiJson(path, options) {
    const response = await fetch(`${apiOrigin}/.netlify/functions/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || "Could not confirm the reservation.");
    }
    return data;
  }

  async function boot() {
    renderLoading();
    const params = new URLSearchParams(window.location.search);
    const reservationCode = params.get("reservation") || "";
    const workspaceId = params.get("workspace") || "";
    const sessionId = params.get("session_id") || "";
    const email = params.get("email") || "";
    let publicWorkspace = null;

    try {
      if (slug) {
        publicWorkspace = await apiJson(`public-workspace?slug=${encodeURIComponent(slug)}`);
      }

      if (!reservationCode || !workspaceId || !sessionId) {
        renderError("The confirmation link is missing booking details.", publicWorkspace?.camp?.name || "the host");
        return;
      }

      const result = await apiJson("reconcile-stripe-checkout", {
        method: "POST",
        body: JSON.stringify({ reservationCode, workspaceId, sessionId, email }),
      });
      renderConfirmation(result.booking || {}, result.workspace || publicWorkspace);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Could not confirm the reservation.", publicWorkspace?.camp?.name || "the host");
    }
  }

  void boot();
})();
