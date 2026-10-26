# HCPL Season 3 — Harshit Cup Chhimauli Premier League

Premium React/Vite frontend and Express API for player registration and Razorpay payment verification.

## Requirements
- Node.js 20 or newer recommended
- MongoDB Atlas (or local MongoDB)
- Razorpay account/API keys (use test keys during development)

## Run the frontend
From the project root:

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The Vite development server proxies `/api` requests to `http://localhost:5000`.

## Run the API
Open a second terminal:

```bash
cd api
npm install
```

Copy `api/.env.example` to `api/.env` and fill in your MongoDB connection string and Razorpay **test** keys. Then run:

```bash
npm run dev
```

The API listens on port 5000 by default. Check `http://localhost:5000/api/health` to confirm it is running.

Required environment variables in `api/.env`:
- `MONGODB_URI`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLIENT_ORIGIN=http://localhost:5173`
- `PORT=5000` (optional; 5000 is the default)

## Registration and payment flow
1. The form validates the player's name, Indian mobile number, date of birth, address, Hamirpur district eligibility and consent.
2. The API stores the registration with payment status `pending`.
3. The API creates a Razorpay order for ₹700 (70,000 paise).
4. Razorpay Checkout opens in the browser.
5. The API verifies the payment signature server-side before marking the registration `paid`.

If MongoDB or Razorpay credentials are not configured, the form will not falsely report a confirmed registration; it will show an error and retain the registration ID if one was created.

## Before accepting real registrations
- Test the full flow using Razorpay test keys and test payments first.
- Switch to live keys only after the committee approves launch.
- Configure HTTPS, production `CLIENT_ORIGIN`, MongoDB network access and a strong database password.
- Confirm tournament dates, eligibility wording, rules and organizer contact details with the committee.
- Add an authenticated admin dashboard before exposing player records to committee members.
- Never commit `api/.env` or share payment secrets. This starter does not yet include admin login, exports, refunds or automated reconciliation.


## CricAuction player export and public photos

- The admin dashboard now includes **Export CricAuction Excel**, which writes CricAuction's 28 exact column headers and a public `PHOTO` URL for each registration that has a saved compressed WebP photo.
- The API exposes only the compressed image bytes at `GET /api/player-photo/:id`; it does not return registration details from that endpoint. Anyone with the URL can view that player's photo, which is necessary for CricAuction to fetch it. Only export metadata is admin-protected.
- In the backend deployment environment, set `PUBLIC_API_BASE_URL` to the public HTTPS origin of the API, with no trailing slash (for example `https://your-api-host.example.com`). If the frontend and API are on different domains, do not rely on the fallback host detection.
- Install the spreadsheet dependency from the project root with `npm install`; then build/test with `npm run build`.
- Existing registrations created before photo storage was added may have no photo. Their `PHOTO` cell will be blank and they need a new photo uploaded if required.
- Photo URLs require the backend to be publicly reachable over HTTPS. Test one exported photo URL in a private browser window before importing the spreadsheet.
