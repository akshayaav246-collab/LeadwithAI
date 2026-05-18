# Lead with AI — Full Stack Application

> **"Lead with AI: Adopt, Implement and Transform"**  
> A 2-day professional AI program hosted by **Global Knowledge Technologies** on **May 30th and 31st**, offering hands-on learning in Generative AI for students and working professionals.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [System Architecture](#system-architecture)
5. [Workflow Diagrams](#workflow-diagrams)
6. [Pages & Features](#pages--features)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Authentication & Security](#authentication--security)
10. [Email System](#email-system)
11. [Admin Panel](#admin-panel)
12. [Environment Variables](#environment-variables)
13. [Getting Started](#getting-started)
14. [Design System](#design-system)

---

## Overview

**Lead with AI** is a full-stack event registration portal for a 2-day hands-on AI program. It combines a luxury-editorial frontend with a Node.js/Express backend to deliver:

- Animated public marketing site with program details, speaker bios, and curriculum
- **College email domain restriction** for students (`.ac.in`, `.edu.in`, `.edu` only)
- OTP-based passwordless auth with **separate emails** for verification vs. login
- **Forensic AI-powered student ID card scanning** (Google Gemini 2.5 Flash) to auto-fill college details, specifically designed to reject digital mockups, screenshots, and AI-generated fakes.
- **Persistent Marketing Attribution**: Captures `?ref=CODE` tracking parameters globally using session/local storage across page navigations.
- **Mandatory Session Feedback & Certificate Generation**: Users must submit text feedback for four distinct training sessions to unlock the client-side dynamic certificate generation system.
- Integrated **Razorpay payment gateway** (₹500 for students / ₹999 for professionals)
- Secure admin panel with user search/filter, comprehensive CSV exports, dynamic certificate preview, and bulk email
- Automated transactional emails: verification OTP, login OTP, registration confirmation, payment receipt with `.ics` calendar, and Day 1 & Day 2 reminder emails
- **OTP rate limiting** via `express-rate-limit` to prevent brute-force and SMTP abuse

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
| Icons | Lucide React + React Icons |
| Fonts | Playfair Display, EB Garamond, DM Sans (Google Fonts) |
| Utilities | HTML2Canvas, jsPDF (Certificate Generation) |

### Backend

| Category | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Authentication | JWT (jsonwebtoken) + bcryptjs OTP hashing |
| Rate Limiting | express-rate-limit |
| Payments | Razorpay SDK |
| File Uploads | Multer (JPEG / PNG only, max 3 MB) |
| AI OCR | Google Gemini 2.5 Flash (`@google/genai`) |
| Email | Nodemailer (SMTP — Microsoft Outlook) |
| Cron Jobs | node-cron (reminder emails) |

---

## Project Structure

```
Next-Lead/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT auth middleware (user)
│   │   │   └── adminAuth.js           # JWT auth middleware (admin)
│   │   ├── models/
│   │   │   ├── User.js                # Mongoose User schema + OTP + Feedback methods
│   │   │   └── Admin.js               # Admin credentials model
│   │   ├── routes/
│   │   │   ├── auth.js                # Registration, OTP, login, ID parse
│   │   │   ├── payment.js             # Razorpay order + verify
│   │   │   └── admin.js               # Stats, users, bulk email
│   │   └── utils/
│   │       └── email.js               # All Nodemailer email templates
│   ├── uploads/                       # Uploaded ID card images (gitignored)
│   ├── index.js                       # Express entry point + rate limiters + cron
│   ├── .env                           # Backend secrets (gitignored)
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── Logo.png                   # Main site logo
│   │   ├── LogoAdmin.png              # Admin sidebar logo
│   │   ├── CertificateTemplate.png    # Certificate background template
│   │   └── ...                        # Speaker images, brochure, favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── SixThings.tsx
│   │   │   ├── Autocomplete.tsx       # College autocomplete
│   │   │   └── ScrollToTop.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Global auth state (JWT + user)
│   │   │   ├── lib/
│   │   │   ├── api.ts                 # Fetch wrapper with env-aware base URL
│   │   │   └── assets.ts              # publicAsset() helper for /public files
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Program.tsx
│   │   │   ├── Speakers.tsx
│   │   │   ├── Register.tsx           # Multi-step: OTP → Form → AI scan → Payment
│   │   │   ├── Profile.tsx            # Attendee profile + Feedback + Certificate
│   │   │   └── admin/
│   │   │       ├── AdminLogin.tsx
│   │   │       ├── AdminLayout.tsx    # Sidebar with LogoAdmin.png
│   │   │       ├── AdminOverview.tsx
│   │   │       ├── AdminUsers.tsx     # Registrant table + CSV export
│   │   │       └── AdminEmail.tsx
│   │   ├── index.css                  # Full design system
│   │   ├── admin.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## System Architecture

```mermaid
graph TB
    subgraph Browser["Browser"]
        SPA["React 19 SPA"]
        AC["AuthContext\n(JWT + user)"]
        Cert["Dynamic Certificate Generator"]
    end

    subgraph Backend["Express Backend"]
        RL["Rate Limiters\n(express-rate-limit)"]
        subgraph Routes["API Routes"]
            AUTH["/api/auth\nOTP · Register · Login · parse-id · feedback"]
            PAY["/api/payment\ncreate-order · verify"]
            ADMIN_R["/api/admin\nStats · Users · Bulk Email"]
        end
        CRON["node-cron\nDay1 + Day2 reminder emails"]
        RL --> Routes
    end

    subgraph DB["MongoDB Atlas"]
        USERS["users collection"]
    end

    subgraph External["External Services"]
        GEMINI["Google Gemini 2.5 Flash\n(Forensic ID Verification)"]
        RZP["Razorpay\n(Payment Gateway)"]
        SMTP["Nodemailer / Outlook SMTP"]
    end

    Browser -- "Bearer JWT" --> Backend
    Routes --> DB
    AUTH --> GEMINI
    PAY --> RZP
    AUTH --> SMTP
    PAY --> SMTP
    ADMIN_R --> SMTP
    CRON --> SMTP
    CRON --> DB
```

---

## Workflow Diagrams

### Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Register.tsx
    participant BE as /api/auth
    participant DB as MongoDB
    participant Mail as Nodemailer

    User->>FE: Enter college email (students: .ac.in / .edu.in enforced)
    FE->>BE: POST /send-register-otp
    BE->>DB: Check if email exists
    alt Email already registered
        BE-->>FE: 409 "User already exists"
    else New email
        BE->>BE: Generate OTP (in-memory Map, 10 min TTL)
        BE->>Mail: sendVerificationOtpEmail()
        Mail-->>User: "Your OTP for Email Verification"
    end

    User->>FE: Enter OTP
    FE->>BE: POST /verify-register-otp
    BE->>BE: Validate OTP & expiry → add to verifiedEmails Set

    User->>FE: Fill form + upload ID card
    FE->>BE: POST /parse-id (AI scan)
    alt Gemini validates Forensic checks
        BE->>BE: Extract college, course, year → auto-fill form
    else Invalid / Mockup / Fake
        BE-->>FE: Error → "The ID is not valid" (Generic rejection)
    end

    FE->>BE: POST /register (multipart + referral code)
    BE->>DB: Create User 
    BE->>Mail: sendRegistrationEmail() (async)
    BE-->>FE: 201 { token, user }
    FE-->>User: "Registered! Complete Payment" + Pay button
```

---

### Payment Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Profile.tsx / Register.tsx
    participant BE as /api/payment
    participant RZP as Razorpay
    participant DB as MongoDB
    participant Mail as Nodemailer

    User->>FE: Click "Pay ₹500 / ₹999"
    FE->>BE: POST /create-order (JWT)
    BE->>RZP: Create order
    RZP-->>BE: { orderId, amount }
    BE-->>FE: { orderId, keyId, prefill }

    FE->>RZP: Open Checkout modal
    User->>RZP: Pay
    RZP-->>FE: { razorpay_order_id, razorpay_payment_id, razorpay_signature }

    FE->>BE: POST /verify (JWT)
    BE->>BE: HMAC-SHA256 signature validation
    BE->>DB: paymentStatus = "confirmed"
    BE->>Mail: sendPaymentConfirmationEmail() + .ics calendar
    BE-->>FE: 200 "Payment confirmed"
```

---

## Pages & Features

### Public Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Hero, Six Core Takeaways grid, schedule, CTA |
| `/program` | `Program.tsx` | Full 2-day curriculum breakdown |
| `/speakers` | `Speakers.tsx` | Speaker bio cards |
| `/register` | `Register.tsx` | Multi-step: email OTP → form + AI ID scan → payment |
| `/profile` | `Profile.tsx` | Attendee profile, Payment gate, Feedback, Certificate Generator |

### Register.tsx — Key Features

- **College email domain guard** (students): enforces `.ac.in`, `.edu.in`, `.edu` both client-side and server-side
- **Separate OTP emails**: Verification OTP vs Login OTP
- **Forensic AI ID scan**: Uploads JPEG/PNG to `/api/auth/parse-id` (Max 3MB); Gemini extracts data and rejects digital fakes.
- **Persistent Marketing Attribution**: Automatically captures `?ref=CODE` and assigns it to the user.
- **Tiered pricing**: Students pay ₹500, working professionals pay ₹999.

### Profile.tsx — Key Features

- Shows registered event, payment status, Zoom link (post-payment).
- **Session Feedback System**: Users must provide text feedback for 4 distinct training sessions after the event.
- **Dynamic Certificate Generator**: Once feedback is submitted, users unlock the ability to generate and download their completion certificate with custom formatting and typography directly in the browser.

### Admin Panel (Protected)

| Route | Component | Description |
|---|---|---|
| `/admin/login` | `AdminLogin.tsx` | Admin email + password login |
| `/admin/dashboard` | `AdminOverview.tsx` | Stats: total, paid, revenue, recent sign-ups |
| `/admin/users` | `AdminUsers.tsx` | Full registrant table + advanced CSV export |
| `/admin/email` | `AdminEmail.tsx` | Bulk email composer |

**Admin Dashboard Key Features:**
- **Advanced CSV Export**: Exports comprehensive user data including marketing referral codes, ID paths, payment IDs, and form submissions.
- **Dynamic Certificate Preview**: Internal tooling to test and preview the final certificate layout and coordinates.

---

## API Reference

> **Base URL (dev):** `http://localhost:4000`  
> **Protected routes:** `Authorization: Bearer <JWT>`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/send-register-otp` | None | Check email uniqueness + domain → send verification OTP |
| `POST` | `/verify-register-otp` | None | Verify OTP; marks email eligible for registration |
| `POST` | `/parse-id` | None | Upload ID card (JPEG/PNG, max 3 MB); Gemini forensic validation & extraction |
| `POST` | `/register` | None | Create account (requires verified email); saves `referralCode` |
| `POST` | `/send-otp` | None | Send login OTP to existing user |
| `POST` | `/verify-otp` | None | bcrypt OTP verify → JWT |
| `GET` | `/me` | ✅ JWT | Full user profile |
| `POST` | `/submit-feedback` | ✅ JWT | Submit session feedback (updates `feedback` and `isFeedbackSubmitted`) |

### Payment — `/api/payment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | ✅ JWT | Creates Razorpay order |
| `POST` | `/verify` | ✅ JWT | HMAC-SHA256 verify → marks payment confirmed; sends receipt email |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | None | Admin login → admin JWT (24h) |
| `GET` | `/stats` | ✅ Admin | Total users, paid count, 5 recent sign-ups |
| `GET` | `/users` | ✅ Admin | All registrants including `referralCode`, `feedback`, `isPaid` |
| `GET` | `/users/:id` | ✅ Admin | Single user detail |
| `DELETE` | `/users/:id` | ✅ Admin | Delete a user |
| `POST` | `/send-email` | ✅ Admin | Bulk email to `all` / `paid` / `custom` list |

---

## Database Schema

### `User` Collection

```js
{
  fullName:   String (required, trimmed),
  email:      String (unique, lowercase),
  phone:      String (required),
  userType:   "student" | "working",

  // Student-only
  collegeName:      String,
  course:           String,
  year:             String,           // e.g. "3rd Year"
  idCardPath:       String,           // filename in /uploads

  // Working professional-only
  domain:       String,
  organization: String,

  // OTP login (cleared after use)
  otpHash:    String,   // bcrypt hash
  otpExpiry:  Date,     // 10-min TTL

  // Registration metadata
  heardFrom:    String,
  isWaitlisted: Boolean,
  referralCode: String,

  // Session Feedback System
  feedback: [{
    session: String,
    text:    String
  }],
  isFeedbackSubmitted: Boolean,

  // Events
  registeredEvents: [{
    eventName:         String,
    razorpayOrderId:   String,
    razorpayPaymentId: String,
    paymentStatus:     "pending" | "confirmed" | "failed",
    registeredAt:      Date,
  }],

  createdAt: Date,
  updatedAt: Date,
}
```

---

## Authentication & Security

### Registration — 3-Step

1. `POST /send-register-otp` — validates email uniqueness + domain; stores OTP in in-memory Map (10 min TTL)
2. `POST /verify-register-otp` — validates OTP; adds to `verifiedEmails` Set
3. `POST /register` — rejects if email not in Set; creates user; clears email from Set

### Login — 2-Step

1. `POST /send-otp` → bcrypt-hashed OTP stored in MongoDB
2. `POST /verify-otp` → `bcrypt.compare()` + expiry check → JWT (30 days), OTP cleared from DB

### OTP Rate Limiting

| Route | Limit | Window |
|---|---|---|
| `send-otp`, `send-register-otp` | 5 requests | 15 min |
| `verify-otp`, `verify-register-otp` | 10 attempts | 15 min |
| `register` | 3 attempts | 1 hour |

---

## Email System

All emails sent via Nodemailer (SMTP) asynchronously (non-blocking).

| Function | Trigger | Type | Notes |
|---|---|---|---|
| `sendVerificationOtpEmail()` | Registration email OTP | HTML | "Your OTP for Email Verification" — no name |
| `sendOtpEmail()` | Login OTP | HTML | "Your Login OTP, [FirstName]" |
| `sendRegistrationEmail()` | Account created | Plain text | Welcome + payment reminder |
| `sendPaymentConfirmationEmail()` | Payment verified | HTML | Receipt + `.ics` Google Calendar attachment |
| `sendCustomBulkEmail()` | Admin bulk send | HTML | All / Paid / Custom |
| `sendReminderEmail()` | Cron — Day before event | HTML | Zoom link to paid users |
| `sendDay2ReminderEmail()` | Cron — End of Day 1 | HTML | Day 2 reminder to paid users |

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/LeadWithAI
MONGO_DB_NAME=LeadWithAI
COLLECTION_NAME=Users

JWT_SECRET=<strong_random_secret>

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<razorpay_secret>

SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=events@yourdomain.com
SMTP_PASS=<smtp_password>
FROM_EMAIL=events@yourdomain.com
FROM_NAME=Lead with AI

GEMINI_API_KEY=<gemini_api_key>

SITE_URL=https://project.globalknowledgetech.com/leadwithAI
ZOOM_LINK=https://zoom.us/j/00000000000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
```

> ⚠️ **Never commit `.env` files.** Both are in `.gitignore`.

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas (or local MongoDB)
- Razorpay account (test or live)
- Google Gemini API key
- SMTP email account

### Installation

```bash
git clone https://github.com/akshayaav246-collab/LeadwithAI.git
cd LeadwithAI

cd backend && npm install
cd ../frontend && npm install
```

### Run Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Design System

Bespoke luxury-editorial CSS in `frontend/src/index.css`:

**Color palette (CSS variables):**

| Variable | Value | Usage |
|---|---|---|
| `--color-cream` | `#FAF7F2` | Page background |
| `--color-linen` | `#F5F0E8` | Card backgrounds |
| `--color-sienna` | `#C4956A` | Primary accent, buttons, links |
| `--color-espresso` | `#3B2F2F` | Dark headings, navbar |
| `--color-umber` | `#6B4F3A` | Body text, hints |
| `--color-stone` | `#8C7B6B` | Labels, muted text |
| `--color-amber-deep` | `#966638` | Error/validation messages |

**Typography:** `Playfair Display` (headings) · `EB Garamond` (body) · `DM Sans` (UI)

---

## License

This project is private and proprietary to **Global Knowledge Technologies**. All rights reserved.