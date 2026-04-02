## Panchang Web (Drik)

This is a Next.js website for viewing a daily Panchang for any chosen civil date (00:00 → 24:00), including:

- The 5 Panchang elements: **Vara, Tithi, Nakshatra, Yoga, Karana** (with start/end date-times; shows multiple changes within the day)
- **Sunrise, Sunset, Moonrise, Moonset**
- Auspicious/inauspicious timings: **Rahu Kalam, Yamagandam, Gulika Kalam, Abhijit Muhurta, Brahma Muhurta, Durmuhurta, Varjyam, Amrit Kaal, Hora, Choghadiya**
- A 24h timeline visualization from midnight to midnight

### Calculation engine

Panchang calculations are done using **Swiss Ephemeris** via a small Python script (`server/panchang_calc.py`) that is called by the Next.js API route.

Supported ayanamsa options:
- Lahiri (default)
- KP (Krishnamurti)
- Raman
- Yukteshwar

## Getting Started

### 1) Install Node deps

```bash
npm install
```

### 2) Install Python deps

```bash
python3 -m pip install pyswisseph pytz timezonefinder --break-system-packages
```

### 3) Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Usage

1. Search for a city (uses OpenStreetMap Nominatim suggestions) or use **Use my location**
2. Pick any date using the date picker, or the previous/next buttons
3. Optionally change **Ayanamsa** in settings

## Deploy online (recommended: Docker hosting)

Because this app runs a Python Swiss Ephemeris script from the Next.js API route, the easiest “online” deployment is on a platform that supports **Docker**.

### Option A: Render.com (simple)

1. Push this folder to a GitHub repo
2. On Render: **New → Web Service → Build & deploy from a Git repo**
3. Choose **Runtime: Docker**
4. Set **Port = 3000**
5. Deploy

### Option B: Railway / Fly.io / any VM

Build & run:

```bash
docker build -t panchang-web .
docker run -p 3000:3000 panchang-web
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

> Note: this demo uses a Python runtime for Panchang calculations. For serverless deployments you may need a different approach (e.g., a dedicated backend service/container, or a pure-Node ephemeris binding).
