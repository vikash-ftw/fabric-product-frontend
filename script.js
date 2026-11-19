const BASE_URL = "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 30000;
const HEALTH_INTERVAL_MS = 15000;
const HISTORY_LIMIT = 20;

const PRODUCT_FIELDS = [
    ["productNumber", "Product number"],
    ["productManufacturer", "Manufacturer"],
    ["productName", "Product name"],
    ["productOwnerName", "Owner"],
];

const requestHistory = [];

function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value);
    }
    node.append(...children.flat().filter(Boolean));
    return node;
}

// ---------- Theme ----------

document.getElementById("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
});

// ---------- Server status ----------

function setServerStatus(state) {
    const pill = document.getElementById("serverStatus");
    pill.className = `status-pill ${state}`;
    document.getElementById("serverStatusText").textContent =
        state === "online" ? "Server online" : state === "offline" ? "Server offline" : "Checking…";
}

async function checkServer() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
        await fetch(BASE_URL, { signal: controller.signal });
        setServerStatus("online");
    } catch {
        setServerStatus("offline");
    } finally {
        clearTimeout(timer);
    }
}

checkServer();
setInterval(checkServer, HEALTH_INTERVAL_MS);

// ---------- API ----------

async function request(path, body) {
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const elapsed = () => Math.round(performance.now() - started);

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        let payload = null;
        try { payload = await res.json(); } catch {}
        setServerStatus("online");
        return {
            ok: res.ok,
            status: res.status,
            message: payload?.message || res.statusText || "No message provided",
            data: payload?.data ?? null,
            raw: payload ?? { httpStatus: res.status, body: "Non-JSON response" },
            durationMs: elapsed(),
        };
    } catch (error) {
        const timedOut = error.name === "AbortError";
        setServerStatus("offline");
        return {
            ok: false,
            status: null,
            networkError: true,
            timedOut,
            message: timedOut ? "Request timed out" : error.message,
            data: null,
            raw: { error: timedOut ? "Request timed out" : error.message },
            durationMs: elapsed(),
        };
    } finally {
        clearTimeout(timer);
    }
}

// ---------- Rendering ----------

function describeFailure(result) {
    const msg = (result.message || "").toLowerCase();
    if (result.networkError) {
        return result.timedOut
            ? { title: "Request timed out", hint: "The server did not answer in time. It may be busy or the network is slow." }
            : { title: "Server unreachable", hint: `Could not reach ${BASE_URL}. Check that the Node server is running and the port is correct.` };
    }
    if (result.status === 400 && msg.includes("already exist")) {
        return { title: "Product already exists", hint: "A product with this number is already on the ledger. Use a different product number." };
    }
    if (result.status === 400 && msg.includes("does not exist")) {
        return { title: "Product not found", hint: "No product with this number exists on the ledger. Check the number and try again." };
    }
    if (result.status === 400) {
        return { title: "Invalid request", hint: "The server rejected the request. Check the values you entered." };
    }
    if (result.status >= 500) {
        return { title: "Server or chaincode error", hint: "The server hit an error while processing the request. See the server message below." };
    }
    return { title: "Request failed", hint: "The server returned an unexpected response." };
}

async function copyText(text, button) {
    const original = button.textContent;
    try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
    } catch {
        button.textContent = "Copy failed";
    }
    setTimeout(() => { button.textContent = original; }, 1500);
}

function copyButton(getText) {
    const button = el("button", { class: "copy-btn", type: "button", text: "Copy" });
    button.addEventListener("click", () => copyText(getText(), button));
    return button;
}

function fieldList(product) {
    return el("dl", { class: "fields" },
        PRODUCT_FIELDS.map(([key, label]) =>
            el("div", {}, el("dt", { text: label }), el("dd", { text: product?.[key] ?? "—" }))
        )
    );
}

function txnBlock(txnId) {
    return el("div", { class: "txn" },
        el("div", { class: "txn-label", text: "Transaction ID" }),
        el("div", { class: "txn-row" },
            el("span", { class: "txn-id", text: txnId }),
            copyButton(() => txnId)
        )
    );
}

function rawBlock(raw) {
    const json = JSON.stringify(raw, null, 2);
    return el("details", { class: "raw" },
        el("summary", { text: "Raw response" }),
        el("div", { class: "raw-body" }, copyButton(() => json), el("pre", { text: json }))
    );
}

function showLoading(container) {
    container.replaceChildren(
        el("div", { class: "result-loading" }, el("span", { class: "spinner" }), "Waiting for the server…")
    );
}

function renderResult(container, result, renderSuccessBody) {
    const failure = result.ok ? null : describeFailure(result);
    const badgeText = result.status ?? "ERR";

    const head = el("div", { class: "card-head" },
        el("span", { class: "badge", text: badgeText }),
        el("span", { class: "card-title", text: result.ok ? result.message : failure.title })
    );

    const body = el("div", { class: "card-body" },
        result.ok
            ? renderSuccessBody(result)
            : [
                el("p", { class: "hint", text: failure.hint }),
                el("div", { class: "server-msg", text: result.message }),
            ]
    );

    container.replaceChildren(
        el("div", { class: `card ${result.ok ? "success" : "error"}` }, head, body, rawBlock(result.raw))
    );
}

// ---------- History ----------

function addHistory(entry) {
    requestHistory.unshift(entry);
    requestHistory.length = Math.min(requestHistory.length, HISTORY_LIMIT);
    renderHistory();
}

function renderHistory() {
    document.querySelector(".history").classList.toggle("has-rows", requestHistory.length > 0);
    document.getElementById("historyBody").replaceChildren(
        ...requestHistory.map((h) =>
            el("tr", {},
                el("td", { text: h.time.toLocaleTimeString() }),
                el("td", { text: h.action }),
                el("td", { class: "mono", text: h.product }),
                el("td", {}, el("span", { class: `status-badge ${h.ok ? "ok" : "fail"}`, text: h.status ?? "ERR" })),
                el("td", { class: "num", text: `${h.durationMs} ms` })
            )
        )
    );
}

document.getElementById("clearHistory").addEventListener("click", () => {
    requestHistory.length = 0;
    renderHistory();
});

// ---------- Forms ----------

function validate(form) {
    let valid = true;
    for (const input of form.querySelectorAll("input")) {
        const error = form.querySelector(`[data-error-for="${input.id}"]`);
        const empty = input.value.trim() === "";
        input.classList.toggle("invalid", empty);
        error.textContent = empty ? "This field is required." : "";
        valid = valid && !empty;
    }
    return valid;
}

function clearErrorOnInput(form) {
    form.addEventListener("input", (e) => {
        e.target.classList.remove("invalid");
        form.querySelector(`[data-error-for="${e.target.id}"]`).textContent = "";
    });
}

function setBusy(form, busy) {
    const button = form.querySelector("button[type=submit]");
    button.disabled = busy;
    button.classList.toggle("loading", busy);
}

function setupForm({ formId, resultId, path, action, collect, renderSuccessBody, onSuccess }) {
    const form = document.getElementById(formId);
    const container = document.getElementById(resultId);
    clearErrorOnInput(form);

    container.replaceChildren(el("div", { class: "result-empty", text: "The server response will appear here." }));

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validate(form)) return;

        const payload = collect();
        setBusy(form, true);
        showLoading(container);

        const result = await request(path, payload);

        setBusy(form, false);
        renderResult(container, result, (r) => renderSuccessBody(r, payload));
        addHistory({
            time: new Date(),
            action,
            product: payload.productNumber,
            ok: result.ok,
            status: result.status,
            durationMs: result.durationMs,
        });
        if (result.ok && onSuccess) onSuccess(form);
    });
}

setupForm({
    formId: "addProductForm",
    resultId: "addResult",
    path: "/products/addProduct",
    action: "Add product",
    collect: () => ({
        productNumber: document.getElementById("productNumber").value.trim(),
        productManufacturer: document.getElementById("productManufacturer").value.trim(),
        productName: document.getElementById("productName").value.trim(),
        productOwnerName: document.getElementById("productOwnerName").value.trim(),
    }),
    renderSuccessBody: (result, submitted) => [
        result.data?.DLT_txnId ? txnBlock(result.data.DLT_txnId) : null,
        fieldList(submitted),
    ],
    onSuccess: (form) => form.reset(),
});

setupForm({
    formId: "fetchProductForm",
    resultId: "fetchResult",
    path: "/products/getProduct",
    action: "Fetch product",
    collect: () => ({ productNumber: document.getElementById("fetchProductNumber").value.trim() }),
    renderSuccessBody: (result) => fieldList(result.data),
});

renderHistory();
