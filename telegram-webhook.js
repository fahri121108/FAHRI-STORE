import { supabaseAdmin, json, telegram } from "../lib/server.js";

const labels = { paid: "Pembayaran diterima", rejected: "Pembayaran ditolak", processing: "Sedang diproses", completed: "Pesanan selesai", cancelled: "Pesanan dibatalkan" };

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method tidak diizinkan." });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers["x-telegram-bot-api-secret-token"] !== secret) return json(res, 401, { error: "Unauthorized." });

  try {
    const update = req.body || {};
    const query = update.callback_query;
    if (!query) return json(res, 200, { ok: true });

    const ownerId = String(process.env.TELEGRAM_OWNER_ID || "");
    if (String(query.from?.id) !== ownerId) {
      await telegram("answerCallbackQuery", { callback_query_id: query.id, text: "Akses ditolak.", show_alert: true });
      return json(res, 200, { ok: true });
    }
    const [action, code] = String(query.data || "").split(":");
    const actions = {
      acc: { status: "paid", buttons: [["🔄 PROSES", `process:${code}`], ["❌ BATAL", `cancel:${code}`]] },
      reject: { status: "rejected", buttons: [] },
      process: { status: "processing", buttons: [["✅ DONE", `done:${code}`], ["❌ BATAL", `cancel:${code}`]] },
      done: { status: "completed", buttons: [] },
      cancel: { status: "cancelled", buttons: [] }
    };
    const selected = actions[action];
    if (!selected) {
      await telegram("answerCallbackQuery", { callback_query_id: query.id, text: "Aksi tidak dikenal." });
      return json(res, 200, { ok: true });
    }

    const db = supabaseAdmin();
    const { data: order, error: findError } = await db.from("orders").select("id,status,order_code").eq("order_code", code).single();
    if (findError || !order) throw new Error("Order tidak ditemukan.");
    const allowed = {
      acc: ["review"], reject: ["review"], process: ["paid"], done: ["processing"], cancel: ["paid", "processing"]
    };
    if (!allowed[action].includes(order.status)) {
      await telegram("answerCallbackQuery", { callback_query_id: query.id, text: "Status sudah berubah atau aksi tidak sesuai.", show_alert: true });
      return json(res, 200, { ok: true });
    }
    const { error: updateError } = await db.from("orders").update({ status: selected.status, updated_at: new Date().toISOString() }).eq("id", order.id).eq("status", order.status);
    if (updateError) throw updateError;
    await db.from("order_events").insert({ order_id: order.id, from_status: order.status, to_status: selected.status, actor: "owner" });

    const keyboard = selected.buttons.length ? { inline_keyboard: [selected.buttons.map(([text, callback_data]) => ({ text, callback_data }))] } : { inline_keyboard: [] };
    await telegram("editMessageReplyMarkup", { chat_id: query.message.chat.id, message_id: query.message.message_id, reply_markup: keyboard });
    await telegram("answerCallbackQuery", { callback_query_id: query.id, text: labels[selected.status] });
    await telegram("sendMessage", { chat_id: ownerId, text: `✅ ${code}\nStatus baru: ${labels[selected.status]}` });
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error("telegram-webhook:", error.message);
    return json(res, 500, { error: "Gagal memproses aksi Telegram." });
  }
}
