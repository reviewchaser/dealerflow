# DealerHQ Sales Module - Implementation Plan

## Overview

Implement a full vehicle sales module with deal lifecycle management, UK VAT handling (VAT Qualifying & Margin Scheme), contacts, part exchange, add-ons, PDF documents, and reporting.

---

## Phase 1: Data Models (Foundation)

### 1.1 New Models to Create

| Model | File | Purpose |
|-------|------|---------|
| Deal | `models/Deal.js` | Main sales object with status workflow, pricing, payments |
| PartExchange | `models/PartExchange.js` | Links appraisal to deal with valuation |
| AddOnProduct | `models/AddOnProduct.js` | Dealer's add-on catalog |
| SalesDocument | `models/SalesDocument.js` | Invoice and deposit receipt records |

### 1.2 Existing Models to Extend

**Vehicle.js** - Add fields:
- `stockNumber` (string, dealer reference)
- `vatScheme` (enum: VAT_QUALIFYING, MARGIN_SCHEME)
- `purchase` object (purchaseDate, purchasePrice, purchaseVat, supplierId)
- `firstRegistrationDate`, `firstMotDue`

**Dealer.js** - Add `salesSettings`:
- Sequential counters (nextStockNumber, nextInvoiceNumber, nextDepositReceiptNumber)
- Prefixes (stockNumberPrefix, invoiceNumberPrefix)
- Bank details for invoices
- Terms text templates
- VAT registration details

**Contact.js** - Extend with:
- `typeTags` array (customer, supplier, finance_company, trade_buyer)
- `contactType` (individual, company)
- `vatNumber`, `accountRef`

---

## Phase 2: API Endpoints

### 2.1 Core CRUD APIs

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/contacts` | GET, POST | List/create contacts with type filtering |
| `/api/contacts/[id]` | GET, PUT, DELETE | Single contact CRUD |
| `/api/addons` | GET, POST | List/create add-on products |
| `/api/addons/[id]` | GET, PUT, DELETE | Single add-on CRUD |
| `/api/deals` | GET, POST | List/create deals |
| `/api/deals/[id]` | GET, PUT, DELETE | Single deal CRUD |

### 2.2 Deal Action Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/deals/[id]/take-deposit` | Record deposit, generate receipt, capture signature |
| `POST /api/deals/[id]/generate-invoice` | Generate invoice number, create SalesDocument |
| `POST /api/deals/[id]/mark-delivered` | Set deliveredAt, update vehicle status |
| `POST /api/deals/[id]/mark-completed` | Final status, trigger review request |

### 2.3 Reports APIs

| Endpoint | Returns |
|----------|---------|
| `GET /api/reports/sales-summary` | Deals by status, totals, conversion rate |
| `GET /api/reports/stock-book` | Purchase/sale/profit per vehicle |
| `GET /api/reports/vat-summary` | VAT output/input for VAT return |

### 2.4 Document APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sales-documents/[id]/pdf` | Generate/retrieve PDF |
| `GET /pages/public/deposit-receipt/[token]` | Printable deposit receipt |
| `GET /pages/public/invoice/[token]` | Printable invoice |

---

## Phase 3: UI Pages

### 3.1 New Pages

| Page | File | Features |
|------|------|----------|
| Deals | `pages/deals.js` | List with status tabs, filters, search |
| Contacts | `pages/contacts.js` | List with type tabs, CRUD |
| Sales Reports | `pages/sales/reports.js` | Summary, Stock Book, VAT tabs |

### 3.2 New Components

| Component | File | Purpose |
|-----------|------|---------|
| DealDrawer | `components/DealDrawer.js` | Detail view with tabs (Overview, Customer, Add-ons, Documents) |
| ContactDrawer | `components/ContactDrawer.js` | Contact detail/edit view |
| SignatureCapture | `components/ui/SignatureCapture.js` | Canvas signature for deposits |

### 3.3 Navigation Updates

**DashboardLayout.js** - Add Sales section:
```javascript
// After Management section
{ name: "Deals", href: "/deals", Icon: CurrencyPoundIcon },
{ name: "Contacts", href: "/contacts", Icon: UsersIcon },
{ name: "Sales Reports", href: "/sales/reports", Icon: ChartBarIcon },
```

---

## Phase 4: VAT Handling (Critical)

### VAT Qualifying Vehicles
- Store: vehicleNetPrice, vehicleVat, vehicleGrossPrice
- Invoice shows: Net + VAT @ 20% = Gross
- Profit = Sale Net - Purchase Net

### Margin Scheme Vehicles
- Store: vehicleSalePrice (gross only)
- Invoice shows: Gross total only + "Sold under margin scheme"
- NO VAT breakdown on invoice
- Profit = Sale Gross - Purchase Gross

### KPI Totals
- Total Sales Gross = sum all vehicles (margin gross + VAT qualifying gross)
- Total VAT Collected = VAT qualifying VAT only
- Profit calculated per scheme, summed for total

---

## Phase 5: PDF Documents

### Deposit Receipt
- Dealer branding/logo
- Receipt number, date
- Customer details
- Vehicle details (VRM, make, model, year)
- Deposit amount, method
- Signature blocks (if in-person)
- Terms text

### Invoice
- Invoice number, date
- Sold to / Invoice to (if finance)
- Vehicle details
- Add-ons breakdown
- VAT breakdown (VAT Qualifying only)
- Deposit deduction
- Balance due
- Bank details
- Terms text

---

## Phase 6: Extra Features

### 6.1 Stock Make Filter
- Add to `pages/sales-prep.js` filter panel
- Populate from distinct makes in current stock
- Persist filter state

### 6.2 VRM Lookup Enhancements
- Parse VIN from DVLA response where available
- Parse transmission where available
- Show banner for manual entry if data unavailable

### 6.3 First MOT Due Calculation
- If `firstRegistrationDate` exists and < 3 years old
- Calculate `firstMotDue = regDate + 3 years`
- Display as "First MOT due" (not expired)

---

## Implementation Order

### Batch 1: Models (Day 1-2)
1. Create `models/Deal.js`
2. Create `models/PartExchange.js`
3. Create `models/AddOnProduct.js`
4. Create `models/SalesDocument.js`
5. Extend `models/Vehicle.js`
6. Extend `models/Dealer.js`
7. Extend `models/Contact.js`

### Batch 2: Core APIs (Day 3-4)
1. `/api/contacts` CRUD
2. `/api/addons` CRUD
3. `/api/deals` CRUD
4. Deal action endpoints

### Batch 3: UI - Deals (Day 5-6)
1. `components/DealDrawer.js`
2. `pages/deals.js`
3. Update `DashboardLayout.js` navigation

### Batch 4: UI - Contacts & Integration (Day 7-8)
1. `components/ContactDrawer.js`
2. `pages/contacts.js`
3. Vehicle drawer "Sales" section integration

### Batch 5: Documents (Day 9-10)
1. `components/ui/SignatureCapture.js`
2. `/api/sales-documents` endpoints
3. `pages/public/deposit-receipt/[token].js`
4. `pages/public/invoice/[token].js`

### Batch 6: Reports (Day 11-12)
1. `/api/reports/sales-summary`
2. `/api/reports/stock-book`
3. `/api/reports/vat-summary`
4. `pages/sales/reports.js`

### Batch 7: Extras & Polish (Day 13-14)
1. Stock make filter in sales-prep
2. VRM lookup enhancements
3. First MOT calculation
4. Testing and fixes

---

## Key Files to Modify/Create

### New Files
- `models/Deal.js`
- `models/PartExchange.js`
- `models/AddOnProduct.js`
- `models/SalesDocument.js`
- `pages/api/deals/index.js`
- `pages/api/deals/[id].js`
- `pages/api/deals/[id]/take-deposit.js`
- `pages/api/deals/[id]/generate-invoice.js`
- `pages/api/deals/[id]/mark-delivered.js`
- `pages/api/deals/[id]/mark-completed.js`
- `pages/api/addons/index.js`
- `pages/api/addons/[id].js`
- `pages/api/contacts/[id].js`
- `pages/api/reports/sales-summary.js`
- `pages/api/reports/stock-book.js`
- `pages/api/reports/vat-summary.js`
- `pages/deals.js`
- `pages/contacts.js`
- `pages/sales/reports.js`
- `pages/public/deposit-receipt/[token].js`
- `pages/public/invoice/[token].js`
- `components/DealDrawer.js`
- `components/ContactDrawer.js`
- `components/ui/SignatureCapture.js`

### Files to Modify
- `models/Vehicle.js` - Add sales fields
- `models/Dealer.js` - Add salesSettings
- `models/Contact.js` - Extend typeTags
- `components/DashboardLayout.js` - Add navigation
- `pages/sales-prep.js` - Add make filter
- `pages/api/dvla/vehicle-enquiry.js` - VIN parsing

---

## Verification Steps

1. **Create a deal** from vehicle drawer - verify deal created, vehicle status updated
2. **Add customer** (new and existing) - verify contact created/linked
3. **Add part exchange** - verify appraisal link, values calculated
4. **Take deposit** with signature - verify receipt generated, PDF works
5. **Generate invoice** (both VAT schemes) - verify number sequence, correct format
6. **Mark delivered** - verify dates set, vehicle status updated
7. **Run reports** - verify calculations match expected values
8. **Export stock book** - verify CSV format correct
9. **Mobile testing** - verify drawers, filters work on touch devices
