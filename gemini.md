# STANDARDIZED INVOICE TEMPLATE — CONSTRUCTION & ELECTRICAL CONTRACTING
**Prompt for Gemini / AI Assistant**

You are an expert in financial document design, Excel automation, and professional invoice structuring for construction and engineering companies.

Your task is to create a STANDARDIZED INVOICE TEMPLATE in BOTH:
1. Excel format (with formulas)
2. Print-ready PDF layout design

---

## CONTEXT:

I run a construction/electrical contracting company. I have provided:
- Sample modern invoice designs (clean, structured layouts)
- My actual past invoices (PDFs)

You must carefully analyze my real invoices and extract ALL fields, structure, and business logic from them.

For example, my invoices include:
- Company details (name, address, GSTIN)
- Invoice number, date, place of supply
- Billing & consignee details
- Work order reference (W/O)
- Detailed item table with:
  - S. No
  - Item name
  - Description
  - SAC code
  - Brand/Product
  - Unit (Rft, Nos, etc.)
  - Price
  - Quantity
  - Amount
- Subtotals (Electrical subtotal)
- Additional charges (e.g., Outstation charges % or L.S.)
- GST (IGST 18%)
- Grand total
- Amount in words
- Bank details
- Terms & conditions
- Authorized signature section

*(Refer to attached invoices like APLE-014-25/26 and APLE-015-25/26 for exact structure and field logic.)*

---

## REQUIREMENTS:

### 1. DESIGN A CLEAN MODERN FORMAT
- Inspired by the sample invoice images (minimal, structured, professional)
- Suitable for a construction company
- Proper alignment and spacing
- Clear section separation

### 2. EXCEL TEMPLATE OUTPUT

Create a detailed Excel structure including:
- Sheet layout (row-by-row structure)
- Column headers
- Exact cell placement
- All formulas:
  - Amount = Qty × Price
  - Subtotal calculation
  - GST (18%)
  - Grand Total
- Dropdowns where useful (units, tax type)
- Dynamic invoice number suggestion (optional)

### 3. PDF LAYOUT SPEC

Describe a print-ready format:
- Header design
- Table formatting
- Font hierarchy
- Section placements
- Signature and stamp area

### 4. STANDARDIZATION
- Remove inconsistencies across my invoices
- Keep all required legal/tax fields
- Make it reusable for future projects

### 5. OUTPUT FORMAT

Structure your response in 3 sections:

**SECTION A:** Final Invoice Structure (clean formatted layout)
**SECTION B:** Excel Template Blueprint (with formulas)
**SECTION C:** PDF Design Guidelines

Be precise, structured, and practical so I can directly implement it.

---

## INVOICE FIELD REFERENCE (extracted from APLE-014-25/26 & APLE-015-25/26):

### HEADER FIELDS
| Field | Example Value |
|---|---|
| Company Name | (Your Company Name) |
| Address | (Full registered address) |
| GSTIN | (15-digit GST number) |
| Phone / Email | (Contact details) |
| Invoice No. | APLE-014-25/26 |
| Invoice Date | DD/MM/YYYY |
| Place of Supply | (State name + State code) |
| Work Order Ref. | W/O No. XXXX dated DD/MM/YYYY |

### BILLING / CONSIGNEE FIELDS
| Field | Notes |
|---|---|
| Bill To (Name) | Client company name |
| Bill To (Address) | Full address |
| GSTIN of Client | If registered |
| Consignee Name | If different from billed party |
| Consignee Address | Site/project address |

### LINE ITEM TABLE COLUMNS
| Column | Formula / Note |
|---|---|
| S. No | Serial number (1, 2, 3…) |
| Item Name | Short name of work/material |
| Description | Detailed scope of work |
| SAC Code | Service Accounting Code (e.g., 995461) |
| Brand / Product | Brand name or "As approved" |
| Unit | Dropdown: Rft / Nos / Sqft / LS / Set |
| Qty | Numeric input |
| Unit Price (₹) | Numeric input |
| Amount (₹) | = Qty × Unit Price |

### SUBTOTAL & TAX SECTION
| Line | Formula |
|---|---|
| Electrical Work Subtotal | = SUM of relevant line items |
| Outstation Charges (% or LS) | = Subtotal × % OR fixed amount |
| Taxable Amount | = Subtotal + Additional Charges |
| CGST @ 9% | = Taxable × 9% (if intra-state) |
| SGST @ 9% | = Taxable × 9% (if intra-state) |
| IGST @ 18% | = Taxable × 18% (if inter-state) |
| **Grand Total (₹)** | = Taxable + GST |
| Amount in Words | (Auto or manual) |

### BANK DETAILS SECTION
| Field | Example |
|---|---|
| Bank Name | (Your bank) |
| Account Name | (Company name) |
| Account No. | XXXXXXXXXXXXXXXX |
| IFSC Code | XXXXXX0000000 |
| Branch | (Branch name) |

### TERMS & CONDITIONS (Standard Clauses)
1. Payment due within 30 days of invoice date.
2. Cheque / NEFT / RTGS in favour of [Company Name].
3. Goods once sold will not be taken back.
4. Subject to [City] jurisdiction.
5. This is a computer-generated invoice.

### SIGNATURE SECTION
- Authorized Signatory name
- Designation
- Company stamp area
- Date of signing

---

## EXCEL BLUEPRINT — CELL-BY-CELL LAYOUT

```
ROW 1–3    : Company Header (merged cells A1:H3)
ROW 4      : Divider line
ROW 5–7    : Invoice Meta (Invoice No, Date, Place of Supply, W/O Ref)
ROW 8–10   : Bill To + Consignee (two-column split: A–D | E–H)
ROW 11     : Divider line
ROW 12     : Table Header Row
             A12: S.No | B12: Item Name | C12: Description |
             D12: SAC | E12: Brand | F12: Unit | G12: Qty |
             H12: Unit Price | I12: Amount
ROW 13–30  : Line Items (18 rows, expandable)
             I13 formula: =IF(G13="","",G13*H13)
             (Copy formula down to I30)
ROW 31     : BLANK separator
ROW 32     : Electrical Subtotal      → =SUM(I13:I30)
ROW 33     : Outstation Charges       → =I32*[%] OR manual input
ROW 34     : Taxable Amount           → =I32+I33
ROW 35     : IGST @ 18% / CGST+SGST  → =I34*0.18
ROW 36     : GRAND TOTAL              → =I34+I35
ROW 37     : Amount in Words          → Manual or SpellNumber macro
ROW 38–42  : Bank Details
ROW 43–47  : Terms & Conditions
ROW 48–50  : Signature block
```

### KEY EXCEL FORMULAS
```excel
# Amount per line item (Col I):
=IF(OR(G13="",H13=""), "", G13*H13)

# Subtotal:
=SUMPRODUCT((F13:F30<>"LS")*(G13:G30)*(H13:H30))
 + SUMPRODUCT((F13:F30="LS")*(H13:H30))

# Outstation charges (5% example):
=ROUND(I32*0.05, 2)

# Taxable Amount:
=I32+I33

# IGST (18%):
=ROUND(I34*0.18, 2)

# Grand Total:
=I34+I35

# Invoice Number Auto-suggestion (optional):
="APLE-"&TEXT(ROW()-12,"000")&"-25/26"

# Data Validation — Unit dropdown (Cell F13:F30):
Source: Rft,Nos,Sqft,LS,Set,Mtr,Box,Lot

# Data Validation — Tax Type dropdown:
Source: IGST 18%,CGST+SGST 9%+9%
```

---

## PDF DESIGN GUIDELINES

### TYPOGRAPHY
| Element | Font | Size | Style |
|---|---|---|---|
| Company Name | Montserrat / Calibri | 18pt | Bold |
| Section Headers | Calibri | 10pt | Bold, Uppercase |
| Table Headers | Calibri | 9pt | Bold, White on Dark BG |
| Body Text | Calibri | 9pt | Regular |
| Grand Total | Calibri | 11pt | Bold |
| Amount in Words | Calibri | 9pt | Italic |

### COLOR PALETTE (Professional / Minimal)
| Element | Color |
|---|---|
| Header background | #1A3C5E (dark navy) or #2E4057 |
| Table header row | #2E4057 or #3A7CA5 |
| Alternate row shading | #F2F6FA |
| Border lines | #CCCCCC |
| Accent / totals row | #EAF2FF |
| Text (primary) | #1A1A1A |
| Text (secondary) | #555555 |

### PAGE LAYOUT
```
Page Size     : A4 (210mm × 297mm)
Margins       : Top 15mm | Bottom 15mm | Left 20mm | Right 15mm
Orientation   : Portrait

HEADER ZONE   [top 35mm]
  - Logo (left, 25mm × 25mm)
  - Company Name + Address (center or right of logo)
  - INVOICE label (right-aligned, large, colored)
  - GSTIN, Phone, Email (right column)

META ZONE     [35mm–60mm]
  - Left block  : Bill To + Consignee details
  - Right block : Invoice No. | Date | Place of Supply | W/O Ref

ITEM TABLE    [60mm–200mm]
  - Full-width table
  - 9 columns with proportional widths
  - Alternating row colors
  - Last column right-aligned (amounts)

TOTALS ZONE   [200mm–230mm]
  - Right-aligned subtotals block
  - Bold Grand Total row with border
  - Amount in Words (full width, italic)

BANK DETAILS  [230mm–255mm]
  - Two-column: Bank info (left) | QR code or blank (right)

FOOTER ZONE   [255mm–282mm]
  - Terms (3–4 lines, small font)
  - Signature + Stamp (right side)
  - "Computer Generated Invoice" note (center, 7pt)
```

---

## STANDARDIZATION CHECKLIST

- [ ] Consistent invoice numbering format: `APLE-XXX-YY/YY`
- [ ] All amounts rounded to 2 decimal places
- [ ] SAC code present on every line item
- [ ] GSTIN of both parties always shown
- [ ] Place of supply determines IGST vs CGST+SGST split
- [ ] Outstation charges always labeled clearly (% or LS)
- [ ] Amount in words matches numeric grand total
- [ ] Bank details match registered company account
- [ ] Authorized signatory name printed below signature line
- [ ] Invoice date ≠ work order date (keep both distinct)
- [ ] Terms section always present (minimum 4 clauses)

---

*This prompt file was prepared for use with Gemini or any AI assistant capable of generating Excel and PDF design outputs. Attach your sample invoice PDFs (e.g., APLE-014-25/26, APLE-015-25/26) along with this prompt for best results.*
