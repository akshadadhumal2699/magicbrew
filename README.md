# Magic Brew Café – QR Menu & Ordering

    npm install
    npm start

- Customer menu: http://localhost:3000
- Admin panel:   http://localhost:3000/admin.html (default password `magicbrew123`)

Set `ADMIN_PASSWORD` before starting to change the password:
PowerShell: `$env:ADMIN_PASSWORD="yourpass"; npm start`

## First-time setup (Admin > Settings)
1. Owner WhatsApp number (country code, e.g. 919876543210)
2. UPI ID (a QR with the exact bill amount is generated per order) and/or upload your own payment QR
3. Public menu URL once deployed, then print the QR from Admin > Café QR

## WhatsApp
Without credentials, the customer gets a "Send on WhatsApp" button that opens a pre-filled message to the owner (one tap to send).
For fully automatic messages, set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID (Meta WhatsApp Cloud API). Note: Meta only allows free-form
messages to a number that messaged your business number in the last 24h; otherwise you need an approved template.

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
