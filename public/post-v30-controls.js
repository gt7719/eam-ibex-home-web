"use strict";

let paymentMethods = [
  {
    id: "card",
    labelMn: "Банкны карт",
    labelEn: "Bank card",
    detailMn: "Дотоод болон олон улсын карт",
    detailEn: "Domestic or international card",
    checkoutUrl: "",
    enabled: true,
  },
  {
    id: "qr",
    labelMn: "Банкны QR",
    labelEn: "Bank QR",
    detailMn: "Дэмжигдсэн банкны апп-аар төлнө",
    detailEn: "Pay with a supported banking app",
    checkoutUrl: "",
    enabled: true,
  },
  {
    id: "bank_app",
    labelMn: "Банкны апп",
    labelEn: "Bank app",
    detailMn: "Банкны апп руу аюулгүй шилжинэ",
    detailEn: "Continue securely in the banking app",
    checkoutUrl: "",
    enabled: true,
  },
  {
    id: "transfer",
    labelMn: "Дансаар шилжүүлэх",
    labelEn: "Bank transfer",
    detailMn: "Нэхэмжлэл, гүйлгээний утгаар төлнө",
    detailEn: "Pay with invoice and payment reference",
    checkoutUrl: "",
    enabled: true,
  },
  {
    id: "other",
    labelMn: "Бусад",
    labelEn: "Other",
    detailMn: "Админаас идэвхжүүлсэн бусад хэлбэр",
    detailEn: "Another administrator-enabled method",
    checkoutUrl: "",
    enabled: false,
  },
];

const postV30HeaderRenderer = renderHeaderMenu;
renderHeaderMenu = function (key) {
  postV30HeaderRenderer(key);
  megaAdmin.hidden = true;
};
megaAdmin.hidden = true;

function enabledBankApps(method) {
  return Array.isArray(method?.apps)
    ? method.apps.filter((app) => app?.enabled !== false && app?.imageUrl && app?.bankUrl)
    : [];
}

function paymentMethodReady(method) {
  if (method.id === "qr") return !!(method.imageUrl || method.checkoutUrl);
  if (method.id === "bank_app") return enabledBankApps(method).length > 0 || !!method.checkoutUrl;
  return !!method.checkoutUrl;
}

function paymentMethodMarkup(en) {
  return paymentMethods
    .filter((method) => method.enabled)
    .map((method) => {
      const label = en ? method.labelEn : method.labelMn,
        detail = en ? method.detailEn : method.detailMn,
        ready = paymentMethodReady(method);
      return `<button type="button" class="payment-method ${selectedPaymentMethod === method.id ? "active" : ""}" data-payment="${esc(method.id)}" data-checkout="${esc(method.checkoutUrl)}"><strong>${esc(label)}</strong><small>${esc(detail)}</small><em class="${ready ? "payment-ready" : "payment-pending"}">${ready ? (en ? "READY" : "ХОЛБОГДСОН") : en ? "AWAITING BANK LINK" : "БАНКНЫ ХОЛБООС ХҮЛЭЭЖ БАЙНА"}</em></button>`;
    })
    .join("");
}

const postV30DetailRenderer = renderDetailContent;
const renderLegacyPostV30Pricing = function (key, focusGroup = -1) {
  if (key !== "pricing") {
    postV30DetailRenderer(key, focusGroup);
    updateDetailTopSafety();
    return;
  }
  currentDetailView = "index";
  currentDetailFocus = focusGroup;
  currentResourceSelection = null;
  currentFlowStep = null;
  const d = (currentLang === "en" ? headerMenusEN : headerMenus)[key],
    en = currentLang === "en",
    plans = pricingPlans.filter((plan) => plan.enabled);
  syncDetailNavigation();
  document.getElementById("detailKicker").textContent = d.k;
  document.getElementById("detailTitle").textContent = d.t;
  document.getElementById("detailIntro").textContent = d.i;
  document.getElementById("detailContent").classList.remove("reading-detail");
  document.getElementById("detailContent").innerHTML =
    `<div class="billing-switch" role="group" aria-label="${en ? "Billing period" : "Төлбөрийн хугацаа"}"><button type="button" data-billing="monthly" class="${billingPeriod === "monthly" ? "active" : ""}">${en ? "Monthly" : "Сараар"}</button><button type="button" data-billing="annual" class="${billingPeriod === "annual" ? "active" : ""}">${en ? "Annually" : "Жилээр"}</button></div><div class="detail-pricing">${plans
      .map((p, planIndex) => {
        const price = planPrice(p, en),
          descriptions = planRows(p.descriptions, en),
          scopes = planRows(p.scopes, en),
          canChoose = p.id === "custom" || p.monthlyMnt !== null,
          label =
            p.id === "custom"
              ? en
                ? "REQUEST A QUOTE"
                : "ҮНИЙН САНАЛ АВАХ"
              : p.id === "free"
                ? en
                  ? "START FREE"
                  : "ҮНЭГҮЙ ЭХЛҮҮЛЭХ"
                : en
                  ? "BUY"
                  : "BUY · ХУДАЛДАН АВАХ";
        return `<article class="detail-plan ${p.featured ? "featured" : ""}" data-detail-plan="${planIndex}"><h3>${esc(p.name)}${p.featured ? `<span class="plan-badge">${en ? "RECOMMENDED" : "САНАЛ БОЛГОХ"}</span>` : ""}</h3><div class="plan-price">${esc(price)}${p.id !== "custom" && p.monthlyMnt !== null ? `<small> / ${billingPeriod === "annual" ? (en ? "year" : "жил") : en ? "month" : "сар"}</small>` : ""}</div>${billingPeriod === "annual" && p.annualDiscountPercent ? `<div class="plan-summary">${en ? "Annual discount" : "Жилийн хямдрал"}: ${p.annualDiscountPercent}%</div>` : ""}${descriptions.length ? `<div class="plan-section"><span class="plan-section-title">${en ? "Description" : "Тайлбар"}</span>${planList(descriptions)}</div>` : ""}${planMeta(p, en)}${scopes.length ? `<div class="plan-section plan-scope"><span class="plan-section-title">${en ? "Scope" : "Хамрах хүрээ"}</span>${planList(scopes)}</div>` : ""}<button type="button" class="plan-select" data-choose-plan="${planIndex}" ${canChoose ? "" : "disabled"}>${label}</button></article>`;
      })
      .join(
        "",
      )}</div><section class="payment-panel" id="paymentPanel" ${selectedPaymentPlan === null ? "hidden" : ""}><div class="payment-panel-head"><div><small>SECURE CHECKOUT</small><h3>${en ? "Choose a payment method" : "Төлбөрийн хэлбэрээ сонгоно уу"}</h3></div><span>⌾ ${en ? "Bank protected" : "Банкны хамгаалалттай"}</span></div><p id="paymentSummary"></p><div class="payment-methods">${paymentMethodMarkup(en)}</div><p class="payment-status" id="paymentStatus">${en ? "Select Card, QR, bank app, transfer or another enabled method." : "Card, QR, банкны апп, дансны шилжүүлэг эсвэл идэвхтэй бусад хэлбэрээс сонгоно."}</p><div class="payment-detail" id="paymentDetail" aria-live="polite"></div><a class="payment-confirm" id="paymentConfirm" aria-disabled="true">${en ? "Choose a payment method" : "Төлбөрийн хэлбэр сонгоно уу"}</a></section><article class="continuous-article pricing-guide"><h3>${en ? "Choose your plan" : "Багцаа сонгох"}</h3><p>${en ? "Prices are shown in MNT. Choose monthly or annual billing, then review the final amount before continuing." : "Үнийг MNT-ээр харуулна. Сар эсвэл жилийн төлөлтөө сонгож, үргэлжлүүлэхийн өмнө эцсийн дүнгээ хянана."}</p></article>`;
  if (selectedPaymentPlan !== null) {
    updatePaymentSummary();
    updatePaymentAction();
  }
  updateDetailTopSafety();
};

renderDetailContent = function (key, focusGroup = -1) {
  postV30DetailRenderer(key, focusGroup);
  if (key === "pricing") {
    const methods = document.querySelector("#detailContent .payment-methods");
    if (methods) methods.innerHTML = paymentMethodMarkup(currentLang === "en");
    if (selectedPaymentPlan !== null) updatePaymentAction();
  }
  updateDetailTopSafety();
};

function updatePaymentAction() {
  const method = paymentMethods.find((row) => row.id === selectedPaymentMethod),
    confirm = document.getElementById("paymentConfirm"),
    status = document.getElementById("paymentStatus"),
    detail = document.getElementById("paymentDetail"),
    en = currentLang === "en";
  if (!confirm || !status || !detail) return;
  confirm.removeAttribute("href");
  confirm.removeAttribute("target");
  confirm.removeAttribute("rel");
  confirm.classList.remove("ready");
  confirm.hidden = false;
  confirm.setAttribute("aria-disabled", "true");
  if (!method) {
    detail.innerHTML = "";
    confirm.textContent = en
      ? "Choose a payment method"
      : "Төлбөрийн хэлбэр сонгоно уу";
    return;
  }
  detail.innerHTML = paymentDetailMarkup(method, en);
  const localChoice = (method.id === "qr" && method.imageUrl) || (method.id === "bank_app" && enabledBankApps(method).length);
  if (localChoice && !method.checkoutUrl) {
    status.textContent = method.id === "qr"
      ? (en ? "Scan the configured QR with your banking app." : "Тохируулсан QR зургийг банкны апп-аараа уншуулна уу.")
      : (en ? "Choose a bank app below to continue securely." : "Доорх банкны аппыг сонгож аюулгүй үргэлжлүүлнэ үү.");
    confirm.hidden = true;
    return;
  }
  if (!method.checkoutUrl) {
    status.textContent = en
      ? "The bank connection for this method is not configured. No QR, card data or successful payment is simulated."
      : "Энэ төлбөрийн хэлбэрийн банкны холболт тохируулагдаагүй. QR, картын мэдээлэл эсвэл амжилттай төлөвийг хуурамчаар үүсгэхгүй.";
    confirm.textContent = en
      ? "BANK LINK NOT CONFIGURED"
      : "БАНКНЫ ХОЛБООС ТОХИРУУЛААГҮЙ";
    return;
  }
  status.textContent = en
    ? "The secure bank or payment-gateway interface is loaded below."
    : "Банк эсвэл төлбөрийн gateway-ийн хамгаалалттай интерфейс доорх талбайд ачаалагдлаа.";
  confirm.textContent = en ? "CONTINUE TO PAYMENT" : "ТӨЛБӨРТ ШИЛЖИХ";
  confirm.href = method.checkoutUrl;
  confirm.target = "_blank";
  confirm.rel = "noopener noreferrer";
  confirm.classList.add("ready");
  confirm.setAttribute("aria-disabled", "false");
}

function paymentDetailMarkup(method, en) {
  const configured = !!method.checkoutUrl,
    title = en ? method.labelEn : method.labelMn,
    url = esc(method.checkoutUrl || "");
  if (method.id === "qr" && method.imageUrl)
    return `<section class="payment-detail-shell qr"><header><span>▦</span><div><strong>${esc(title)}</strong><small>${en ? "Scan with your banking app" : "Банкны апп-аараа уншуулна уу"}</small></div></header><div class="bank-qr-image-wrap"><img class="bank-qr-image" src="${esc(method.imageUrl)}" alt="${en ? "Bank payment QR" : "Банкны төлбөрийн QR"}"></div><p>${en ? "Verify the recipient and amount in your banking app before confirming." : "Банкны апп дээр хүлээн авагч болон дүнг шалгасны дараа баталгаажуулна уу."}</p></section>`;
  const apps = enabledBankApps(method);
  if (method.id === "bank_app" && apps.length)
    return `<section class="payment-detail-shell bank_app"><header><span>◉</span><div><strong>${esc(title)}</strong><small>${en ? "Choose your bank app" : "Банкны апп сонгоно уу"}</small></div></header><div class="payment-bank-app-grid">${apps.map((app) => `<a href="${esc(app.bankUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(app.imageUrl)}" alt=""><strong>${esc(en ? app.nameEn : app.nameMn)}</strong></a>`).join("")}</div><p>${en ? "Selecting an app opens the bank-provided secure link." : "Аппыг дарахад тухайн банкны хамгаалалттай холбоос нээгдэнэ."}</p></section>`;
  if (configured)
    return `<section class="payment-detail-shell ${esc(method.id)}"><header><span>${method.id === "card" ? "▣" : method.id === "qr" ? "▦" : method.id === "bank_app" ? "◉" : method.id === "transfer" ? "⇄" : "◇"}</span><div><strong>${esc(title)}</strong><small>${en ? "Secure bank-hosted payment area" : "Банкны хамгаалалттай төлбөрийн талбай"}</small></div></header><iframe class="payment-hosted-frame" src="${url}" title="${esc(title)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe><p>${en ? "If the provider prevents embedded display, use Continue to payment." : "Банк дотор харуулахыг хориглосон бол “Төлбөрт шилжих” командыг ашиглана."}</p></section>`;
  if (method.id === "card")
    return `<section class="payment-detail-shell card"><header><span>▣</span><div><strong>${en ? "Card information" : "Картын мэдээлэл"}</strong><small>${en ? "Secure bank-hosted fields appear here after connection." : "Банкны хамгаалалттай талбарууд холболтын дараа энд гарна."}</small></div></header><div class="hosted-card-placeholder" aria-hidden="true"><label class="wide"><span>${en ? "CARDHOLDER NAME" : "КАРТ ЭЗЭМШИГЧИЙН НЭР"}</span><i>${en ? "Example: Gantumur Erdenedalai" : "Жишээ: Гантөмөр Эрдэнэ далай"}</i></label><label class="wide"><span>${en ? "CARD NUMBER" : "КАРТЫН ДУГААР"}</span><i>${en ? "Example: 4111 1111 1111 1111" : "Жишээ: 4111 1111 1111 1111"}</i></label><label><span>${en ? "EXPIRY" : "ДУУСАХ ХУГАЦАА"}</span><i>${en ? "Example: MM / YY" : "Жишээ: СС / ЖЖ"}</i></label><label><span>CVC / CVV</span><i>${en ? "Example: 123" : "Жишээ: 123"}</i></label></div><p>⌾ ${en ? "Card number and CVV are processed by the bank and never stored by the iBeX website." : "Картын дугаар болон CVV-г банк боловсруулж, iBeX вебсайт хадгалахгүй."}</p></section>`;
  if (method.id === "qr")
    return `<section class="payment-detail-shell qr"><header><span>▦</span><div><strong>${en ? "Bank payment QR" : "Банкны төлбөрийн QR"}</strong><small>${en ? "A transaction-specific QR will appear here." : "Тухайн гүйлгээнд зориулсан QR энд гарна."}</small></div></header><div class="bank-qr-placeholder"><b>QR</b><small>${en ? "Scan with a supported banking app" : "Дэмжигдсэн банкны апп-аар уншуулна"}</small><em>${en ? "Awaiting bank connection" : "Банкны холболт хүлээж байна"}</em></div><p>${en ? "Only a QR returned by the connected bank or gateway will be displayed." : "Зөвхөн холбогдсон банк эсвэл gateway-ээс ирсэн бодит QR-г харуулна."}</p></section>`;
  const copy =
    method.id === "bank_app"
      ? en
        ? "The supported bank-app choices and secure deep link will appear here."
        : "Дэмжигдсэн банкны апп болон аюулгүй шилжих холбоос энд гарна."
      : method.id === "transfer"
        ? en
          ? "Recipient, bank account, amount and unique payment reference will appear here."
          : "Хүлээн авагч, данс, төлөх дүн болон давтагдахгүй гүйлгээний утга энд гарна."
        : en
          ? "The administrator-enabled payment instructions will appear here."
          : "Админаас идэвхжүүлсэн төлбөрийн заавар энд гарна.";
  const examples =
    method.id === "transfer"
      ? `<div class="payment-example-grid" aria-hidden="true"><span><small>${en ? "BANK" : "БАНК"}</small><b>${en ? "Example bank" : "Жишээ банк"}</b></span><span><small>${en ? "ACCOUNT NAME" : "ДАНСНЫ НЭР"}</small><b>iBeX Mongolia LLC</b></span><span><small>${en ? "ACCOUNT NUMBER" : "ДАНСНЫ ДУГААР"}</small><b>0000 0000 0000</b></span><span><small>${en ? "PAYMENT REFERENCE" : "ГҮЙЛГЭЭНИЙ УТГА"}</small><b>IBEX-XXXXXX</b></span></div>`
      : method.id === "bank_app"
        ? `<div class="payment-app-examples" aria-hidden="true"><i>${en ? "Bank app" : "Банкны апп"}</i><i>${en ? "Secure link" : "Аюулгүй холбоос"}</i><i>${en ? "Confirm" : "Баталгаажуулах"}</i></div>`
        : "";
  return `<section class="payment-detail-shell ${esc(method.id)}"><header><span>${method.id === "bank_app" ? "◉" : method.id === "transfer" ? "⇄" : "◇"}</span><div><strong>${esc(title)}</strong><small>${en ? "Awaiting secure provider connection" : "Үйлчилгээний хамгаалалттай холболт хүлээж байна"}</small></div></header>${examples}<div class="payment-empty-state">${esc(copy)}</div></section>`;
}

document.getElementById("detailContent").addEventListener(
  "click",
  (event) => {
    const billing = event.target.closest("[data-billing]");
    if (!billing) return;
    const top = detailScroll.scrollTop;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        detailScroll.scrollTop = top;
        document
          .querySelector(`[data-billing="${billing.dataset.billing}"]`)
          ?.focus({ preventScroll: true });
      }),
    );
  },
  true,
);

document.getElementById("detailContent").addEventListener("click", (event) => {
  const method = event.target.closest("[data-payment]");
  if (!method) return;
  requestAnimationFrame(updatePaymentAction);
});

function updateDetailTopSafety() {
  const top = document.getElementById("detailTop"),
    shell = document.getElementById("detailShell");
  if (!top || !shell) return;
  const actions = document.querySelector(
    "#detailContent .detail-footer-action, #detailContent .payment-panel:not([hidden])",
  );
  if (!actions) {
    top.classList.remove("avoid-actions");
    return;
  }
  const actionRect = actions.getBoundingClientRect(),
    shellRect = shell.getBoundingClientRect();
  top.classList.toggle(
    "avoid-actions",
    actionRect.top < shellRect.bottom - 18 &&
      actionRect.bottom > shellRect.top + 18,
  );
}
detailScroll.addEventListener("scroll", updateDetailTopSafety, {
  passive: true,
});
window.addEventListener("resize", updateDetailTopSafety);

fetch("/api/content", { cache: "no-store" })
  .then((response) => (response.ok ? response.json() : null))
  .then((payload) => {
    const rows = payload?.content?.paymentSettings;
    if (Array.isArray(rows) && rows.length) paymentMethods = rows;
    if (currentDetailMenu === "pricing") renderDetailContent("pricing");
  })
  .catch(() => {});

if (
  new URLSearchParams(location.search).get("admin") === "content" &&
  !window.__ibexV31AdminHub
) {
  let attempts = 0;
  const openContentAdmin = () => {
    if (window.__ibexV31AdminHub) return;
    attempts++;
    if (adminPermissions.size) {
      adminPermissions.delete("pricing.manage");
      adminPreview = ["partners", "people"].some((section) =>
        canAdminSection(section),
      );
      if (adminPreview) openSiteAdmin();
      return;
    }
    if (attempts < 30) setTimeout(openContentAdmin, 100);
  };
  setTimeout(openContentAdmin, 100);
}
