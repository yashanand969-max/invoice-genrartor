# Invoice Detection & PDF Generator — Full-Stack Build Prompt

> **Role**: Act as a senior full-stack developer and UI/UX designer.
> Build a modern, production-ready web application as specified below.

---

## 1. CORE FUNCTIONALITY

- Create a webpage that allows users to **upload an Excel file** (`.xlsx`).
- **Parse and read** the entire Excel file using the `xlsx` library.
- **Automatically detect** whether the invoice belongs to:
  - `a) Chola Bill`
  - `b) Apollo Bill`
- Detection logic must be based on patterns such as: headers, keywords, structure, or company identifiers present in the Excel data.
- Based on detection, **dynamically generate the correct invoice format** using separate templates for Chola and Apollo.

---

## 2. PDF GENERATION

- Convert the generated invoice into a **clean, professional PDF**.
- Include proper formatting:
  - Company details (name, address, logo area)
  - Itemized table (description, qty, rate, amount)
  - Subtotal, taxes, and grand total
  - Invoice number, date, and billing info
- Add a **"Download PDF"** button that triggers an instant browser download of the generated invoice.

---

## 3. UI/UX DESIGN

- Design a **sleek, modern, professional interface** inspired by SaaS dashboards (think Stripe, Notion, Linear quality).
- Place my **company logo** in the top-left corner (accept a placeholder/SVG fallback if no file provided).
- Include **subtle animations**:
  - Drag & drop file upload zone with hover/active states
  - Loading/progress spinner or bar while processing Excel
  - Smooth fade/slide transitions when revealing the invoice preview
- Use **soft gradients**, minimalistic layout, clean typography, and generous whitespace.
- **Responsive**: must work on both mobile and desktop.

---

## 4. COMPONENTS TO BUILD

| Component | Description |
|---|---|
| `DragDropUpload` | Drag & drop zone with click-to-browse fallback |
| `UploadProgress` | Animated progress bar / spinner during file processing |
| `InvoicePreview` | Rendered HTML preview of the generated invoice |
| `DownloadButton` | Triggers PDF download; includes loading state |
| `StatusBanner` | Shows messages like "Processing…", "Invoice detected: Chola" |
| `ErrorBoundary` | Handles invalid files, parse errors, unsupported formats |

---

## 5. TECH STACK

### Frontend
- **React** (functional components + hooks)
- **Tailwind CSS** for all styling
- **Framer Motion** for animations and transitions
- **Axios** for API calls

### Backend
- **Node.js** with **Express**
- **Multer** for file upload handling
- **xlsx** library for Excel parsing
- **PDFKit** (or **Puppeteer** for HTML-to-PDF) for PDF generation

### Project Structure
```
project-root/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── DragDropUpload.jsx
│   │   │   ├── UploadProgress.jsx
│   │   │   ├── InvoicePreview.jsx
│   │   │   ├── DownloadButton.jsx
│   │   │   └── StatusBanner.jsx
│   │   ├── templates/
│   │   │   ├── CholaTemplate.jsx
│   │   │   └── ApolloTemplate.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── public/
│   │   └── logo.svg
│   └── tailwind.config.js
│
├── server/                  # Node.js backend
│   ├── routes/
│   │   └── invoice.js
│   ├── services/
│   │   ├── excelParser.js
│   │   ├── invoiceDetector.js
│   │   └── pdfGenerator.js
│   ├── templates/
│   │   ├── cholaInvoice.js
│   │   └── apolloInvoice.js
│   └── index.js
│
└── README.md
```

---

## 6. DETECTION LOGIC (invoiceDetector.js)

Implement keyword/header-based detection. Example logic:

```js
function detectInvoiceType(parsedData) {
  const flatText = JSON.stringify(parsedData).toLowerCase();

  if (
    flatText.includes("chola") ||
    flatText.includes("cholamandalam") ||
    flatText.includes("chola ms")
  ) {
    return "CHOLA";
  }

  if (
    flatText.includes("apollo") ||
    flatText.includes("apollo munich") ||
    flatText.includes("apollo health")
  ) {
    return "APOLLO";
  }

  return "UNKNOWN";
}
```

> Extend this with header-position checks, sheet name matching, and column structure validation for higher accuracy.

---

## 7. API ENDPOINTS

### `POST /api/upload`
- Accepts: `multipart/form-data` with `file` field (`.xlsx`)
- Returns:
```json
{
  "invoiceType": "CHOLA",
  "invoiceData": { ... },
  "previewHtml": "<html>...</html>"
}
```

### `POST /api/download`
- Accepts: `{ invoiceType, invoiceData }`
- Returns: PDF file as binary stream with `Content-Type: application/pdf`

---

## 8. EXTRA FEATURES

- **Error handling** for:
  - Non-Excel file uploads (show friendly message)
  - Empty or malformed Excel files
  - Unknown invoice type (show "Could not detect invoice type" with manual selector fallback)
- **Invoice type badge** displayed prominently after detection
- **Preview before download** — full-page HTML preview in the browser
- **Manual override**: If detection is uncertain, allow user to manually select Chola or Apollo

---

## 9. INVOICE TEMPLATE REQUIREMENTS

### Both templates must include:
- Header: Company name, logo, address, GSTIN
- Recipient: Bill-to details from Excel data
- Line items table: Description | Qty | Unit Price | Tax | Amount
- Summary: Subtotal, GST (CGST + SGST or IGST), Grand Total
- Footer: Terms & conditions, authorized signatory block
- Invoice number and date (auto-generated or from Excel)

### Chola-specific:
- Color scheme: Deep blue + gold accents
- "Cholamandalam MS General Insurance" branding area

### Apollo-specific:
- Color scheme: Red + white with clean clinical aesthetic
- "Apollo Health Insurance" branding area

---

## 10. RUN INSTRUCTIONS

```bash
# 1. Clone / set up the project
mkdir invoice-app && cd invoice-app

# 2. Setup backend
cd server
npm init -y
npm install express multer xlsx pdfkit cors dotenv
node index.js   # Runs on http://localhost:5000

# 3. Setup frontend
cd ../client
npx create-react-app .
npm install axios tailwindcss framer-motion
npx tailwindcss init
npm start       # Runs on http://localhost:3000
```

> Set `REACT_APP_API_URL=http://localhost:5000` in `client/.env`

---

## 11. DESIGN TOKENS (Tailwind / CSS Variables)

```css
:root {
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-primary: #2563EB;
  --color-primary-dark: #1D4ED8;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --radius-lg: 12px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
}
```

---

## 12. QUALITY BAR

The final output must match the polish of tools like **Stripe Dashboard**, **Notion**, or **Linear**:

- Pixel-perfect spacing and alignment
- No layout shifts or jank during upload/processing
- Professional invoice output that could be sent to a real client
- Clean, commented, modular code that a team can maintain
- Zero console errors in production build

---

*End of specification. Generate full working code for all files listed in the project structure above.*
