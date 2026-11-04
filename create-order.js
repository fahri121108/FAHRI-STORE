import { supabaseAdmin, json, method, makeCode, randomToken, priceFor, telegram } from "../lib/server.js";

export default async function handler(req, res) {
  if (!method(req, res, "POST")) return;
  try {
    const { customerName, robloxUsername, followers } = req.body || {};
    const name = String(customerName || "").trim();
    const username = String(robloxUsername || "").trim();
    const qty = Number(followers);
    const amount = priceFor(qty);
    if (name.length < 2 || name.length > 60) return json(res, 400, { error: "Nama harus 2–60 karakter." });
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) return json(res, 400, { error: "Username Roblox tidak valid." });
    if (!amount) return json(res, 400, { error: "Paket tidak tersedia." });

    const db = supabaseAdmin();
    let orderCode = makeCode();
    const accessToken = randomToken();
    const { data, error } = await db.from("orders").insert({
      order_code: orderCode,
      customer_name: name,
      roblox_username: username,
      product_name: "Followers Roblox",
      followers: qty,
      amount,
      payment_method: "QRIS",
      status: "waiting_payment",
      access_token: accessToken
    }).select("order_code,roblox_username,followers,amount").single();
    if (error) throw error;
    if (process.env.TELEGRAM_OWNER_ID && process.env.TELEGRAM_BOT_TOKEN) {
      await telegram("sendMessage", {
        chat_id: process.env.TELEGRAM_OWNER_ID,
        text: `🛒 ORDER BARU DIBUAT\\n\\nID: ${data.order_code}\\nNama: ${name}\\nProduk: Followers Roblox\\nUsername: ${data.roblox_username}\\nJumlah: ${data.followers} Followers\\nTotal: Rp${Number(data.amount).toLocaleString("id-ID")}\\nPembayaran: QRIS\\nStatus: MENUNGGU PEMBAYARAN\\n\\nBukti pembayaran akan dikirim sebagai notifikasi terpisah.`
      });
    }
    return json(res, 201, { orderCode: data.order_code, robloxUsername: data.roblox_username, followers: data.followers, amount: data.amount, accessToken });
  } catch (error) {
    console.error("create-order:", error.message);
    return json(res, 500, { error: "Pesanan gagal dibuat. Silakan coba lagi." });
  }
}
