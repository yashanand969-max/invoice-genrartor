const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

// Read logo as base64 for embedding directly in the HTML
const logoBase64 = fs.readFileSync(path.join(__dirname, 'logo/WhatsApp Image 2025-03-31 at 17.11.56_644e8239.jpg')).toString('base64');
const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;

// Read the Excel file
const inputFile = process.argv[2] || 'work/KusuongToiletBill.xlsx';
const baseName = path.basename(inputFile, '.xlsx').replace(/\s+/g, '');
const workbook = xlsx.readFile(path.resolve(__dirname, inputFile), { cellDates: true });
const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd-mm-yyyy' });
const data = rawData.map(row => Array.from(row).map(cell => (cell !== undefined && cell !== null) ? String(cell).trim() : ''));

// ====================== EXTRACT ALL DETAILS ======================

// Company Info
const companyName = 'M/S I FOUR U ENGINEERING SERVICES';
const companyAddress = 'House No. 329, New Karmik Nagar, PO ISM, Dhanbad, Jharkhand, 826004';
const companyPhone = '+91 7042220470';
const companyGSTIN = '20ARNPA8397C1ZX';

// Invoice Meta
const invoiceNo = data[3][2] || '17/CH/FY/25-26';
const invoiceDate = data[6][2] || '26/3/2026';
const placeOfSupply = data[6][6] || 'Kurseong, Darjeeling (WB)';
const transportMode = data[3][6] || 'Work at site';
const vehicleNo = data[4][6] || 'N/A';
const reverseCharge = 'No';
const woRef = data[15] ? data[15][1] || '' : '';

// Bill To
const billToName = data[9][2] || '';
const billToAddress = data[10][2] || '';
const billToState = data[12][2] || '';
const billToStateCode = data[13][2] || '';
const billToGSTIN = data[14][2] || '';

// Consignee
const consigneeName = data[9][5] || data[9][4] || billToName;
const consigneeAddress = data[10][5] || data[10][4] || billToAddress;
const consigneeState = data[12][5] || data[12][4] || billToState;
const consigneeStateCode = data[13][5] || data[13][4] || billToStateCode;
const consigneeGSTIN = data[14][5] || data[14][4] || billToGSTIN;

// W/O Reference
const workOrder = data[15][1] || '';

// ====================== ITEMS + SECTIONS ======================
const sections = [];
let currentSection = null;

for (let i = 18; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(' ').toUpperCase();
    
    // Stop at TOTAL row
    if (rowStr.includes('TOTAL') && !rowStr.includes('GRAND') && !rowStr.includes('SUB') && !rowStr.includes('GST') && !rowStr.includes('IGST') && !rowStr.includes('TAX')) {
        // Check if this is the main "TOTAL" summary row
        const cleanRow = [...row];
        while (cleanRow.length > 0 && String(cleanRow[cleanRow.length-1]).trim() === '') cleanRow.pop();
        const lastVal = parseFloat(String(cleanRow[cleanRow.length-1]||'').replace(/[^\d.-]/g,''));
        if (!isNaN(lastVal) && lastVal > 100000) break; // Main total
    }
    if (rowStr.includes('IGST') || rowStr.includes('GRAND TOTAL')) break;
    
    // Detect section headers (they have a Roman numeral or number in col 0, section name in col 1, and NO amount)
    const cleanRow = [...row];
    while (cleanRow.length > 0 && String(cleanRow[cleanRow.length-1]).trim() === '') cleanRow.pop();
    const lastVal = parseFloat(String(cleanRow[cleanRow.length-1]||'').replace(/[^\d.-]/g,''));
    
    // A section header has text in first 2 cols but no numeric amount at end
    const isHeader = (row[0] !== '' || (row[1] !== '' && row[2] === '')) && (isNaN(lastVal) || cleanRow.length <= 3);
    
    if (isHeader && (row[0] !== '' || row[1] !== '')) {
        const sectionName = (row[0] + ' ' + (row[1] || '')).trim();
        if (sectionName && !sectionName.includes('S NO') && sectionName.length > 0) {
            currentSection = { name: sectionName, items: [] };
            sections.push(currentSection);
            continue;
        }
    }
    
    // Try to extract item data
    if (!isNaN(lastVal) && lastVal > 0 && cleanRow.length >= 4) {
        const item = {
            sno: row[0] || row[1] || '',
            name: row[1] || row[2] || '',
            desc: row[2] || '',
            sac: row[3] || '',
            gstRate: row[4] || '18%',
            unit: row[5] || '',
            price: parseFloat(String(row[6]||'').replace(/[^\d.-]/g,'')) || 0,
            qty: parseFloat(String(row[7]||'').replace(/[^\d.-]/g,'')) || 0,
            amount: lastVal
        };
        
        // If sno is empty and first non-empty is a letter, use as sub-item
        if (!row[0] && row[1]) {
            item.sno = row[1];
            item.name = row[2] || '';
            item.desc = row[2] || '';
        }
        
        if (currentSection) {
            currentSection.items.push(item);
        } else {
            if (!currentSection) {
                currentSection = { name: 'General', items: [] };
                sections.push(currentSection);
            }
            currentSection.items.push(item);
        }
    }
}

// ====================== TOTALS ======================
let totalAmount = 0;
let igstAmount = 0;
let grandTotal = 0;
let amountInWords = '';

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(' ').toUpperCase();
    
    // Find IGST row first (it's unique)
    if (rowStr.includes('IGST') && !rowStr.includes('HSN') && !rowStr.includes('S NO')) {
        const cleanRow = [...row]; 
        while (cleanRow.length > 0 && String(cleanRow[cleanRow.length-1]).trim() === '') cleanRow.pop();
        const v = parseFloat(String(cleanRow[cleanRow.length-1]||'').replace(/[^\d.-]/g,''));
        if (!isNaN(v) && v > 100 && igstAmount === 0) igstAmount = v;
    }
    // GRAND TOTAL - take the LAST (largest) one since first might be subtotal
    if (rowStr.includes('GRAND TOTAL')) {
        const cleanRow = [...row]; 
        while (cleanRow.length > 0 && String(cleanRow[cleanRow.length-1]).trim() === '') cleanRow.pop();
        const v = parseFloat(String(cleanRow[cleanRow.length-1]||'').replace(/[^\d.-]/g,''));
        if (!isNaN(v) && v > 0) grandTotal = v; // always take the last GRAND TOTAL
    }
    // Amount in words
    if (rowStr.includes('LAKH') || rowStr.includes('RUPEES') || rowStr.includes('TOTAL-') || rowStr.includes('PAISA')) {
        const idx = row.findIndex(c => c.toUpperCase().includes('TOTAL-') || c.toUpperCase().includes('RUPEES') || c.toUpperCase().includes('PAISA'));
        if (idx !== -1) {
            amountInWords = row[idx].replace(/^Total-\s*/i, '').trim();
        }
    }
}
// Calculate totalAmount as grandTotal minus IGST
if (grandTotal > 0 && igstAmount > 0 && totalAmount === 0) {
    totalAmount = grandTotal - igstAmount;
}

// ====================== GST TABLE (auto-detect from HSN/SAC header) ======================
const gstRows = [];
let gstTableStart = -1;
for (let i = 0; i < data.length; i++) {
    const rowStr = data[i].join(' ').toUpperCase();
    if (rowStr.includes('HSN/SAC') && rowStr.includes('TAX RATE')) {
        gstTableStart = i + 1; // skip the header row
        break;
    }
}
if (gstTableStart > 0) {
    for (let i = gstTableStart; i < data.length; i++) {
        const row = data[i];
        const rowStr = row.join(' ').toUpperCase();
        if (rowStr.includes('BANK') || rowStr.includes('TERMS')) break;
        if (row[0] || row[1]) {
            gstRows.push({
                sno: row[0] || '',
                hsnSac: row[1] || '',
                taxRate: row[3] || '',
                taxableAmount: row[4] || '',
                igstAmt: row[6] || row[7] || '',
                totalTax: row[7] || row[8] || ''
            });
        }
    }
}

// ====================== FORMAT NUMBER ======================
function fmt(num) {
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ====================== BUILD HTML ======================
function buildItemRows() {
    let html = '';
    let globalSerialNo = 0;
    
    for (const section of sections) {
        // Section header row
        html += `<tr class="section-header"><td colspan="8" class="font-bold text-blue-900 bg-blue-50 text-sm py-2 px-3 border-l-4 border-blue-800">${section.name}</td></tr>\n`;
        
        for (const item of section.items) {
            globalSerialNo++;
            html += `<tr class="${globalSerialNo % 2 === 0 ? 'bg-slate-50/50' : ''}">
                <td class="text-center text-slate-500">${item.sno}</td>
                <td class="font-medium text-slate-800">${item.name !== item.desc ? item.name : ''}</td>
                <td class="text-slate-600">${item.desc}</td>
                <td class="text-center text-slate-500">${item.sac}</td>
                <td class="text-center">${item.unit}</td>
                <td class="text-right">${fmt(item.price)}</td>
                <td class="text-right">${item.qty}</td>
                <td class="text-right font-semibold text-slate-800">₹ ${fmt(item.amount)}</td>
            </tr>\n`;
        }
    }
    return html;
}

function buildGstTable() {
    if (gstRows.length === 0) return '';
    
    let html = `
    <div class="avoid-break" style="margin-top:10px; margin-bottom:10px;">
        <h3 style="font-family:'Montserrat',sans-serif; color:#1e3a8a; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
            GST Tax Breakdown
        </h3>
        <table class="gst-table">
            <thead><tr>
                <th style="width:8%; text-align:center;">S.No</th>
                <th style="width:20%;">HSN/SAC</th>
                <th style="width:15%; text-align:center;">Tax Rate</th>
                <th style="width:22%; text-align:right;">Taxable Amount</th>
                <th style="width:17%; text-align:right;">IGST Amt.</th>
                <th style="width:18%; text-align:right;">Total Tax</th>
            </tr></thead>
            <tbody>`;
    
    for (const g of gstRows) {
        // Skip header row and rows where HSN/SAC is missing or undefined
        if (!g.hsnSac || g.hsnSac === 'S NO.' || g.hsnSac === 'undefined' || g.sno === 'S NO.') continue;
        const isTotalRow = g.hsnSac.toUpperCase() === 'TOTAL';
        html += `<tr style="${isTotalRow ? 'background:#eff6ff; font-weight:700;' : ''}">
            <td style="text-align:center;">${g.sno}</td>
            <td style="${isTotalRow ? 'font-weight:700;' : ''}">${g.hsnSac}</td>
            <td style="text-align:center;">${g.taxRate || '-'}</td>
            <td style="text-align:right;">${g.taxableAmount && g.taxableAmount !== '0' ? '\u20b9 ' + g.taxableAmount : '-'}</td>
            <td style="text-align:right;">${g.igstAmt && g.igstAmt !== '0' ? '\u20b9 ' + g.igstAmt : '-'}</td>
            <td style="text-align:right;">${g.totalTax && g.totalTax !== '0' ? '\u20b9 ' + g.totalTax : '-'}</td>
        </tr>`;
    }
    
    html += `</tbody></table></div>`;
    return html;
}

const invoiceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNo}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #1e3a8a; --primary-light: #3b82f6; --border: #e2e8f0; --bg-alt: #f8fafc; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f1f5f9; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .heading-font { font-family: 'Montserrat', sans-serif; }
        
        .a4-page {
            width: 210mm; min-height: 297mm; margin: 0 auto; background: white;
            position: relative; box-sizing: border-box;
            padding: 12mm 15mm;
        }
        
        /* Main items table */
        table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
        th, td { border: 1px solid var(--border); padding: 4px 6px; }
        th { background-color: var(--primary); color: white; font-weight: 600; border-color: rgba(255,255,255,0.15); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* GST table styling */
        .gst-table th { background-color: #065f46; }
        .gst-table { margin-top: 4px; }
        
        .section-header td { border-left-color: var(--primary) !important; }
        .bg-slate-50\\/50 { background-color: rgba(248,250,252,0.5); }
        .bg-blue-50 { background-color: #eff6ff; }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        
        .text-blue-900 { color: #1e3a8a; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-800 { color: #1e293b; }
        .text-green-700 { color: #15803d; }
        
        .avoid-break { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important; 
            display: table; 
            width: 100%; 
        }
        tr { page-break-inside: avoid !important; break-inside: avoid !important; }
        
        @media print {
            body { background: white; margin: 0; padding: 0; }
            .a4-page { box-shadow: none; margin: 0; padding: 10mm; width: 100%; }
        }
    </style>
</head>
<body>
<div class="a4-page">
    <!-- ============ HEADER ============ -->
    <header style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:2px solid var(--primary); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
            <img src="${logoDataUri}" alt="Logo" style="height:70px; width:70px; object-fit:contain; border-radius:6px; border:1px solid #e2e8f0;">
            <div>
                <h1 class="heading-font" style="font-size:16px; color:#000000; text-transform:uppercase; letter-spacing:1px; font-weight:800;">${companyName}</h1>
                <p style="font-size:8px; color:#374151; font-weight:600; margin-top:3px; max-width:300px;">${companyAddress}</p>
                <p style="font-size:8px; color:#374151; font-weight:600; margin-top:2px;">
                    GSTIN: <span style="background:#fef9c3; padding:0 4px; border-radius:3px; font-weight:700; color:#000;">${companyGSTIN}</span>
                    &nbsp;|&nbsp; MSME: <span style="background:#e0f2fe; padding:0 4px; border-radius:3px; font-weight:700; color:#000;">UDYAM-JH-04-0027514</span>
                    &nbsp;|&nbsp; Ph: <span style="font-weight:600;">${companyPhone}</span>
                </p>
            </div>
        </div>
        <div style="text-align:right;">
            <h2 class="heading-font" style="font-size:28px; color:#1e3a8a; letter-spacing:3px; opacity:0.85;">INVOICE</h2>
            <p style="font-size:7px; color:#94a3b8; margin-top:2px;">TAX INVOICE</p>
        </div>
    </header>

    <!-- ============ META DETAILS ============ -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px; font-size:8px;">
        <!-- Left: Bill To + Consignee -->
        <div style="display:flex; gap:10px;">
            <div style="flex:1; border:1px solid var(--border); border-radius:6px; padding:8px;">
                <h3 class="heading-font" style="font-size:7px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Bill To</h3>
                <p style="font-size:9px; font-weight:600; margin-bottom:2px;">${billToName}</p>
                <p style="color:#475569; line-height:1.4;">${billToAddress}</p>
                <p style="margin-top:3px; color:#475569;">State: ${billToState} (${billToStateCode}) &nbsp;|&nbsp; GSTIN: <span style="font-family:monospace; background:#f1f5f9; padding:0 3px; border-radius:2px;">${billToGSTIN}</span></p>
            </div>
            <div style="flex:1; border:1px solid var(--border); border-radius:6px; padding:8px;">
                <h3 class="heading-font" style="font-size:7px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Consignee (Site)</h3>
                <p style="font-size:9px; font-weight:600; margin-bottom:2px;">${consigneeName}</p>
                <p style="color:#475569; line-height:1.4;">${consigneeAddress}</p>
                <p style="margin-top:3px; color:#475569;">State: ${consigneeState} (${consigneeStateCode})</p>
            </div>
        </div>
        
        <!-- Right: Invoice Meta -->
        <div style="background:#f8fafc; border:1px solid var(--border); border-radius:6px; padding:8px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 12px;">
                <span style="color:#64748b;">Invoice No:</span>
                <span style="font-weight:700; color:#1e3a8a; font-family:'Montserrat',sans-serif; border-bottom:1.5px solid #1e3a8a; padding-bottom:1px;">${invoiceNo}</span>
                
                <span style="color:#64748b;">Invoice Date:</span>
                <span style="font-weight:500;">${invoiceDate}</span>
                
                <span style="color:#64748b;">Place of Supply:</span>
                <span style="font-weight:500;">${placeOfSupply}</span>
                
                <span style="color:#64748b;">Transport Mode:</span>
                <span style="font-weight:500;">${transportMode}</span>
                
                <span style="color:#64748b;">Vehicle No:</span>
                <span style="font-weight:500;">${vehicleNo}</span>
                
                <span style="color:#64748b;">Reverse Charge:</span>
                <span style="font-weight:500;">${reverseCharge}</span>
                ${workOrder ? `<span style="color:#64748b;">W/O Ref:</span><span style="font-weight:500;">${workOrder}</span>` : ''}
            </div>
        </div>
    </div>

    <!-- ============ ITEMS TABLE ============ -->
    <div style="margin-bottom: 20px;">
        <table>
            <thead><tr>
                <th style="width:4%; text-align:center;">S.No</th>
                <th style="width:16%;">Item Name</th>
                <th style="width:32%;">Description</th>
                <th style="width:8%; text-align:center;">SAC</th>
                <th style="width:6%; text-align:center;">Unit</th>
                <th style="width:10%; text-align:right;">Price</th>
                <th style="width:8%; text-align:right;">Qty</th>
                <th style="width:14%; text-align:right;">Amount (₹)</th>
            </tr></thead>
            <tbody>
                ${buildItemRows()}
            </tbody>
        </table>
    </div>

    <!-- ============ GST TAX BREAKDOWN TABLE (between items and totals) ============ -->
    ${buildGstTable()}

    <!-- ============ TOTALS AND FOOTER SECTION ============ -->
    <div class="avoid-break" style="margin-top:auto; padding-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:2px solid var(--border); padding-top:10px;">
            <!-- Amount in words + Bank -->
            <div style="width:48%; font-size:8px;">
                <div style="margin-bottom:8px;">
                    <p style="color:#64748b; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; font-size:7px; margin-bottom:2px;">Amount in Words:</p>
                    <p style="font-style:italic; font-weight:500; color:#1e293b;">${amountInWords}</p>
                </div>
                <div style="background:#eff6ff; padding:8px; border-radius:6px; border:1px solid #bfdbfe;">
                    <h3 class="heading-font" style="font-size:8px; color:#1e3a8a; text-transform:uppercase; margin-bottom:4px; font-weight:700;">Bank Details</h3>
                    <div style="display:grid; grid-template-columns:70px 1fr; gap:2px;">
                        <span style="color:#64748b;">Bank:</span> <span style="font-weight:500;">HDFC BANK</span>
                        <span style="color:#64748b;">A/C No:</span> <span style="font-weight:500; letter-spacing:0.5px;">50200073035859</span>
                        <span style="color:#64748b;">IFSC:</span> <span style="font-weight:500;">HDFC0002679</span>
                        <span style="color:#64748b;">Branch:</span> <span style="font-weight:500;">Sri Ram City, Saraidhela, Dhanbad 828127</span>
                    </div>
                </div>
            </div>
            
            <!-- Math block -->
            <div style="width:42%; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border); font-size:9px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                    <span style="color:#475569;">Total (Before Tax):</span>
                    <span style="font-weight:600;">₹ ${fmt(totalAmount)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed #cbd5e1;">
                    <span style="color:#475569;">IGST @ 18%:</span>
                    <span style="font-weight:500;">₹ ${fmt(igstAmount)}</span>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; background:#1e3a8a; color:white; padding:8px 10px; margin:-4px -4px -4px -4px; border-radius:6px; font-size:12px; font-weight:700;">
                    <span class="heading-font">GRAND TOTAL</span>
                    <span>₹ ${fmt(grandTotal)}</span>
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-size:7px;">
            <div style="width:50%;">
                <h4 style="font-weight:700; color:#1e293b; text-transform:uppercase; margin-bottom:3px; font-size:7px;">Terms & Conditions</h4>
                <ol style="padding-left:12px; color:#64748b; line-height:1.5;">
                    <li>Payment due within 45 days of invoice date.</li>
                    <li>Cheque/NEFT in favour of "I FOUR U ENGINEERING SERVICES".</li>
                    <li>Goods once sold will not be taken back.</li>
                    <li>Subject to Dhanbad jurisdiction.</li>
                </ol>
                <p style="color:#94a3b8; font-style:italic; margin-top:4px; font-size:6px;">This is a computer-generated invoice.</p>
            </div>
            <div style="text-align:center; width:140px;">
                <p style="font-size:7px; color:#64748b; margin-bottom:2px;">Certified that the particulars given above are true and correct</p>
                <div style="border-top:1px solid #cbd5e1; padding-top:25px; margin-top:4px;">
                    <p style="font-weight:700; color:#1e293b; font-size:8px;">Authorized Signatory</p>
                    <p style="color:#64748b; font-size:7px;">For I FOUR U ENGINEERING SERVICES</p>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;

// ====================== GENERATE PDF & EXCEL ======================
async function generate() {
    // 1. Save HTML
    const safeNo = invoiceNo.replace(/[\/\\]/g, '-');
    const htmlPath = path.join(__dirname, 'new_invoices_pdf', `${safeNo}_${baseName}_INVOICE.html`);
    fs.writeFileSync(htmlPath, invoiceHTML);
    console.log('Saved HTML:', htmlPath);
    
    // 2. Generate PDF via Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(invoiceHTML, { waitUntil: 'networkidle0' });
    
    const pdfPath = path.join(__dirname, 'new_invoices_pdf', `${safeNo}_${baseName}_INVOICE.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await page.close();
    await browser.close();
    console.log('Generated PDF:', pdfPath);
    
    // 3. Generate Excel via ExcelJS
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Invoice');
    
    ws.columns = [
        { width: 6 }, { width: 20 }, { width: 45 }, { width: 12 },
        { width: 10 }, { width: 8 }, { width: 12 }, { width: 10 }, { width: 18 }
    ];
    
    // Header
    ws.mergeCells('A1:I3');
    ws.getCell('A1').value = `${companyName}\n${companyAddress}\nGSTIN: ${companyGSTIN} | Ph: ${companyPhone}`;
    ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    
    // Invoice Meta
    ws.getCell('A5').value = "Bill To:"; ws.getCell('A5').font = { bold: true };
    ws.getCell('A6').value = billToName; ws.getCell('A6').font = { bold: true };
    ws.getCell('A7').value = billToAddress;
    ws.getCell('A7').alignment = { wrapText: true };
    ws.getCell('A8').value = `State: ${billToState} (${billToStateCode}) | GSTIN: ${billToGSTIN}`;
    
    ws.getCell('F5').value = "Consignee:"; ws.getCell('F5').font = { bold: true };
    ws.getCell('F6').value = consigneeName; ws.getCell('F6').font = { bold: true };
    ws.getCell('F7').value = consigneeAddress;
    ws.getCell('F7').alignment = { wrapText: true };
    
    ws.getCell('H5').value = "Invoice No:"; ws.getCell('I5').value = invoiceNo;
    ws.getCell('H6').value = "Date:"; ws.getCell('I6').value = invoiceDate;
    ws.getCell('H7').value = "POS:"; ws.getCell('I7').value = placeOfSupply;
    ws.getCell('H8').value = "W/O:"; ws.getCell('I8').value = workOrder;
    
    // Table Headers
    const headers = ['S.No', 'Item Name', 'Description', 'SAC', 'GST Rate', 'Unit', 'Price', 'Qty', 'Amount'];
    ws.getRow(10).values = headers;
    ws.getRow(10).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(10).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    let rIdx = 11;
    for (const section of sections) {
        // Section header
        ws.mergeCells(`A${rIdx}:I${rIdx}`);
        ws.getCell(`A${rIdx}`).value = section.name;
        ws.getCell(`A${rIdx}`).font = { bold: true, color: { argb: 'FF1E3A8A' } };
        ws.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        rIdx++;
        
        for (const item of section.items) {
            ws.getRow(rIdx).values = [item.sno, item.name, item.desc, item.sac, item.gstRate, item.unit, item.price, item.qty, item.amount];
            ws.getCell(`G${rIdx}`).numFmt = '#,##0.00';
            ws.getCell(`I${rIdx}`).numFmt = '#,##0.00';
            ws.getRow(rIdx).alignment = { wrapText: true, vertical: 'top' };
            ws.getRow(rIdx).eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
            rIdx++;
        }
    }
    
    // Totals
    rIdx += 1;
    ws.getCell(`H${rIdx}`).value = "TOTAL"; ws.getCell(`I${rIdx}`).value = totalAmount; ws.getCell(`I${rIdx}`).numFmt = '#,##0.00'; rIdx++;
    ws.getCell(`H${rIdx}`).value = "IGST 18%"; ws.getCell(`I${rIdx}`).value = igstAmount; ws.getCell(`I${rIdx}`).numFmt = '#,##0.00'; rIdx++;
    ws.getCell(`H${rIdx}`).value = "GRAND TOTAL"; ws.getCell(`H${rIdx}`).font = { bold: true, size: 12 };
    ws.getCell(`I${rIdx}`).value = grandTotal; ws.getCell(`I${rIdx}`).numFmt = '#,##0.00'; ws.getCell(`I${rIdx}`).font = { bold: true, size: 12 };
    rIdx += 2;
    
    // GST Table
    ws.getCell(`A${rIdx}`).value = "GST TAX BREAKDOWN"; ws.getCell(`A${rIdx}`).font = { bold: true, color: { argb: 'FF065F46' } }; rIdx++;
    const gstHeaders = ['S.No', 'HSN/SAC', '', 'Tax Rate', 'Taxable Amt', '', '', 'IGST Amt.', 'Total Tax'];
    ws.getRow(rIdx).values = gstHeaders;
    ws.getRow(rIdx).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(rIdx).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
        c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    rIdx++;
    
    for (const g of gstRows) {
        if (g.sno === 'S NO.') continue;
        ws.getRow(rIdx).values = [g.sno, g.hsnSac, '', g.taxRate, g.taxableAmount, '', '', g.igstAmt, g.totalTax];
        ws.getRow(rIdx).eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
        rIdx++;
    }
    
    // Bank + Terms
    rIdx += 2;
    ws.getCell(`A${rIdx}`).value = "Bank Details"; ws.getCell(`A${rIdx}`).font = { bold: true }; rIdx++;
    ws.getCell(`A${rIdx}`).value = "Bank Name and A/C No. : HDFC BANK , 50200073035859"; rIdx++;
    ws.getCell(`A${rIdx}`).value = "Bank IFSC and Address : HDFC0002679 , Sri Ram City Saraidhela, 828127"; rIdx += 2;
    ws.getCell(`A${rIdx}`).value = "Amount in Words: " + amountInWords; ws.getCell(`A${rIdx}`).font = { italic: true };
    
    const excelPath = path.join(__dirname, 'new_invoices_excel', `${safeNo}_${baseName}_INVOICE.xlsx`);
    await wb.xlsx.writeFile(excelPath);
    console.log('Generated Excel:', excelPath);
    
    console.log(`\n✅ All done! PDF, HTML, and Excel generated for ${baseName}.`);
    console.log(`  Items: ${sections.reduce((a, s) => a + s.items.length, 0)} | Sections: ${sections.length}`);
    console.log(`  Total: ₹${fmt(totalAmount)} | IGST: ₹${fmt(igstAmount)} | Grand Total: ₹${fmt(grandTotal)}`);
}

generate();
