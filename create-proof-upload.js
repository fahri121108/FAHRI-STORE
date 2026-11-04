import { supabaseAdmin, json, method } from "../lib/server.js";

export default async function handler(req, res) {
  if (!method(req, res, "POST")) return;
  try {
    const { orderCode, accessToken, contentType } = req.body || {};
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json(res, 400, { error: "Format gambar tidak didukung." });
    const db = supabaseAdmin();
    const { data: order, error: findError } = await db.from("orders").select("id,access_token,status").eq("order_code", orderCode).single();
    if (findError || !order || order.access_token !== accessToken) return json(res, 403, { error: "Akses pesanan tidak valid." });
    if (!["waiting_payment", "review"].includes(order.status)) return json(res, 409, { error: "Pesanan tidak menerima bukti pembayaran lagi." });

    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${order.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from("payment-proofs").createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;
    return json(res, 200, { signedUrl: data.signedUrl, path: data.path || path, token: data.token });
  } catch (error) {
    console.error("create-proof-upload:", error.message);
    return json(res, 500, { error: "Tidak bisa menyiapkan upload bukti." });
  }
}
