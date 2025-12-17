# DealerFlow

A B2B SaaS application for used car dealerships to manage vehicle purchases, prep, sales, and aftercare.

## Features

### Core Functionality
- **Buying Appraisals** - Capture vehicle assessments with AI-powered suggestions
- **Sales & Prep Board** - Kanban-style vehicle prep and sales pipeline
- **Customer/Warranty Board** - Track warranty cases and aftercare
- **Calendar** - Schedule handovers, test drives, and inspections
- **Reviews** - Collect and manage customer feedback

### Data Model Highlights
- No pricing on vehicles (pricing managed externally)
- Contacts created through flows only (not standalone)
- Forms engine for all data capture
- Vehicle labels and locations
- Private plate tracking (reg history)

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Installation

1. Clone and install dependencies:
```bash
cd dealerflow-app
npm install
```

2. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dealerflow-app/
├── components/          # Reusable UI components
│   ├── DashboardLayout.js
│   └── StatsCard.js
├── libs/
│   └── mongoose.js      # Database connection
├── models/              # MongoDB schemas (20 models)
│   ├── Vehicle.js
│   ├── Appraisal.js
│   ├── AftercareCase.js
│   └── ...
├── pages/
│   ├── api/             # API routes
│   │   ├── appraisals/
│   │   ├── vehicles/
│   │   ├── aftercare/
│   │   ├── calendar/
│   │   └── ...
│   ├── public/          # Public forms (no auth required)
│   │   ├── warranty-claim.js
│   │   ├── px-valuation.js
│   │   └── review/[token].js
│   ├── dashboard.js
│   ├── sales-prep.js
│   ├── warranty.js
│   ├── appraisals/
│   ├── reviews.js
│   ├── calendar.js
│   └── settings.js
├── utils/
│   └── notifications.js
└── styles/
    └── globals.css
```

## Key Pages

| Page | Description |
|------|-------------|
| `/dashboard` | Overview stats and quick actions |
| `/sales-prep` | Kanban board for vehicle prep (In Stock → Delivered) |
| `/warranty` | Kanban board for aftercare cases |
| `/appraisals` | List and manage buying appraisals |
| `/appraisals/new` | Create appraisal with AI hints |
| `/reviews` | Customer review tracking |
| `/calendar` | Event scheduling |
| `/settings` | Labels, categories, integrations |

## Public Forms (No Auth)

| URL | Purpose |
|-----|---------|
| `/public/warranty-claim` | Customer warranty claim submission |
| `/public/px-valuation` | Customer part-exchange request |
| `/public/review/[token]` | Review response with 4-5★ → Google redirect |

## API Routes

### Appraisals
- `GET/POST /api/appraisals` - List/create
- `GET/PUT/DELETE /api/appraisals/[id]` - CRUD
- `POST /api/appraisals/[id]/convert` - Convert to vehicle

### Vehicles
- `GET/POST /api/vehicles` - List/create (auto-creates tasks)
- `GET/PUT/DELETE /api/vehicles/[id]` - CRUD
- `GET/POST /api/vehicles/[vehicleId]/tasks` - Task management
- `PUT/DELETE /api/tasks/[taskId]` - Update/delete task

### Aftercare
- `GET/POST /api/aftercare` - List/create cases
- `GET/PUT/DELETE /api/aftercare/[id]` - CRUD
- `GET/POST /api/aftercare/[id]/comments` - Case comments

### Calendar
- `GET/POST /api/calendar` - Events
- `GET/POST /api/calendar/categories` - Event types

### Other
- `POST /api/dvla-lookup` - Vehicle lookup (demo mode)
- `POST /api/ai-hints` - AI suggestions (demo mode)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/labels` - Vehicle labels
- `GET /api/reviews` - Review requests

## Demo Mode

External APIs (DVLA, AI hints) run in demo mode with sample data. Configure API keys in `.env.local` to enable real data.

## Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Database**: MongoDB with Mongoose
- **Styling**: Tailwind CSS + DaisyUI
- **Notifications**: react-hot-toast

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## What's Not Implemented Yet

- Authentication (add NextAuth)
- Full forms engine UI
- Lead management pages
- Vehicle sale recording
- Email/SMS sending for reviews
- File uploads for documents
- Third-party warranty integration

## License

Private - All rights reserved
