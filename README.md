# Lead with AI — Full Stack Application

> **"Lead with AI: Adopt, Implement and Transform"**  
> A 2-day professional AI program hosted by **Global Knowledge Technologies**, offering hands-on learning in Generative AI for students and working professionals.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Pages & Features](#pages--features)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Authentication & Security](#authentication--security)
9. [Payment Flow](#payment-flow)
10. [AI-Powered ID Card Scanning](#ai-powered-id-card-scanning)
11. [Email System](#email-system)
12. [Admin Panel](#admin-panel)
13. [Environment Variables](#environment-variables)
14. [Getting Started](#getting-started)
15. [Available Scripts](#available-scripts)

---

## Overview

**Lead with AI** is a full-stack web application that serves as the marketing and registration platform for a 2-day hands-on AI program. It combines a luxury-editorial frontend with a robust Node.js/Express backend to deliver:

- A rich, animated public-facing marketing site with program details, speaker bios, and curriculum
- OTP-based passwordless authentication for attendees
- AI-powered student ID card scanning (using Google Gemini + Tesseract OCR fallback) to auto-fill registration details
- Integrated Razorpay payment gateway for ₹500 program fee collection
- A secure admin panel to view registrations, track payments, and send bulk emails
- Automated transactional emails (registration confirmation, login OTP, payment confirmation)

---

## Tech Stack

### Frontend

| Category | Technology |
|---|---|
| Framework | React 19 |
| Bundler | Vite 7 |
| Routing | Wouter 3 |
| Styling | Vanilla CSS (bespoke design system) |
| Animation | Framer Motion |
| Form Handling | React Hook Form + Zod |
| UI Primitives | Radix UI |
| Icons | Lucide React + React Icons |
| State/Data | TanStack React Query |
| Charts | Recharts |
| Fonts | Playfair Display, EB Garamond, DM Sans (Google Fonts) |

### Backend

| Category | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | MongoDB (via Mongoose 8) |
| Authentication | JWT (jsonwebtoken) + bcryptjs OTPs |
| Payments | Razorpay SDK |
| File Uploads | Multer |
| AI OCR (Primary) | Google Gemini 1.5 Flash (`@google/genai`) |
| OCR Fallback | Tesseract.js 7 + Sharp (image preprocessing) |
| Email | Nodemailer |
| PDF Parsing | pdf-parse, pdf2json |
| Excel Parsing | xlsx |

---

## Project Structure

```
Next-Lead/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── colleges.json          # 650+ college name dataset
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT auth middleware (user)
│   │   │   └── adminAuth.js           # JWT auth middleware (admin)
│   │   ├── models/
│   │   │   └── User.js                # Mongoose User schema
│   │   ├── routes/
│   │   │   ├── auth.js                # Registration, OTP, login, ID parse
│   │   │   ├── payment.js             # Razorpay order creation & verification
│   │   │   ├── data.js                # College search API
│   │   │   └── admin.js              # Admin stats, users, bulk email
│   │   ├── utils/
│   │   │   └── email.js               # Nodemailer email templates
│   │   ├── eng.traineddata            # Tesseract OCR language data (English)
│   │   └── index.js                   # Express app entry point
│   ├── uploads/                       # Uploaded ID card images (gitignored)
│   ├── .env                           # Backend environment variables (gitignored)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.tsx             # Global navigation bar
│   │   │   ├── Footer.tsx             # Global footer
│   │   │   ├── SixThings.tsx          # Interactive "Six Core Takeaways" grid
│   │   │   ├── Autocomplete.tsx       # Custom college autocomplete component
│   │   │   └── ScrollToTop.tsx        # Route-change scroll reset
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Global auth state (JWT + user data)
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Landing / hero page
│   │   │   ├── Program.tsx            # Curriculum & schedule
│   │   │   ├── Speakers.tsx           # Speaker bios
│   │   │   ├── Register.tsx           # Registration + payment flow
│   │   │   ├── Profile.tsx            # Attendee profile & certificate
│   │   │   ├── Certificate.tsx        # Certificate page
│   │   │   └── admin/
│   │   │       ├── AdminLogin.tsx     # Admin login page
│   │   │       ├── AdminLayout.tsx    # Admin shell + sidebar
│   │   │       ├── AdminOverview.tsx  # Dashboard stats
│   │   │       ├── AdminUsers.tsx     # Registrant table
│   │   │       └── AdminEmail.tsx     # Bulk email composer
│   │   ├── index.css                  # Full design system (tokens, utilities, components)
│   │   ├── admin.css                  # Admin panel styles
│   │   ├── App.tsx                    # Root router & layout
│   │   └── main.tsx                   # Vite entry point
│   ├── .env                           # Frontend environment variables (gitignored)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                       │
│                                                          │
│   React 19 + Vite SPA (frontend/)                        │
│   ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│   │  Marketing │ │ Register │ │ Profile  │ │  Admin  │  │
│   │   Pages    │ │   Flow   │ │  / Cert  │ │  Panel  │  │
│   └────────────┘ └──────────┘ └──────────┘ └─────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTP / REST (JSON)
                            │ Authorization: Bearer <JWT>
┌───────────────────────────▼──────────────────────────────┐
│              EXPRESS BACKEND (backend/)                   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │/api/auth │ │/api/pay  │ │/api/data │ │/api/admin │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘   │
│       │            │            │              │         │
│  ┌────▼────────────▼────────────▼──────────────▼──────┐  │
│  │              Mongoose ODM                           │  │
│  └────────────────────────┬────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │
       ┌────────────────────▼────────────────────┐
       │           MongoDB Atlas / Local          │
       │         Collections: users              │
       └─────────────────────────────────────────┘
                            
       External Services:
       ├── Google Gemini 1.5 Flash  (OCR for ID cards)
       ├── Tesseract.js + Sharp     (OCR fallback)
       ├── Razorpay                 (payment gateway)
       └── Nodemailer / SMTP        (transactional email)
```

---

## Pages & Features

### Public Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Hero section, "Six Core Takeaways" interactive grid with scroll-reveal animations, program highlights, day-wise schedule, and CTA buttons |
| `/program` | `Program.tsx` | Full 2-day curriculum breakdown, module-wise detail view with speaker attribution and "What you'll learn / build" sections |
| `/speakers` | `Speakers.tsx` | Speaker bio cards with profile images, designations, and expertise highlights |
| `/register` | `Register.tsx` | Multi-step registration form: OTP email verification → profile form (student/professional) with AI ID scan → Razorpay payment |
| `/profile` | `Profile.tsx` | Post-login attendee profile with registration status, payment status, and certificate access |

### Admin Panel (Protected)

| Route | Component | Description |
|---|---|---|
| `/admin/login` | `AdminLogin.tsx` | Admin credential login (email + password) |
| `/admin/overview` | `AdminOverview.tsx` | Dashboard: total registrations, paid users, recent sign-ups |
| `/admin/users` | `AdminUsers.tsx` | Full registrant table with search, filter by type (student/professional), and payment status |
| `/admin/email` | `AdminEmail.tsx` | Bulk email composer: send to all, paid-only, or custom recipient list |

### Key UI Components

- **`SixThings.tsx`** — Animated grid showcasing the 6 core program takeaways. Supports click-to-flip dark mode states, ghost numerals, staggered scroll reveals, navigation dots, and an "exploration progress" tracker.
- **`Autocomplete.tsx`** — Custom theme-aware college search dropdown with real-time API-backed filtering and support for saving new user-entered colleges to the database.
- **`NavBar.tsx`** — Sticky navigation with smooth scroll behavior and mobile responsiveness.
- **`AuthContext.tsx`** — Global React context providing `user`, `token`, `login()`, and `logout()` across the app.

---

## API Reference

> Base URL: `http://localhost:4000` (development)  
> All protected routes require: `Authorization: Bearer <JWT>`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/send-register-otp` | None | Send 6-digit OTP to email for new user verification |
| `POST` | `/verify-register-otp` | None | Verify OTP; marks email as eligible for registration |
| `POST` | `/parse-id` | None | Upload student ID card image/PDF; returns extracted college, course, year via AI OCR |
| `POST` | `/register` | None | Create user account with optional ID card upload; sends confirmation email |
| `POST` | `/send-otp` | None | Send login OTP to existing user's email |
| `POST` | `/verify-otp` | None | Verify login OTP; returns JWT token + user object |
| `GET` | `/me` | ✅ JWT | Returns full authenticated user profile |

#### `POST /api/auth/parse-id`

Accepts a `multipart/form-data` request with field `idCard` (JPEG/PNG/PDF, max 10 MB).

**Response:**
```json
{
  "college": "Sri Venkateswara College of Engineering",
  "course": "B.E(CSE)",
  "year": "3rd Year",
  "source": "gemini"
}
```
`source` is either `"gemini"` or `"tesseract"` (fallback).

---

### Payment — `/api/payment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | ✅ JWT | Creates a Razorpay order for ₹500; returns `orderId`, `keyId`, prefill data |
| `POST` | `/verify` | ✅ JWT | Verifies Razorpay HMAC signature; marks payment as `confirmed`; sends confirmation email |

#### `POST /api/payment/verify` Request Body

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "hmac_sha256_signature"
}
```

---

### Data — `/api/data`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/colleges?q=<query>` | None | Search college names (returns top 50 matches) |
| `POST` | `/colleges` | None | Add a new college name to the dataset |

---

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | None | Authenticate with admin email + password; returns admin JWT |
| `GET` | `/stats` | ✅ Admin JWT | Returns total users, paid users count, and 5 most recent registrations |
| `GET` | `/users` | ✅ Admin JWT | Returns all registrants with formatted details |
| `POST` | `/send-email` | ✅ Admin JWT | Send bulk HTML email to `all`, `paid`, or `custom` recipient set |

#### Admin Bulk Email Request Body

```json
{
  "subject": "Event Reminder",
  "htmlContent": "<h1>Hello!</h1>",
  "recipientType": "all",
  "customEmails": []
}
```
`recipientType` accepts: `"all"` | `"paid"` | `"custom"`

---

### Misc

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check — returns `{ status: "ok", timestamp }` |
| `GET` | `/uploads/:filename` | Serve uploaded ID card files statically |

---

## Database Schema

### `User` Collection

```js
{
  fullName:   String (required),
  email:      String (unique, lowercase),
  phone:      String,
  userType:   "student" | "working",

  // Student-only fields
  collegeName: String,
  course:      String,
  year:        String,       // e.g. "3rd Year"
  idCardPath:  String,       // filename in /uploads

  // Working professional-only
  domain:     String,        // e.g. "Software Engineering"

  // OTP auth
  otpHash:    String,        // bcrypt hash of 6-digit OTP
  otpExpiry:  Date,          // 10-minute TTL

  // Payment/Event tracking
  registeredEvents: [{
    eventName:        String,
    razorpayOrderId:  String,
    razorpayPaymentId: String,
    paymentStatus:    "pending" | "confirmed" | "failed",
    registeredAt:     Date,
  }],

  createdAt: Date,
  updatedAt: Date,
}
```

---

## Authentication & Security

The application uses a **passwordless OTP-based** authentication system:

### Registration Flow
1. User submits email → backend checks for duplicates → sends 6-digit OTP via email
2. User enters OTP → backend verifies & marks email as verified (10-min window)
3. User completes registration form → account created, JWT issued

### Login Flow
1. User submits email → backend finds account → sends 6-digit OTP
2. User enters OTP → bcrypt comparison against stored hash → JWT issued on success
3. OTP cleared from DB after use (one-time)

### JWT Details
- **Algorithm:** HS256
- **Expiry:** 30 days (user) / 1 day (admin)
- **Claims:** `{ userId }` (user) or `{ adminId, isAdmin: true }` (admin)
- **Transport:** `Authorization: Bearer <token>` header

---

## Payment Flow

```
Register.tsx
    │
    ├─1─▶ POST /api/payment/create-order
    │        └── Razorpay creates order (₹500 / 50000 paise)
    │        └── Returns orderId, keyId, user prefill
    │
    ├─2─▶ Razorpay Checkout SDK opens in browser
    │        └── User pays via UPI / Card / Net Banking
    │
    ├─3─▶ On payment success, frontend receives:
    │        razorpay_order_id, razorpay_payment_id, razorpay_signature
    │
    └─4─▶ POST /api/payment/verify
             └── HMAC-SHA256 signature validated
             └── User's event status → "confirmed"
             └── Payment confirmation email dispatched
```

---

## AI-Powered ID Card Scanning

When a student uploads their college ID card, the backend runs a two-tier extraction pipeline:

### Tier 1 — Google Gemini 1.5 Flash
- Image/PDF converted to base64
- Structured JSON prompt sent to Gemini Vision
- Extracts: `college`, `course`, `academicYearRange`

### Tier 2 — Tesseract.js + Sharp (Fallback)
- Triggered if Gemini fails or is unavailable
- Sharp preprocesses images (grayscale + normalize) for better OCR accuracy
- Regex patterns extract college name, course code, and academic range

### Year Calculation
Academic range (e.g. `"2022-2026"`) is dynamically resolved to the current year of study:
```
Enrolled: 2022  |  Graduating: 2026  |  Duration: 4 years
Current Year (2025) → Elapsed: 3 years → "3rd Year"
```

---

## Email System

Transactional emails are sent via **Nodemailer** using SMTP. Three email templates are implemented in `backend/src/utils/email.js`:

| Function | Trigger | Recipient |
|---|---|---|
| `sendOtpEmail()` | Registration OTP / Login OTP | Registrant |
| `sendRegistrationEmail()` | Successful account creation | Registrant |
| `sendPaymentConfirmationEmail()` | Razorpay payment verified | Registrant |
| `sendCustomBulkEmail()` | Admin bulk send | All / Paid / Custom |

All emails are sent asynchronously (non-blocking) after the primary response is returned.

---

## Admin Panel

The admin panel is a protected section of the same SPA, accessible only with admin credentials stored as environment variables.

**Features:**
- **Overview Dashboard** — Total registrations, paid count, revenue indicator, recent sign-up activity
- **User Table** — Searchable and filterable list of all registrants (name, email, phone, type, college/domain, payment status, registration date)
- **Bulk Email** — Compose rich HTML emails and dispatch to all registrants, only paid attendees, or a custom list

Admin JWT tokens expire in **24 hours**.

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=4000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/leadwithai

# JWT
JWT_SECRET=your_jwt_secret_key

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Lead with AI <noreply@leadwithai.com>"
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
```

> ⚠️ **Never commit `.env` files.** Both are listed in `.gitignore`.

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local or MongoDB Atlas)
- A **Razorpay** test/live account
- A **Google Gemini** API key
- An **SMTP** email account (e.g. Gmail App Password)

### Installation

```bash
# Clone the repository
git clone https://github.com/akshayaav246-collab/LeadwithAI.git
cd LeadwithAI

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configure Environment

```bash
# Copy and fill backend env
cp backend/.env.example backend/.env

# Copy and fill frontend env
cp frontend/.env.example frontend/.env
```

### Run Development Servers

```bash
# Terminal 1 — Start Backend
cd backend
npm run dev
# → http://localhost:4000

# Terminal 2 — Start Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Available Scripts

### Backend (`/backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload on changes) |
| `npm start` | Start in production mode |

### Frontend (`/frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server at `http://localhost:5173` |
| `npm run build` | Build production bundle to `dist/` |
| `npm run serve` | Preview the production build |
| `npm run typecheck` | Run TypeScript type-checking without emitting |

---

## Design System

The frontend uses a **bespoke luxury-editorial CSS design system** defined in `frontend/src/index.css`:

- **Color palette:** Warm beige (`#f5f0e8`) backgrounds, espresso (`#2c1a0e`) headings, amber-gold accents
- **Typography:** `Playfair Display` (display headings), `EB Garamond` (body text), `DM Sans` (UI/labels)
- **Animations:** Staggered scroll-reveal (Intersection Observer), Framer Motion page transitions, hover lift effects
- **Responsive:** Mobile-first breakpoints at 768px and 1024px

---

## License

This project is private and proprietary to **Global Knowledge Technologies**. All rights reserved.