# Magic Brew Café – QR Menu & Ordering

    npm install
    npm start

- Customer menu: http://localhost:3000
- Admin panel:   http://localhost:3000/admin.html (default password `magicbrew123`)

Set `ADMIN_PASSWORD` before starting to change the password:
PowerShell: `$env:ADMIN_PASSWORD="yourpass"; npm start`

## First-time setup (Admin > Settings)
1. Owner mobile number
2. UPI ID (a QR with the exact bill amount is generated per order) and/or upload your own payment QR
3. Public menu URL once deployed, then print the QR from Admin > Café QR

## Owner order notifications (no WhatsApp)
Orders are saved to the database and appear in the owner dashboard (/admin.html → Orders, refreshes every 8s with a beep).
For each new order the owner's phone gets a push notification; tapping it opens `/admin.html?order=1005&sig=…`, which signs the owner in and
highlights that order. Statuses: New Order, Accepted, Preparing, Ready, Completed, Cancelled; customers see them live on their status screen.

Notifications are free. The simplest is **phone push from the dashboard itself** (no app, no account, no env vars): open
`/admin.html` on the owner's phone → Settings → "Enable notifications on this phone". On iPhone first tap Share → Add to Home Screen and open it
from there. Alternatively (or additionally) set these as Vercel environment variables, then redeploy:
- **ntfy (easiest, no account):** install the free "ntfy" app (Android/iOS), subscribe to a long random topic name (e.g. `magicbrew-k8x2q9f7a1`),
  and set `NTFY_TOPIC` to the same name. Keep the topic secret.
- **Telegram:** message @BotFather → /newbot → copy the token to `TELEGRAM_BOT_TOKEN`. Message your bot once, open
  `https://api.telegram.org/bot<token>/getUpdates` and copy `chat.id` to `TELEGRAM_CHAT_ID`.

Also set the public URL in Admin > Settings so links use your real domain. Without either, orders are still saved and shown in the dashboard.

## Payments
UPI has no automatic confirmation without a payment gateway (Razorpay etc.). The customer taps "I've paid" (optionally entering the
transaction ID), the owner gets a WhatsApp message marked "awaiting owner verification", and marks the order Paid in Admin after
checking their bank/UPI app.

## Data
Stored in data/db.json; uploaded photos in uploads/. Back these up.

## Deploy on Vercel
1. Push this folder to a GitHub repo, then in Vercel: Add New > Project > import the repo (no build settings needed).
2. Project > Storage: add **Upstash Redis** (Marketplace) and **Blob**. This sets KV_REST_API_URL, KV_REST_API_TOKEN and BLOB_READ_WRITE_TOKEN automatically.
3. Project > Settings > Environment Variables: add `ADMIN_PASSWORD` (required in production) and optionally `SESSION_SECRET`.
4. Redeploy. Open https://<project>.vercel.app/admin.html, log in, set WhatsApp number and UPI ID in Settings.
5. Admin > Café QR now shows the QR for your live address — print it.
Do NOT set ADMIN_LOCAL_LOGIN on Vercel.

## Forgot password – email login code
Free via Resend: sign up at resend.com with the owner's email, create an API key, then set `RESEND_API_KEY` and `OWNER_EMAIL` (the same email you signed up with)
in Vercel and redeploy. On the login page tap "Forgot password? Email me a login code". You can also simply change `ADMIN_PASSWORD` in Vercel.

## 4-digit PIN login (no typing)
Set `ADMIN_PIN` (exactly 4 digits, e.g. `4821`) in Vercel > Environment Variables and redeploy. The login page shows a number keypad; the phone stays logged in for 30 days.
5 wrong tries lock login for 15 minutes.
