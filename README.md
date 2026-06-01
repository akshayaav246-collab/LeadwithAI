# Lead with AI — Full Stack Application

> **"Lead with AI: Adopt, Implement and Transform"**  
> A 2-day professional AI program hosted by **Global Knowledge Technologies** on **all weekends of June 2026**, offering hands-on learning in Generative AI for students and working professionals.

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
- **Forensic AI-powered student ID card scanning** (Google Gemini 2.5 Flash) via PDF uploads to auto-fill college details, specifically designed to reject digital mockups, screenshots, and AI-generated fakes.
- **Persistent Marketing Attribution**: Captures `?ref=CODE` tracking parameters globally using session/local storage across page navigations.
- **Mandatory Session Feedback & Certificate Generation**: Users must submit text feedback for four training sessions to unlock browser-side dynamic certificate generation.
- Integrated **Razorpay payment gateway** (₹499 for students / ₹999 for professionals)
- Secure admin panel with user search/filter, comprehensive CSV exports, dynamic certificate preview, and bulk email
- **Zoom Webinar integration**: Automatically registers paid participants to the Zoom Webinar and generates unique join links
- Automated transactional emails: verification OTP, login OTP, registration confirmation, payment receipt with `.ics` calendar invite, and Day 1 & Day 2 reminder emails
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
| File Uploads | Multer (PDF only, max 5 MB) |
| AI OCR | Google Gemini 2.5 Flash (`@google/genai`) |
| Integrations | Zoom Server-to-Server OAuth API |
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
│   │   │   ├── adminAuth.js           # JWT auth middleware (admin)
│   │   │   └── auditLogger.js         # Logs administrative actions to DB
│   │   ├── models/
│   │   │   ├── User.js                # Mongoose User schema + OTP + Feedback methods
│   │   │   ├── Admin.js               # Admin credentials model
│   │   │   ├── Settings.js            # Global toggles (maintenance, feedback, cap, referrals)
│   │   │   └── AuditLog.js            # Admin actions history model
│   │   ├── routes/
│   │   │   ├── auth.js                # Registration, OTP, login, ID parse
│   │   │   ├── payment.js             # Razorpay order + verify + webhooks
│   │   │   └── admin.js               # Stats, users, bulk email, settings, referrals
│   │   └── utils/
│   │       ├── email.js               # All Nodemailer email templates
│   │       └── zoom.js                # Server-to-server Zoom OAuth & registration
│   ├── uploads/                       # Uploaded ID card PDFs (gitignored)
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
│   │   ├── lib/
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
│   │   │       ├── AdminUsers.tsx     # Registrant table + filters + CSV export
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
graph TD
    %% Custom Styles aligning with the Luxury Design System
    classDef client fill:#FAF7F2,stroke:#3B2F2F,stroke-width:2px,color:#3B2F2F;
    classDef backend fill:#F5EFEB,stroke:#3D2C26,stroke-width:2px,color:#3D2C26;
    classDef db fill:#FFFFFF,stroke:#6B4F3A,stroke-width:2px,color:#6B4F3A;
    classDef ext fill:#F5F0E8,stroke:#C4956A,stroke-width:2px,color:#6B4F3A;

    %% 1. CLIENT TIER (Top)
    subgraph Client ["Client Tier (React 19 SPA)"]
        SPA["React SPA (Vite 7)"]:::client
        Auth["AuthContext (JWT Session)"]:::client
        Cert["Certificate Generator"]:::client
        
        SPA --- Auth
        SPA --- Cert
    end

    %% 2. BACKEND TIER (Middle)
    subgraph Server ["Express Application Server"]
        RL["Rate Limiters (Security)"]:::backend
        API["Express Routing Layer"]:::backend
        Cron["node-cron Scheduler (Reminders)"]:::backend
        
        RL --> API
    end

    %% 3. DATA & INTEGRATIONS TIER (Bottom)
    subgraph Storage ["Data Tier"]
        DB[(MongoDB Atlas)]:::db
    end

    subgraph Integrations ["External Services"]
        Gemini["Google Gemini AI"]:::ext
        Razorpay["Razorpay Gateway"]:::ext
        SMTP["SMTP Mail Server"]:::ext
        Zoom["Zoom Webinar API"]:::ext
    end

    %% TIER CONNECTIONS (Vertical, clean flows)
    SPA ==>|HTTP Requests| RL
    
    API --> DB
    Cron --> DB
    
    API --> Gemini
    API --> Razorpay
    API --> SMTP
    API --> Zoom
    
    Cron --> SMTP
```

---

## Workflow Diagrams

### Registration Flow

```mermaid
graph TD
    classDef step fill:#FAF7F2,stroke:#3D2C26,stroke-width:2px,color:#3D2C26;
    classDef decision fill:#F5EFEB,stroke:#C4956A,stroke-width:2px,color:#3D2C26;
    classDef success fill:#FAF7F2,stroke:#5CBA9E,stroke-width:2px,color:#3D2C26;
    classDef error fill:#FAF7F2,stroke:#C4956A,stroke-dasharray: 5 5,color:#3D2C26;

    Start([Start Registration]) --> UserType{Select User Type}:::decision
    
    %% Student Branch
    UserType -->|Student| StudEmail[Input College Email]:::step
    StudEmail --> DomainCheck{Is email domain<br>eligible?}:::decision
    DomainCheck -->|No| RejectDomain[Reject Domain<br>Enforce .ac.in, .edu.in, .edu]:::error
    DomainCheck -->|Yes| SendStudOTP[Send Student Verification OTP]:::step
    SendStudOTP --> VerifyStudOTP[Verify OTP]:::step
    VerifyStudOTP --> IDUpload[Upload Student ID Card PDF]:::step
    IDUpload --> BypassCheck{Has .ac.in or .edu.in email?}:::decision
    BypassCheck -->|Yes| SaveStudent[Bypass AI scan & Save Student Details]:::success
    BypassCheck -->|No| GeminiScan[Google Gemini 2.5 Flash scan]:::step
    GeminiScan --> OCRCheck{Is ID card valid & physical?}:::decision
    OCRCheck -->|No| RejectID[Show Error & Prompt re-upload]:::error
    OCRCheck -->|Yes| SaveStudent
    
    %% Professional Branch
    UserType -->|Working Professional| ProfEmail[Input Work/Personal Email]:::step
    ProfEmail --> SendProfOTP[Send Professional Verification OTP]:::step
    SendProfOTP --> VerifyProfOTP[Verify OTP]:::step
    VerifyProfOTP --> InputProfDetails[Enter Organization & Field/Domain Details]:::step
    InputProfDetails --> SaveProfessional[Save Professional Details]:::success

    %% Common End
    SaveStudent --> WelcomeEmail[Send Welcome Email with Portal & Payment Link]:::step
    SaveProfessional --> WelcomeEmail
    WelcomeEmail --> End([Registration Complete - Pending Payment])
```

### Payment Flow

```mermaid
graph TD
    classDef step fill:#FAF7F2,stroke:#3D2C26,stroke-width:2px,color:#3D2C26;
    classDef decision fill:#F5EFEB,stroke:#C4956A,stroke-width:2px,color:#3D2C26;
    classDef success fill:#FAF7F2,stroke:#5CBA9E,stroke-width:2px,color:#3D2C26;
    classDef error fill:#FAF7F2,stroke:#C4956A,stroke-dasharray: 5 5,color:#3D2C26;

    Start([Click Pay Now]) --> CheckType[Determine Registration Fee]:::step
    CheckType --> Fee{User Type?}:::decision
    Fee -->|Student| OrderStudent[Create Order: ₹499]:::step
    Fee -->|Working Professional| OrderProfessional[Create Order: ₹999]:::step
    
    OrderStudent --> PayModal[Launch Razorpay Payment Modal]:::step
    OrderProfessional --> PayModal
    
    PayModal --> PaymentStatus{Was payment<br>successful?}:::decision
    PaymentStatus -->|No/Cancelled| ShowError[Show Payment Failed/Cancelled Modal]:::error
    PaymentStatus -->|Yes| VerifySignature[Verify Razorpay Signature on Server]:::step
    
    VerifySignature --> UpdateDB[Mark User as paid: true]:::success
    UpdateDB --> ZoomRegister[Auto-Register User on Zoom Webinar]:::step
    ZoomRegister --> ConfirmEmail[Send Confirmation Email with Zoom Join URL & .ics invitation]:::step
    ConfirmEmail --> End([Payment Confirmed - Ready for Workshop])
```

---

## Pages & Features

### Public Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Hero, Six Takeaways grid, workshop schedule, speaker details, CTA |
| `/program` | `Program.tsx` | Full 2-day curriculum session details |
| `/speakers` | `Speakers.tsx` | Speaker cards and bios |
| `/register` | `Register.tsx` | Multi-step registration (User type selection → Email Verification → Form Completion → Payment Gate) |
| `/profile` | `Profile.tsx` | Logged-in attendee page. Dynamic payment statuses, session feedback submissions, and certificate downloader |

### Register.tsx — Key Features

- **College email domain guard** (students): enforces `.ac.in`, `.edu.in`, `.edu` both client-side and server-side.
- **Mandatory Student ID Card Upload**: Required for all student registrations to qualify for ₹499 pricing. Only uploads in `.pdf` format are accepted.
- **Gemini scan bypass for institutional domains**: Bypasses AI forensic validation scans for users with `.ac.in` and `.edu.in` email addresses, while scanning other domains.
- **Separate OTP emails**: Verification OTP vs Login OTP.
- **Forensic AI ID scan**: Uploads PDF to `/api/auth/parse-id` (Max 5MB); Gemini extracts data and rejects digital fakes.
- **Persistent Marketing Attribution**: Automatically captures `?ref=CODE` and assigns it to the user.
- **Tiered pricing**: Students pay ₹499, working professionals pay ₹999.

### Profile.tsx — Key Features

- Shows registered event, payment status, Zoom link (post-payment).
- **Scroll Lock on Modal Show**: Automatically prevents body scrolling when modals (feedback/payment) are displayed.
- **Dynamic Payment Update Modal**: Renders specific "Payment Cancelled" or "Payment Failed" states cleanly in the middle of the screen.
- **Session Feedback System**: Users must provide text feedback for 4 distinct training sessions after the event.
- **Dynamic Certificate Generator**: Once feedback is submitted, users unlock the ability to generate and download their completion certificate with custom formatting and typography directly in the browser.

### Admin Panel (Protected)

| Route | Component | Description |
|---|---|---|
| `/admin/login` | `AdminLogin.tsx` | Admin email + password login |
| `/admin/dashboard` | `AdminOverview.tsx` | Stats: total, paid, revenue, source distributions, recent sign-ups |
| `/admin/users` | `AdminUsers.tsx` | Full registrant table + heardFrom filters + advanced CSV export |
| `/admin/email` | `AdminEmail.tsx` | Bulk email composer |

**Admin Dashboard Key Features:**
- **Attribution & Sources Filter**: Includes a "Heard From" source filter (`All Sources`, `Social Media`, `Newspaper`, `Others`) to segregate users based on their marketing/attribution channels.
- **Dynamic Source Distribution Chart**: Displays a "Heard From Source" pie chart mapping attendee sources with matching brand colors.
- **Heard From column**: The table displays marketing channels and user-entered custom options directly instead of the generic user activation status (which is still manageable inside the detail expansion drawer).
- **Advanced CSV Export**: Exports comprehensive user data including marketing referral codes, ID paths, payment IDs, and form submissions.
- **Dynamic Certificate Preview**: Internal tooling to test and preview the final certificate layout and coordinates.
- **System Settings Controls**: Allows real-time admin management of maintenance mode status, feedback form visibility, registration limits cap, and referral codes database.

---

## API Reference

> **Base URL (dev):** `http://localhost:4000`  
> **Protected routes:** `Authorization: Bearer <JWT>`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/send-register-otp` | None | Check email uniqueness + domain → send verification OTP |
| `POST` | `/verify-register-otp` | None | Verify OTP; marks email eligible for registration |
| `POST` | `/parse-id` | None | Upload ID card PDF (max 5 MB); Gemini forensic validation & extraction |
| `POST` | `/register` | None | Create account (requires verified email); saves `referralCode` |
| `POST` | `/send-otp` | None | Send login OTP to existing user |
| `POST` | `/verify-otp` | None | bcrypt OTP verify → JWT |
| `GET` | `/me` | ✅ JWT | Full user profile |
| `POST` | `/submit-feedback` | ✅ JWT | Submit session feedback (updates `feedback` and `isFeedbackSubmitted`) |

### Payment — `/api/payment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | ✅ JWT | Creates Razorpay order |
| `POST` | `/verify` | ✅ JWT | HMAC-SHA256 verify → marks payment confirmed; registers Zoom webinar; sends receipt email |
| `POST` | `/webhook` | None | Razorpay Webhook handler to confirm payment asynchronously |

### Public Settings — `/api/public/settings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | Fetch feedback toggle, maintenance mode state, and registration settings |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | None | Admin login → admin JWT (24h) |
| `POST` | `/` | None/Admin | Create a new Admin account (open if 0 admins exist; requires auth otherwise) |
| `GET` | `/` | ✅ Admin | Get all admins list |
| `DELETE` | `/:adminId` | ✅ Admin | Delete an admin |
| `GET` | `/audit-logs` | ✅ Admin | View actions history logs |
| `GET` | `/stats` | ✅ Admin | Total users, paid count, referral breakdown, heardFrom stats, 5 recent sign-ups |
| `GET` | `/users` | ✅ Admin | All registrants including `referralCode`, `feedback`, `isPaid`, `heardFrom` |
| `POST` | `/users` | ✅ Admin | Add a registrant manually |
| `GET` | `/users/:id` | ✅ Admin | Single user detail |
| `PATCH` | `/users/:id` | ✅ Admin | Edit a registrant's details |
| `PATCH` | `/users/:id/status` | ✅ Admin | Toggle registrant active/deactive status |
| `PATCH` | `/users/:id/waitlist` | ✅ Admin | Toggle registrant waitlist status |
| `POST` | `/users/:id/confirm-payment` | ✅ Admin | Manually confirm a registrant's payment |
| `DELETE` | `/users/:id` | ✅ Admin | Delete a registrant |
| `POST` | `/users/:id/retry-zoom` | ✅ Admin | Force retry Zoom registration for paid user |
| `POST` | `/users/:id/retry-email` | ✅ Admin | Force resend payment receipt/calendar event email |
| `POST` | `/send-email` | ✅ Admin | Bulk email to `all` / `paid` / `custom` list |
| `GET` | `/feedback` | ✅ Admin | Retrieve all feedback entries |
| `GET` | `/settings` | ✅ Admin | Fetch internal configuration options |
| `PATCH` | `/settings/feedback` | ✅ Admin | Toggle dynamic session feedback form availability |
| `PATCH` | `/settings/maintenance` | ✅ Admin | Toggle maintenance mode bypass |
| `PATCH` | `/settings/cap` | ✅ Admin | Update maximum registration cap capacity |
| `GET` | `/settings/referrals` | ✅ Admin | Get active referral codes lists |
| `POST` | `/settings/referrals` | ✅ Admin | Add a new active referral code |
| `PATCH` | `/settings/referrals/:code` | ✅ Admin | Toggle referral code active status |
| `PUT` | `/settings/referrals/:code/label`| ✅ Admin | Update referral code label descriptive text |
| `DELETE` | `/settings/referrals/:code` | ✅ Admin | Delete a referral code |

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
  idCardPath:       String,           // filename of PDF in /uploads

  // Working professional-only
  domain:       String,
  organization: String,

  // OTP login (cleared after use)
  otpHash:    String,   // bcrypt hash
  otpExpiry:  Date,     // 10-min TTL

  // Registration metadata
  heardFrom:    String,
  isWaitlisted: Boolean,
  isActive:     Boolean,
  referralCode: String,

  // Session Feedback System
  feedback: [{
    session: String,
    text:    String
  }],
  isFeedbackSubmitted: Boolean,

  // Events
  registeredEvents: [{
    eventName:               String,
    razorpayOrderId:         String,
    razorpayPaymentId:       String,
    paymentStatus:           "pending" | "confirmed" | "failed",
    zoomRegistrationStatus:  "pending" | "success" | "failed",
    emailConfirmationStatus: "pending" | "success" | "failed",
    zoomJoinUrl:             String,
    registeredAt:            Date,
  }],

  createdAt: Date,
  updatedAt: Date,
}
```

### `Settings` Collection

```js
{
  feedbackEnabled:   Boolean (default: false),
  isMaintenanceMode: Boolean (default: false),
  registrationCap:   Number (default: 1000),
  referralCodes: [{
    code:     String,
    label:    String,
    isActive: Boolean
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### `AuditLog` Collection

```js
{
  adminId:    ObjectId (ref: 'Admin'),
  adminName:  String,
  adminEmail: String,
  action:     String (required),
  target:     String,
  details:    Schema.Types.Mixed,
  ipAddress:  String,
  userAgent:  String,
  createdAt:  Date,
  updatedAt:  Date
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
| `register` | 5 attempts | 15 min |

---

## Email System

All HTML transactional emails are formatted in a premium beige color schema featuring a clean, responsive template structure and standard web safe Arial fonts.

| Function | Trigger | Type | Notes |
|---|---|---|---|
| `sendVerificationOtpEmail()`| Registration email OTP | HTML | "Your OTP for Email Verification" (Beige bg, brown border, logo, dynamic date header) |
| `sendOtpEmail()` | Login OTP | HTML | "Your Login OTP, [FirstName]" (Beige bg, brown border, logo, dynamic date header) |
| `sendRegistrationEmail()` | Account created | HTML | Welcome HTML with payment reminder, pricing context & clickable registration portal link |
| `sendPaymentConfirmationEmail()` | Payment verified | HTML | Seat confirmation receipt with dynamic unique Zoom Webinar Join URL + `.ics` calendar invitation attachment |
| `sendCustomBulkEmail()` | Admin bulk send | HTML | Admin bulk messaging sent as BCC to target group selection |
| `sendReminderEmail()` | Cron — Day before event | HTML | Starts tomorrow reminder containing custom Zoom Join webinar link sent to paid users |
| `sendDay2ReminderEmail()` | Cron — End of Day 1 | HTML | Day 2 Zoom session reminder sent to paid users |
| `sendProfileApprovedEmail()`| Manual approval | HTML | Sent when an admin manually updates/approves a pending registration profile |

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4002
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/LeadWithAI
MONGO_DB_NAME=LeadWithAI
COLLECTION_NAME=Users

JWT_SECRET=<strong_random_secret>

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<razorpay_secret>
RAZORPAY_WEBHOOK_SECRET=<webhook_secret>

SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=events@yourdomain.com
SMTP_PASS=<smtp_password>
FROM_EMAIL=events@yourdomain.com
FROM_NAME=Lead with AI

GEMINI_API_KEY=<gemini_api_key>

SITE_URL=https://www.globalknowledgetech.com/leadwithAI
ZOOM_LINK=https://zoom.us/j/00000000000

ZOOM_ACCOUNT_ID=<zoom_account_id>
ZOOM_CLIENT_ID=<zoom_client_id>
ZOOM_CLIENT_SECRET=<zoom_client_secret>
ZOOM_WEBINAR_ID=<zoom_webinar_id>
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4002
```

> ⚠️ **Never commit `.env` files.** Both are in `.gitignore`.

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas (or local MongoDB)
- Razorpay account (test or live)
- Google Gemini API key
- Zoom Account with Web SDK credentials
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
# → http://localhost:4002

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
