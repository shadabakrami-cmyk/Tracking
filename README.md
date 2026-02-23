# Oceanio Tracker

A full-stack MVP shipment tracking app using the [Oceanio API](https://api.oceanio.com).  
Track shipments by Bill of Lading, Booking Reference, or Container Number.

## Prerequisites

- **Node.js** v18+ and **npm**
- An Oceanio API account (Client ID, Client Secret, and API Key)

## Getting Started

### 1. Install Dependencies

```bash
# From the project root
npm install          # installs concurrently
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Run the App

```bash
npm run dev
```

This starts both:
- **Backend proxy** on `http://localhost:4000`
- **Frontend** on `http://localhost:3000`

### 3. Connect

1. Open `http://localhost:3000`
2. Enter your Oceanio **Client ID**, **Client Secret**, and **API Key**
3. Click **Connect** to generate an access token
4. Click **Start Tracking** to proceed

### 4. Track a Shipment

- Select the reference type (Bill of Lading, Booking Number, or Container Number)
- Enter the reference number
- Click **Track Shipment**

Results appear in a split view: parsed timeline on the left, raw JSON on the right.

## Getting Oceanio Credentials

Visit [oceanio.com](https://oceanio.com) to register for an API account and obtain your Client ID, Client Secret, and API Key.

## Project Structure

```
Multi_tracker/
├── server/           # Express proxy (port 4000)
│   ├── index.js
│   ├── package.json
│   └── .env
├── client/           # React + Vite + Tailwind (port 3000)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── AuthScreen.jsx
│   │       ├── TrackingScreen.jsx
│   │       ├── DCSAView.jsx
│   │       └── EventBadge.jsx
│   ├── index.html
│   └── vite.config.js
├── package.json      # Root: concurrently dev script
└── README.md
```

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS v4
- **Backend:** Node.js, Express
- **API:** Oceanio DCSA-compliant tracking API
