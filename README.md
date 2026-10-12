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

## 4-digit PIN login (no typing)
Set `ADMIN_PIN` (exactly 4 digits, e.g. `4821`) in Vercel > Environment Variables and redeploy. The login page shows a number keypad; the phone stays logged in for 30 days.
5 wrong tries lock login for 15 minutes.


## SMS alert to the chef (optional)
Every new order can also send an SMS (order no., table, items, total) to the number saved in Admin > Settings > SMS alert.
Indian rules (TRAI DLT) require a registered sender ID and an approved message template for business SMS, so first create an account with an Indian SMS provider and complete DLT registration.
Then set these in Vercel > Environment Variables and redeploy:
- `SMS_PROVIDER` = `fast2sms` or `msg91`
- `SMS_API_KEY` = the provider's API/auth key
- `SMS_TEMPLATE_ID` = the approved template id (MSG91: required; Fast2SMS: required for the DLT route, leave empty to use its non-DLT "quick" route)
- `SMS_SENDER_ID` = your DLT sender id (Fast2SMS DLT route)
The template needs four variables in this order: order number, table number, items, total. Example text:
`New order #{#var#} Table {#var#}: {#var#}. Total Rs {#var#}`
SMS failures never stop an order from being placed; they are logged in the Vercel function logs.


## Orders to the owner's WhatsApp (automatic)
When a customer taps Place Order, the server saves the order and sends it to the owner's WhatsApp through the WhatsApp Business Cloud API. Nothing happens on the customer's phone. Each order is its own message: order no., table, customer name + mobile, items with quantities, total.
Setup (one time, Meta):
1. developers.facebook.com > create an app (type Business) > add the WhatsApp product, and connect a WhatsApp Business account with a phone number that is NOT already used in the normal WhatsApp app.
2. Create a permanent System User access token (whatsapp_business_messaging permission). Copy the token and the Phone number ID.
3. Create a message template (category Utility) with 6 variables and wait for approval, e.g.
   `New order #{{1}} | Table {{2}}
Customer: {{3}} ({{4}})
Items: {{5}}
Total: {{6}}`
4. In Vercel > Environment Variables add `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE_NAME` (and `WHATSAPP_TEMPLATE_LANG`, default `en`), then redeploy.
5. Admin > Settings: enter the owner's number. Settings shows whether the last send worked, or Meta's error message.
Without a template, only free text is sent, and Meta delivers that only if the owner messaged the business number within the last 24 hours.
