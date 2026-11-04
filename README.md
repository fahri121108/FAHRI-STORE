# Fahri Store — Website + Telegram Order System

Starter project untuk website HTML/CSS/JavaScript di Vercel dengan database Supabase dan notifikasi Telegram.

## Yang sudah tersedia
- Landing page responsif tema hitam/abu-abu/putih.
- Form order Followers Roblox dengan pilihan paket.
- Pembuatan order melalui Vercel API.
- Upload bukti pembayaran ke Supabase Storage private bucket.
- Notifikasi foto bukti ke Telegram owner (setelah konfigurasi).
- Tombol ACC, TOLAK, PROSES, DONE, BATAL melalui Telegram webhook.
- Cek status pesanan menggunakan kode order.

## Penting sebelum digunakan
1. QRIS masih berupa placeholder. Pasang QRIS resmi milik toko sebelum menerima pembayaran.
2. Harga paket di `public/app.js` dan `api/_lib.js` adalah draft dari daftar harga lama. Periksa dan samakan sebelum deploy.
3. Sistem ini memverifikasi bukti secara manual oleh owner; upload bukti bukan bukti pembayaran valid.
4. Belum ada pembayaran QRIS otomatis. Status `paid` hanya berubah setelah owner menekan ACC.
5. Jangan meminta password Roblox atau OTP pelanggan.
6. Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY`, token bot, atau webhook secret ke file `public/`.

## Setup singkat

### A. Supabase
1. Buat project di https://supabase.com/
2. Buka SQL Editor dan jalankan `sql/schema.sql`.
3. Dari Project Settings > API, salin Project URL dan `service_role` key.
4. Bucket `payment-proofs` dibuat oleh SQL sebagai private bucket.

### B. Telegram
1. Buat bot melalui akun resmi BotFather.
2. Simpan bot token sebagai `TELEGRAM_BOT_TOKEN`.
3. Kirim `/start` ke bot dari akun owner, lalu dapatkan Telegram numeric user ID melalui bot ID checker tepercaya atau endpoint `getUpdates` milik bot sendiri. Jangan bagikan token.
4. Isi `TELEGRAM_OWNER_ID`.
5. Buat secret acak panjang untuk `TELEGRAM_WEBHOOK_SECRET`.

### C. Vercel
1. Upload project ke GitHub atau import folder project ke Vercel.
2. Tambahkan Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_OWNER_ID`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `SITE_URL`
3. Deploy project.
4. Atur webhook Telegram ke:
   `https://api.telegram.org/bot<TOKEN>/setWebhook`
   dengan parameter `url=https://DOMAIN-VERCEL/api/telegram-webhook` dan `secret_token` sama dengan `TELEGRAM_WEBHOOK_SECRET`.
   Gunakan POST form-urlencoded/JSON dari tool/API tepercaya; jangan taruh token di frontend.

## Menambahkan gambar QRIS
Ganti placeholder di `public/index.html` pada bagian `.qris-placeholder` dengan gambar QRIS resmi yang sudah kamu pastikan benar. Simpan file gambar di `public/assets/qris.png`, lalu ubah markup agar menampilkan `/assets/qris.png`.

## Mengubah harga
Samakan daftar paket di:
- `public/app.js` → `PRICE_TIERS`
- `api/_lib.js` → `priceFor()`

Harga harus sama di frontend dan backend. Backend tetap menjadi sumber validasi harga.

## Catatan pengembangan berikutnya
- Tambahkan dashboard statistik admin yang memanggil endpoint khusus owner.
- Tambahkan antrean berdasarkan waktu order yang sudah berstatus `paid`.
- Tambahkan notifikasi status ke pelanggan (butuh kanal kontak yang disetujui pelanggan).
- Tambahkan rate limiting/CAPTCHA dan proteksi spam sebelum dipublikasikan.
- Untuk produksi, tambahkan pengiriman pesan status ke customer dengan mekanisme opt-in.
