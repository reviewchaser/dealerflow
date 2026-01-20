/**
 * Feature documentation for the Help Chat assistant.
 * This file contains structured information about each page and feature
 * that the AI assistant uses to provide context-aware help.
 */

export const helpDocs = {
  "/dashboard": {
    name: "Dashboard",
    description: "Overview of your dealership performance and key metrics",
    features: [
      "Sales summary cards showing revenue, deals closed, and average deal value",
      "Recent activity feed showing latest actions",
      "Quick action buttons for common tasks",
      "Period filtering to view different date ranges"
    ],
    tips: [
      "Click any summary card to see a detailed breakdown",
      "Use the date picker in the top right to change the reporting period",
      "The activity feed updates in real-time as your team works"
    ],
    workflows: [
      "Check daily sales performance at a glance",
      "Monitor team activity and recent deals",
      "Quick access to create new appraisals or sales"
    ]
  },

  "/stock-book": {
    name: "Stock Book",
    description: "Manage your vehicle inventory with purchase tracking and VAT handling",
    features: [
      "Full vehicle inventory list with search and filters",
      "Add new vehicles with DVLA/MOT lookup",
      "Track purchase information (date, price, source)",
      "VAT auto-calculation for VAT Qualifying vehicles",
      "Stock number auto-assignment",
      "Column sorting (Stock #, VRM, Vehicle, Days, SIV, Purchased)",
      "Filter by status: In Stock, Sold, All Vehicles"
    ],
    tips: [
      "Use the 'Add Vehicle' button to add new stock with VRM lookup",
      "When VAT Qualifying is selected, enter the Gross Price and VAT will auto-calculate",
      "Stock numbers are auto-assigned when saving purchase info",
      "Click column headers to sort the table - your preference is saved",
      "The 'Days' column shows how long a vehicle has been in stock"
    ],
    workflows: [
      "To add a vehicle: Click 'Add Vehicle' > Enter VRM for lookup > Fill purchase details > Save",
      "To edit a vehicle: Click the row to open the drawer > Update details > Save",
      "To mark as sold: This happens automatically when a deal is completed"
    ]
  },

  "/prep": {
    name: "Vehicle Prep",
    description: "Track vehicle preparation stages from purchase to showroom-ready",
    features: [
      "Kanban-style board showing prep stages",
      "Custom labels for categorization",
      "Drag-and-drop between stages",
      "Vehicle cards with key details",
      "Purple 'Delivery' badge for vehicles with scheduled deliveries",
      "Filter by custom labels"
    ],
    tips: [
      "Drag vehicle cards between columns to update their prep stage",
      "Use labels to categorize vehicles (e.g., 'Priority', 'Awaiting Parts')",
      "Click a vehicle card to view full details",
      "Vehicles with scheduled deliveries show a purple badge"
    ],
    workflows: [
      "Track a vehicle through: Arrived > PDI > Valet > Photos > Ready",
      "Assign labels to prioritize certain vehicles",
      "Monitor which vehicles need attention"
    ]
  },

  "/sales": {
    name: "Sales",
    description: "Manage vehicle sales from quote to completion",
    features: [
      "Deal lifecycle management (Draft > Deposit Taken > Invoiced > Delivered > Completed)",
      "Sales Wizard with 5 steps: Vehicle & Sale Type, Customer & PX, Pricing & Options, Deposit, Review",
      "Multiple part exchanges support (up to 2 per deal)",
      "VAT handling (VAT Qualifying or Margin Scheme)",
      "Deposit tracking and receipt generation",
      "Invoice generation with full breakdown",
      "E-signature capture for in-showroom signing",
      "Driver link generation for delivery signing",
      "Quick actions dropdown on each deal row"
    ],
    tips: [
      "Use the Sales Wizard (Create Sale button) to start a new deal",
      "Part exchange VRMs are checked against your stock to avoid duplicates",
      "Finance can be marked as 'To Be Confirmed' if not yet finalized",
      "Delivery costs auto-calculate VAT if your dealership is VAT registered",
      "Use 'Sign in Showroom' for customer signatures on-site",
      "Generate a Driver Link for customers signing at delivery"
    ],
    workflows: [
      "New sale: Create Sale > Complete wizard > Take deposit > Generate invoice > Arrange delivery > Complete",
      "Part exchange: Add PX in wizard step 2 > System checks for duplicates",
      "Signatures: After invoicing, use 'Sign in Showroom' or generate a Driver Link"
    ]
  },

  "/aftersales": {
    name: "Aftersales",
    description: "Handle customer issues, warranty claims, and post-sale support",
    features: [
      "Case management for customer issues",
      "Automatic case creation from public form submissions",
      "Status tracking (Open, In Progress, Resolved, Closed)",
      "Customer and vehicle linking",
      "Notes and history tracking"
    ],
    tips: [
      "Customer submissions via the public 'Report An Issue' form automatically appear here",
      "Use the 'Add Case' button to manually create a new case",
      "Link cases to the original sale for context"
    ],
    workflows: [
      "New issue: Customer submits form OR you create case manually > Investigate > Update status > Resolve"
    ]
  },

  "/appraisals": {
    name: "Appraisals",
    description: "Vehicle appraisals for trade-ins and part exchanges",
    features: [
      "New appraisal form with DVLA lookup",
      "Appraisal listing with status filters",
      "Convert appraisal to stock or part exchange",
      "Customer PX appraisals from public form"
    ],
    tips: [
      "Start with the VRM for automatic vehicle data lookup",
      "Appraisals can be converted to stock when you purchase the vehicle",
      "Link appraisals to deals as part exchanges"
    ],
    workflows: [
      "Appraise a trade-in: New Appraisal > Enter VRM > Fill details > Set valuation > Save",
      "Convert to stock: Open appraisal > Click 'Convert to Stock'"
    ]
  },

  "/contacts": {
    name: "Contacts",
    description: "Customer and contact management",
    features: [
      "Customer database with search",
      "Contact details and history",
      "Link contacts to deals and appraisals",
      "Import/export functionality"
    ],
    tips: [
      "Search by name, email, or phone number",
      "View a customer's complete history of deals and interactions"
    ]
  },

  "/reports": {
    name: "Reports",
    description: "Business analytics and reporting",
    features: [
      "Sales Summary - revenue, deals closed, average deal value",
      "VAT Report - output/input VAT for tax returns",
      "Inventory Report - current stock value and distribution",
      "Stock Book Report - purchase/sale/profit per vehicle",
      "Profitable Models - best performing makes/models",
      "Warranty Costs - aftercare claims analysis",
      "Period filtering for all reports",
      "CSV export",
      "Print/PDF export"
    ],
    tips: [
      "Use the period filter to view different date ranges",
      "Export to CSV for spreadsheet analysis",
      "Use Print/PDF for sharing with accountants or management"
    ],
    workflows: [
      "VAT return: Select VAT Report > Set period to quarter > Export or print"
    ]
  },

  "/forms": {
    name: "Forms & Records",
    description: "Digital forms for PDI, test drives, and other records",
    features: [
      "Form templates: PDI, Test Drive, Courtesy Out/In, Service Receipt, Feedback",
      "Form submission history",
      "Public forms for customer-facing submissions",
      "Quick access from the + button"
    ],
    tips: [
      "Access forms quickly using the + button in the header",
      "Public forms can be shared with customers via link",
      "All submissions are stored and searchable"
    ]
  },

  "/reviews": {
    name: "Reviews",
    description: "Customer review and feedback management",
    features: [
      "View customer feedback submissions",
      "Track review scores",
      "Respond to customer feedback"
    ]
  },

  "/calendar": {
    name: "Calendar",
    description: "Scheduling and appointments",
    features: [
      "View scheduled events and deliveries",
      "Create new calendar events",
      "Link events to deals or customers"
    ],
    tips: [
      "Scheduled deliveries from deals appear automatically",
      "Click a date to create a new event"
    ]
  },

  "/holidays": {
    name: "Holidays",
    description: "Staff holiday request and approval management",
    features: [
      "Submit holiday requests",
      "View team holiday calendar",
      "Approve/reject requests (for managers)"
    ]
  },

  "/overtime": {
    name: "Overtime",
    description: "Staff overtime tracking",
    features: [
      "Log overtime hours",
      "Track overtime by staff member",
      "Approval workflow"
    ]
  },

  "/settings": {
    name: "Settings",
    description: "Dealership configuration and preferences",
    features: [
      "Business details (name, address, contact info)",
      "VAT registration settings",
      "Logo upload",
      "Add-on Products management (warranties, protections, accessories)",
      "Team member management",
      "Public form URLs"
    ],
    tips: [
      "Set your VAT registration status to enable VAT calculations",
      "Upload your logo to appear on invoices and receipts",
      "Add-on Products can be added to deals in the sales module",
      "Manage team access with different roles: Owner, Admin, Sales, Staff, Workshop, Viewer"
    ]
  }
};

/**
 * General overview documentation for the help assistant
 */
export const generalDocs = {
  appName: "DealerHQ",
  description: "DealerHQ is a complete dealership management system for UK car dealers",
  coreFeatures: [
    "Vehicle stock management with DVLA/MOT integration",
    "Full sales workflow from appraisal to delivery",
    "UK VAT handling (VAT Qualifying and Margin Scheme)",
    "Document generation (invoices, deposit receipts)",
    "E-signature capture for compliance",
    "Aftersales and warranty tracking",
    "Business reporting and analytics",
    "Team management with role-based access"
  ],
  commonWorkflows: {
    sellVehicle: [
      "1. Add vehicle to Stock Book (or convert from appraisal)",
      "2. Prepare vehicle (track in Prep board)",
      "3. Create a sale from the Sales page",
      "4. Take deposit and generate receipt",
      "5. Generate invoice when ready",
      "6. Capture signatures (showroom or driver link)",
      "7. Mark as delivered and complete"
    ],
    takeTradeIn: [
      "1. Create appraisal with vehicle details",
      "2. Add as part exchange when creating the sale",
      "3. System checks for duplicate VRMs in your stock",
      "4. PX value is deducted from sale price"
    ],
    handleAftersalesIssue: [
      "1. Customer submits issue via public form, or you create case manually",
      "2. Case appears in Aftersales page",
      "3. Update status as you investigate and resolve",
      "4. Close case when complete"
    ]
  },
  tips: [
    "Use the keyboard shortcut '[' or Ctrl+B to collapse/expand the sidebar",
    "The + button in the header gives quick access to common actions",
    "Forms are accessible from the + menu for quick data capture",
    "Your column sorting preferences are saved automatically"
  ]
};

/**
 * Get documentation for a specific page path
 */
export function getPageDocs(path) {
  // Normalize path (remove query strings, trailing slashes, and tenant prefix)
  let normalizedPath = path.split('?')[0].replace(/\/$/, '');
  normalizedPath = normalizedPath.replace(/^\/app\/[^/]+/, '');

  // Direct match
  if (helpDocs[normalizedPath]) {
    return helpDocs[normalizedPath];
  }

  // Try parent path (e.g., /appraisals/new -> /appraisals)
  const parentPath = normalizedPath.split('/').slice(0, -1).join('/');
  if (parentPath && helpDocs[parentPath]) {
    return helpDocs[parentPath];
  }

  return null;
}

/**
 * Build system prompt for the help assistant
 */
export function buildSystemPrompt(currentPath) {
  const pageDocs = getPageDocs(currentPath);

  let prompt = `You are a helpful assistant for DealerHQ, a dealership management system for UK car dealers.

Your role is to help dealers understand features, troubleshoot issues, and navigate the system.

## Guidelines
- Be concise and friendly
- Focus on answering the specific question
- Provide step-by-step instructions when helpful
- If you don't know something, say so rather than guessing
- Stay on topic - only answer questions about DealerHQ features
- Use UK English spelling and terminology

## About DealerHQ
${generalDocs.description}

### Core Features
${generalDocs.coreFeatures.map(f => `- ${f}`).join('\n')}

### Tips
${generalDocs.tips.map(t => `- ${t}`).join('\n')}
`;

  if (pageDocs) {
    prompt += `

## Current Page: ${pageDocs.name}
${pageDocs.description}

### Features on this page
${pageDocs.features.map(f => `- ${f}`).join('\n')}

### Tips for this page
${pageDocs.tips ? pageDocs.tips.map(t => `- ${t}`).join('\n') : 'No specific tips'}

### Common workflows
${pageDocs.workflows ? pageDocs.workflows.map(w => `- ${w}`).join('\n') : 'See general workflows'}
`;
  }

  prompt += `

## Common Workflows

### Selling a Vehicle
${generalDocs.commonWorkflows.sellVehicle.join('\n')}

### Taking a Trade-In
${generalDocs.commonWorkflows.takeTradeIn.join('\n')}

### Handling Aftersales Issues
${generalDocs.commonWorkflows.handleAftersalesIssue.join('\n')}
`;

  return prompt;
}
