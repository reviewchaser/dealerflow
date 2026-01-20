Rules:

1. First think through the problem, read the codebase for relevant files.
2. Before you make any major changes, check in with me and I will verify the plan.
3. Please every step of the way just give me a high level explanation of what changes you made
4. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
5. Maintain a documentation file that describes how the architecture of the app works inside and out.
6. Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.

# DealerHQ - Development Notes

## Completed Work (16 January 2026)

### Sales/Invoicing Improvements - ALL PHASES COMPLETE

**Stock Book Improvements:**

1. **VAT Auto-Calculation** (`pages/stock-book.js`)
   - When VAT Qualifying selected, enter Gross Price (inc VAT)
   - Auto-calculates Net and VAT using dealer's VAT rate
   - Uses `calculateVatFromGross()` helper

2. **Purchase Date Column** (`pages/stock-book.js`)
   - Shows `vehicle.purchase.purchaseDate` in table

3. **Column Sorting** (`pages/stock-book.js`)
   - Clickable headers with sort indicators (↑/↓)
   - Sortable: Stock #, VRM, Vehicle, Days, SIV, Purchased
   - Persists to localStorage

**Deal Model Updates** (`models/Deal.js`):
- `partExchanges[]` array for multiple PX (max 2)
- `delivery.amountGross`, `delivery.amountNet`, `delivery.vatAmount`
- `delivery.scheduledDate`, `delivery.scheduledCalendarEventId`
- `signature` subdocument: timestamps, signer names, R2 image keys, driver link tokens
- `totalPartExchangeNet` virtual for multiple PX calculation

**Sales Wizard** (`components/SaleWizard.js`):
- **New 5-step flow:**
  1. Vehicle & Sale Type
  2. Customer & PX (with duplicate check against stock)
  3. Pricing & Options (finance toggle, delivery VAT)
  4. Deposit (dedicated step with toggle + amount)
  5. Review (with TBC items warning)
- Multiple part exchanges UI (max 2, add/remove buttons)
- PX duplicate check: warns if VRM already in stock
- Delivery cost auto-calculates VAT if dealer is VAT registered
- Finance toggle with "To Be Confirmed" option

**Documents:**
- `pages/public/invoice/[token].js` - Full breakdown with multiple PXs, delivery line, signature status block
- `pages/public/deposit-receipt/[token].js` - Delivery charge line, signature status (distance sales: "no signature required")

**Invoice PDF Page Constraint:**
- Invoice page 1 MUST contain: Header through "Thank you for your business"
- CSS class `.invoice-page-1` available with `max-height: 257mm` and `overflow: hidden` for print
- Page 2 content (payments + T&Cs) uses `print:break-before-page` to force new page
- Never allow page 1 content to overflow - shrink fonts/spacing if needed

**E-Signature System:**
- `components/SignatureCapture.js` - Modal with signature_pad for customer + dealer signatures
- `pages/api/deals/[id]/sign.js` - Saves signatures to R2 storage, updates deal
- `pages/api/deals/[id]/generate-driver-link.js` - Creates secure 24hr driver link
- `pages/api/delivery-signing/[token].js` - API for driver signing submission
- `pages/public/delivery-signing/[token].js` - Mobile-friendly public page for drivers
- DealDrawer: "Sign in Showroom" button, "Generate Driver Link" button, signature status display

**Delivery Features:**
- `pages/api/vehicles/index.js` - Added `hasDelivery` flag lookup from Deal
- `pages/prep.js` - Purple "Delivery" badge on vehicle cards
- DealDrawer: "Schedule Delivery" modal creates calendar event, shows scheduled date

### Testing Checklist (Recommended)
1. **Stock Book**: Add vehicle with VAT Qualifying, verify auto-calc; test column sorting
2. **Sales Wizard**: Complete full 5-step flow with deposit; try adding 2 PXs; test PX duplicate warning
3. **Delivery VAT**: Toggle VAT registration in dealer settings, verify delivery input label changes
4. **Invoice**: Generate invoice with multiple PXs, delivery, and add-ons - verify breakdown
5. **E-Signature**: In DealDrawer, click "Sign in Showroom" for invoiced deal, capture both signatures
6. **Driver Link**: Generate driver link, open in browser, complete signing flow
7. **Prep Board**: Create deal with delivery set, check purple "Delivery" badge appears
8. **Schedule Delivery**: Schedule from DealDrawer, verify calendar event created

---

## Recent Work Completed (13 January 2026)

### Sales Module Amendments - 7 Fixes

**1. Add-ons API Fix**
- File: `components/SaleWizard.js`
- Changed `/api/products` to `/api/addons` - add-ons now load correctly in wizard

**2. Stock Book "In Stock" Filter Fix**
- Files: `pages/api/vehicles/index.js`, `pages/stock-book.js`
- API now parses `type` and `salesStatus` query parameters
- Treats undefined/null salesStatus as "AVAILABLE" (using `$or` query)
- "In Stock" tab now shows vehicles on page load without needing to click "All Vehicles"

**3. Auto Stock Number**
- File: `pages/stock-book.js`
- Stock number now auto-assigned when saving purchase info (calls `/api/vehicles/[id]/assign-stock-number`)
- Displayed as read-only field in drawer - no longer editable

**4. Quick Actions on Deals List**
- File: `pages/sales.js`
- Added dropdown menu (three-dot icon) to each deal row with:
  - View Details (all statuses)
  - View Receipt (DEPOSIT_TAKEN with depositReceiptUrl)
  - View Invoice (INVOICED, DELIVERED, COMPLETED with invoiceUrl)
  - Delete (DRAFT, CANCELLED only)

**5. DVSA MOT History API v2 Integration**
- Endpoint: `/v1/trade/vehicles/registration/{vrm}` at `history.mot.api.gov.uk`
- Returns: make, model, colour, fuel type, MOT history, manufacture date
- **VIN is NOT returned** by DVSA API (confirmed via OpenAPI spec)
- Requires OAuth (Microsoft Entra ID) + X-API-Key header
- MOT API called in parallel with DVLA lookup for richer vehicle data

**6. Add Vehicle Form in Stock Book**
- File: `pages/stock-book.js`
- New "Add Vehicle" button opens inline modal
- VRM lookup with DVLA + MOT APIs in parallel
- Full form with vehicle details AND purchase info
- Auto-assigns stock number on creation if purchase info provided

**7. Simplified Sales Wizard (Major Refactor)**
- File: `components/SaleWizard.js`
- Reduced from 8 steps to 4:
  - Step 1: Vehicle & Sale Type (vehicle picker, sale type, buyer use, sale channel)
  - Step 2: Customer & Part Exchange (customer search/create, PX toggle with VRM lookup)
  - Step 3: Pricing & Add-ons (sale price, VAT scheme, payment type, deposit, add-ons picker)
  - Step 4: Review (summary of all selections, create deal button)
- Changed from full-screen to inline popup layout (`max-w-3xl`, `max-h-[85vh]`)
- All step logic consolidated into single file (removed separate Step1-8 component files)
- Searchable lists for vehicles, customers, and add-ons
- PX VRM lookup integrated

---

## Previous Work (12 January 2026)

### Bug Fixes & Amendments Batch #2

**1. Dashboard Double-Load Fix**
- Files: `libs/authOptions.js`, `middleware.js`
- Problem: Dashboard would load then redirect causing visible "double load"
- Solution: Added dealer slug to JWT token, middleware now redirects directly without client-side hop
- Stores `dealerSlug` in JWT during authentication for instant middleware redirects

**2. Custom Label Filtering Fix (Stock & Prep Page)**
- File: `pages/sales-prep.js`
- Problem: Labels showed "0" count even when vehicles had labels assigned
- Fixed: Changed comparisons from `l._id` to `String(l.id || l._id || l)` to handle all label formats

**3. Sidebar Highlight Fix**
- File: `components/DashboardLayout.js`
- Problem: Sales link was highlighted when on /sales-prep page (due to startsWith check)
- Solution: Added `isNavItemActive()` helper that checks exact match or match with trailing `/`

**4. Add-ons in Deposit Receipts**
- Files: `pages/api/deals/[id]/take-deposit.js`, `pages/public/deposit-receipt/[token].js`
- Add-ons are now included in deposit receipt snapshots and displayed on the receipt
- Shows add-ons section with breakdown and updates totals to include add-on amounts

**5. Mobile Column Filters (Stock & Prep Page)**
- File: `pages/sales-prep.js`
- Added sort dropdown button next to stage selector on mobile
- Options: Oldest First, Newest First, A-Z (Make/Model)
- Uses same `columnSortOptions` state as desktop for consistency

**6. PageHint Tooltip Overlay Fix**
- File: `components/ui/PageHint.js`
- Problem: Hint banner expanded inside flex header causing overflow
- Solution: Changed to dropdown tooltip pattern that appears below trigger button
- Now uses outside-click to close and doesn't disrupt header layout

**7. PDF Export for Reports**
- File: `pages/reports/index.js`
- Added Print/PDF dropdown with clear options for "Print Report" and "Save as PDF"
- Both options trigger print dialog (browser's native PDF save)

**8. VRM Lookup - API Limitations**
- **Fields returned:** make, model, colour, fuel type, year, engine size, MOT history
- **Fields NOT returned:** VIN, transmission
- Neither DVLA nor DVSA APIs provide VIN or transmission data
- **Result:** VIN and transmission must be entered manually on free tier
- **Future:** Pro tier can use UK Vehicle Data API (~15p/lookup) for VIN/transmission auto-population
- DVSA endpoint: `/v1/trade/vehicles/registration/{vrm}` at `history.mot.api.gov.uk`

### Previous Bug Fixes Batch #1

**1. Mobile Dropdown Overflow Fix (Submissions Page)**
- File: `pages/forms.js`
- Added viewport constraints to dropdown menus to prevent overflow on mobile
- Applied `right-0 md:right-auto` and `maxWidth: 'calc(100vw - 2rem)'` to all dropdown-content elements

**2. Label Filtering Bug (Sales Prep Page)**
- File: `pages/sales-prep.js`
- Fixed: Labels API returns `id` but code used `label._id` causing all labels to share undefined key
- Changed all `label._id` references to `label.id || label._id` in filter sections

**3. Warranty/Issue Report Form Overhaul**
- File renamed: `pages/public/warranty-claim.js` → `pages/public/report-a-problem.js`
- **New public URL:** `/public/report-a-problem`
- Title changed to "Report An Issue"
- Added warranty documentation reference text
- Added "Please allow up to 48 hours for a response" message
- Added DVLA lookup to auto-populate vehicle make from registration
- Form submissions auto-create cases in Aftersales page via `/api/aftercare`

**4. Aftersales Page Info Text**
- File: `pages/warranty.js`
- Added subtitle: "Customer submissions via the public form automatically appear here"

**5. Sales/Deals Error Resolution**
- Created: `scripts/clear-deals.js`
- Run with `node scripts/clear-deals.js` to wipe all deals if schema changes break the page
- Script resets vehicle salesStatus and clears related sales documents

**6. Add-on Products Management**
- File: `pages/settings.js`
- Added full CRUD for Add-on Products in Settings page
- Products can be added to deals in the sales module
- Categories: WARRANTY, PROTECTION, FINANCE, ACCESSORY, SERVICE, OTHER
- Stores name, defaultPriceNet, and category

---

## Previous Work (January 2026)

### Sales Module Implementation
Full vehicle sales module with deal lifecycle, UK VAT handling, invoicing, and documents.

**Key Files:**
- `models/Deal.js` - Deal model with status workflow (DEPOSIT_TAKEN → INVOICED → DELIVERED → COMPLETED)
- `models/SalesDocument.js` - Invoice and deposit receipt records
- `models/PartExchange.js` - Links appraisals to deals
- `components/DealDrawer.js` - Deal management drawer with all tabs
- `pages/deals.js` - Deals list page with status tabs

### Reports Consolidation
Single consolidated reports page replacing separate report pages.

**Location:** `pages/reports/index.js`

**Report Types:**
- Sales Summary - revenue, deals closed, avg deal value
- VAT Report - output/input VAT for returns
- Inventory - current stock value and distribution
- Stock Book - purchase/sale/profit per vehicle
- Profitable Models - best performing makes/models
- Warranty Costs - aftercare claims analysis

**Features:** Period filtering, CSV export, print/PDF

### Document Updates
- Deposit receipts and invoices now always show mileage and VIN (with "Not recorded" fallback)
- Retail invoices include signature fields for buyer and dealer
- Trade/Export invoices do NOT show signature fields (controlled by `saleType` in snapshot)

### Part Exchange VRM Lookup Fix
Fixed DVLA lookup in DealDrawer - was using GET, changed to POST with JSON body:
```javascript
const res = await fetch("/api/dvla/vehicle-enquiry", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ registrationNumber: cleanVrm }),
});
```

### Marketing Homepage
Updated pricing and signup flow:
- Free tier emphasized (highlighted, "No card required")
- Pro: £49/month or £490/year (save £98)
- Monthly/yearly billing toggle
- All CTAs push free tier first

**Location:** `pages/index.js`

---

## Pending Test Drive Form Simplifications

When implementing test drive form changes:

If VRM is matched from stock, remove make/model fields below (redundant).

**Remove these fields:**
- License Number, License Expiry Date, License Type
- All Insurance details fields
- Mileage Out, Fuel Level Out
- Accompanied by staff member, Staff Member Name
- Date field below signature box
- All Return details (Damage Description, Damage Photos)

**Default values:**
- Date of test drive: today's date
- Time out: current time

---

## Architecture Notes

### Tenant-Aware Routes
Pages under `/pages/app/[dealerSlug]/` use TenantPage wrapper:
```javascript
import TenantPage from "@/components/TenantPage";
import MainPage from "@/pages/original-page";

export default function TenantRoute() {
  return <TenantPage><MainPage /></TenantPage>;
}
```

### DVLA API
POST to `/api/dvla/vehicle-enquiry` with `{ registrationNumber: "XX00XXX" }` in body.

### Sales Documents
Invoices and deposit receipts store snapshot data at time of generation. Changes to deal after document generation don't affect existing documents.

Key snapshot fields:
- `saleType`: RETAIL, TRADE, or EXPORT (controls signature display)
- `vatScheme`: VAT_QUALIFYING or MARGIN_SCHEME (controls VAT breakdown display)
