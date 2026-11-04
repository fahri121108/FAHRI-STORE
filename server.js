import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Konfigurasi Supabase belum lengkap.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").send(body);
}
export function method(req, res, expected) {
  if (req.method !== expected) { json(res, 405, { error: "Method tidak diizinkan." }); return false; }
  return true;
}
export function makeCode() {
  return "FS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
export function priceFor(followers) {
  const prices = {300:5000,600:10000,900:15000,1200:20000,1500:25000,2000:35000,3000:50000,5000:80000,10000:150000};
  return prices[Number(followers)] || null;
}
export async function telegram(methodName, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://api.telegram.org/bot${token}/${methodName}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || "Telegram API error.");
  return data.result;
}
export function isOwner(req) {
  const owner = String(process.env.TELEGRAM_OWNER_ID || "");
  return owner && String(req.headers["x-telegram-user-id"] || "") === owner;
}
