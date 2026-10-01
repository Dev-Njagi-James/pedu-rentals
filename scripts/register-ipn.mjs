const base =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
const h = { Accept: "application/json", "Content-Type": "application/json" };

const auth = await fetch(`${base}/api/Auth/RequestToken`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({
    consumer_key: process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
  }),
}).then((r) => r.json());

if (!auth.token) {
  console.error("Auth failed:", auth);
  process.exit(1);
}

const out = await fetch(`${base}/api/URLSetup/RegisterIPN`, {
  method: "POST",
  headers: { ...h, Authorization: `Bearer ${auth.token}` },
  body: JSON.stringify({
    url: process.argv[2],
    ipn_notification_type: "GET",
  }),
}).then((r) => r.json());

console.log(out);
