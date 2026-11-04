import { supabaseAdmin, json, method } from "../lib/server.js";

const labels = {
  waiting_payment: "Menunggu pembayaran",
  review: "Menunggu verifikasi admin",
  rejected: "Pembayaran ditolak",
  paid: "Pembayaran diterima",
  processing: "Sedang diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan"
};
export default async function handler(req, res) {
  if (!method(req, res, "GET")) return;
  try {
    const code = String(req.query.code || "").trim().toUpperCase();
    if (!/^FS-[A-Z0-9]{6}$/.test(code)) return json(res, 400, { error: "Format kode pesanan tidak valid." });
    const db = supabaseAdmin();
    const { data, error } = await db.from("orders").select("order_code,product_name,followers,amount,status").eq("order_code", code).single();
    if (error || !data) return json(res, 404, { error: "Pesanan tidak ditemukan." });
    return json(res, 200, { orderCode: data.order_code, productName: data.product_name, followers: data.followers, amount: data.amount, status: data.status, statusLabel: labels[data.status] || data.status });
  } catch (error) {
    console.error("order-status:", error.message);
    return json(res, 500, { error: "Tidak bisa memeriksa pesanan." });
  }
}
