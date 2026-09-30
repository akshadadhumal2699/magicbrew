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

## Orders → owner's WhatsApp (one chat)
Every new order (and every "I've paid" report) is saved and then sent automatically to the owner's WhatsApp number from Admin > Settings. All
messages come from the same business number, so they all land in one chat, each order as a new message with a link that opens the dashboard on that order.
Statuses: New Order, Accepted, Preparing, Ready, Completed, Cancelled; customers see them live on their status screen.

Setup (Meta WhatsApp Cloud API, free test number available):
1. developers.facebook.com > create an app > add WhatsApp. Copy the **Phone number ID** and create a **permanent access token** (System User).
2. In Vercel set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`, then redeploy.
3. Admin > Settings: enter the owner WhatsApp number, tap "Send test message".

Important Meta rule: a free-form message only reaches the owner if the owner messaged the business number in the last 24 hours. To always reach them,
create a message template in WhatsApp Manager with ONE body variable (e.g. "New order: {{1}}"), get it approved, and set `WHATSAPP_TEMPLATE` (and
`WHATSAPP_TEMPLATE_LANG`, default `en`). The server falls back to it automatically. The dashboard's "Resend to WhatsApp" button re-sends any order.

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
