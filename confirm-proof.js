import { supabaseAdmin, json, method, telegram } from "../lib/server.js";

export default async function handler(req, res) {
  if (!method(req, res, "POST")) return;
  try {
    const { orderCode, accessToken, storagePath } = req.body || {};
    const db = supabaseAdmin();
    const { data: order, error: findError } = await db.from("orders").select("*").eq("order_code", orderCode).single();
    if (findError || !order || order.access_token !== accessToken) return json(res, 403, { error: "Akses pesanan tidak valid." });
    if (!storagePath || !storagePath.startsWith(`${order.id}/`)) return json(res, 400, { error: "Lokasi bukti tidak valid." });
    if (!["waiting_payment", "review"].includes(order.status)) return json(res, 409, { error: "Status pesanan tidak menerima bukti." });

    const { error: updateError } = await db.from("orders").update({ proof_path: storagePath, status: "review", updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) throw updateError;
    const ownerId = process.env.TELEGRAM_OWNER_ID;
    if (ownerId && process.env.TELEGRAM_BOT_TOKEN) {
      const { data: file, error: downloadError } = await db.storage.from("payment-proofs").download(storagePath);
      if (downloadError) throw downloadError;
      const form = new FormData();
      form.append("chat_id", ownerId);
      form.append("caption", `📦 BUKTI PEMBAYARAN\n\nID: ${order.order_code}\nProduk: ${order.product_name}\nUsername: ${order.roblox_username}\nJumlah: ${order.followers} Followers\nTotal: Rp${Number(order.amount).toLocaleString("id-ID")}\nStatus: MENUNGGU ACC`);
      form.append("photo", file, "bukti-pembayaran");
      const photoRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });
      const photoData = await photoRes.json();
      if (!photoRes.ok || !photoData.ok) throw new Error("Telegram gagal menerima bukti.");
      await telegram("sendMessage", {
        chat_id: ownerId,
        text: `Kontrol pesanan ${order.order_code}`,
        reply_markup: { inline_keyboard: [[
          { text: "✅ ACC", callback_data: `acc:${order.order_code}` },
          { text: "❌ TOLAK", callback_data: `reject:${order.order_code}` }
        ]] }
      });
    }
    return json(res, 200, { ok: true, status: "review" });
  } catch (error) {
    console.error("confirm-proof:", error.message);
    return json(res, 500, { error: "Bukti tersimpan, tetapi notifikasi admin mungkin gagal. Hubungi admin." });
  }
}
