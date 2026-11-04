const PRICE_TIERS = [
  { followers: 300, price: 5000 },
  { followers: 600, price: 10000 },
  { followers: 900, price: 15000 },
  { followers: 1200, price: 20000 },
  { followers: 1500, price: 25000 },
  { followers: 2000, price: 35000 },
  { followers: 3000, price: 50000 },
  { followers: 5000, price: 80000 },
  { followers: 10000, price: 150000 }
];

const $ = (s) => document.querySelector(s);
const orderModal = $("#order-modal");
const paymentModal = $("#payment-modal");
let currentOrder = null;

function rupiah(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function openModal(el) { el.classList.add("show"); el.setAttribute("aria-hidden", "false"); }
function closeModal(el) { el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); }

$("#year").textContent = new Date().getFullYear();
const packageSelect = $("#package-select");
PRICE_TIERS.forEach((tier) => {
  const opt = document.createElement("option");
  opt.value = String(tier.followers);
  opt.textContent = `${tier.followers.toLocaleString("id-ID")} Followers — ${rupiah(tier.price)}`;
  packageSelect.appendChild(opt);
});
function selectedTier() { return PRICE_TIERS.find(t => t.followers === Number(packageSelect.value)); }
function refreshPrice() { const t = selectedTier(); $("#price-preview").textContent = t ? rupiah(t.price) : "—"; }
packageSelect.addEventListener("change", refreshPrice);
refreshPrice();

$("#open-order").addEventListener("click", () => openModal(orderModal));
$("#close-order").addEventListener("click", () => closeModal(orderModal));
$("#close-payment").addEventListener("click", () => closeModal(paymentModal));
[orderModal, paymentModal].forEach(el => el.addEventListener("click", e => { if (e.target === el) closeModal(el); }));

$("#order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tier = selectedTier();
  const button = $("#submit-order");
  const message = $("#order-message");
  if (!tier) return;
  button.disabled = true;
  button.textContent = "Membuat pesanan...";
  message.textContent = "";
  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: $("#customer-name").value.trim(),
        robloxUsername: $("#roblox-username").value.trim(),
        followers: tier.followers
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Pesanan belum bisa dibuat.");
    currentOrder = data;
    $("#payment-order-summary").innerHTML = `
      <b>Kode order:</b> ${escapeHtml(data.orderCode)}<br>
      <b>Produk:</b> Followers Roblox<br>
      <b>Username:</b> ${escapeHtml(data.robloxUsername)}<br>
      <b>Jumlah:</b> ${Number(data.followers).toLocaleString("id-ID")} Followers<br>
      <b>Total:</b> ${rupiah(data.amount)}
    `;
    closeModal(orderModal);
    openModal(paymentModal);
  } catch (err) {
    message.textContent = err.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Buat pesanan <span>→</span>';
  }
});

$("#proof-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("#proof-file").files[0];
  const button = $("#submit-proof");
  const message = $("#proof-message");
  if (!currentOrder || !file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
    message.textContent = "Pilih gambar JPG, PNG, atau WEBP maksimal 4 MB.";
    return;
  }
  button.disabled = true;
  button.textContent = "Mengirim bukti...";
  message.textContent = "";
  try {
    const signRes = await fetch("/api/create-proof-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode: currentOrder.orderCode, accessToken: currentOrder.accessToken, contentType: file.type })
    });
    const signed = await signRes.json();
    if (!signRes.ok) throw new Error(signed.error || "Tidak bisa menyiapkan upload.");
    const uploadRes = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: file
    });
    if (!uploadRes.ok) throw new Error("Upload bukti gagal. Coba lagi.");
    const confirmRes = await fetch("/api/confirm-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode: currentOrder.orderCode, accessToken: currentOrder.accessToken, storagePath: signed.path })
    });
    const confirmed = await confirmRes.json();
    if (!confirmRes.ok) throw new Error(confirmed.error || "Bukti belum berhasil dikirim.");
    message.textContent = `Bukti berhasil dikirim. Simpan kode ${currentOrder.orderCode} untuk mengecek status pesanan.`;
    $("#proof-file").value = "";
  } catch (err) {
    message.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = "Kirim bukti pembayaran";
  }
});

$("#track-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = $("#track-code").value.trim().toUpperCase();
  const result = $("#track-result");
  result.textContent = "Memeriksa pesanan...";
  try {
    const response = await fetch(`/api/order-status?code=${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Pesanan tidak ditemukan.");
    result.innerHTML = `<b>${escapeHtml(data.orderCode)}</b> · ${escapeHtml(data.statusLabel)}<br>${escapeHtml(data.productName)} — ${Number(data.followers).toLocaleString("id-ID")} Followers<br>Total: ${rupiah(data.amount)}`;
  } catch (err) {
    result.textContent = err.message;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
