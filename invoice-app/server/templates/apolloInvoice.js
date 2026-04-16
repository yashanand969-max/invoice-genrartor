const fs = require('fs');
const path = require('path');

// Extract the logic to read and render
function extractDataFromRaw(data) {
    const companyName = 'M/S I FOUR U ENGINEERING SERVICES';
    const companyAddress = 'House No. 329, New Karmik Nagar, PO ISM, Dhanbad, Jharkhand, 826004';
    const companyPhone = '+91 7042220470';
    const companyGSTIN = '20ARNPA8397C1ZX';

    // Meta
    const invoiceNo = data[3] && data[3][2] ? data[3][2] : 'APLC-014-25/26';
    const invoiceDate = data[6] && data[6][2] ? data[6][2] : '15/10/2025';
    const placeOfSupply = data[6] && data[6][6] ? data[6][6] : 'Jorebunglow, Darjeeling, WB';
    const workOrder = data[15] && data[15][1] ? data[15][1] : '';

    // Receivers
    const billToName = data[9] && data[9][2] ? data[9][2] : '';
    const billToAddress = data[10] && data[10][2] ? data[10][2] : '';
    const billToState = data[12] && data[12][2] ? data[12][2] : '';
    const billToStateCode = data[13] && data[13][2] ? data[13][2] : '';
    const billToGSTIN = data[14] && data[14][2] ? data[14][2] : '';

    const consigneeName = data[9] ? (data[9][6] || data[9][5] || billToName) : billToName;
    const consigneeAddress = data[10] ? (data[10][6] || data[10][5] || billToAddress) : billToAddress;

    // Items (Rows 18 to end of table)
    const sections = [];
    let currentSection = null;
    let outstationCharges = 0;

    for (let i = 18; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        const rowStr = row.join(' ').toUpperCase();
        
        if (rowStr.includes('OUTSTATION CHARGES')) {
            const cleanRow = [...row].filter(c => String(c).trim() !== '');
            outstationCharges = parseFloat(String(cleanRow[cleanRow.length-1]||'').replace(/[^\d.-]/g,'')) || 0;
            continue;
        }
        
        if (rowStr.includes('SUB TOTAL') || rowStr.includes('GRAND TOTAL') || rowStr.includes('TOTAL IGST')) break;

        // Detect section headers (Row 19: CIVIL WORKS)
        if (row[1] !== '' && row[0] === '' && (row[6] === '' || row[6] === undefined)) {
            currentSection = { name: row[1], items: [] };
            sections.push(currentSection);
            continue;
        }

        // Try to extract item
        const cleanRow = [...row].filter(c => String(c).trim() !== '');
        const lastVal = cleanRow.length > 0 ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;

        if (!isNaN(lastVal) && lastVal > 0 && cleanRow.length >= 7) {
            const item = {
                sno: row[0] || '',
                name: row[1] || '',
                desc: row[2] || '',
                sac: row[3] || '',
                product: row[4] || '',
                unit: row[5] || '',
                price: parseFloat(String(row[6]||'').replace(/[^\d.-]/g,'')) || 0,
                qty: parseFloat(String(row[7]||'').replace(/[^\d.-]/g,'')) || 0,
                amount: lastVal
            };
            if (!currentSection) {
                currentSection = { name: 'Items', items: [] };
                sections.push(currentSection);
            }
            currentSection.items.push(item);
        }
    }

    // Totals
    let totalAmount = 0;
    let igstAmount = 0;
    let grandTotal = 0;
    let amountInWords = '';

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if(!row) continue;
        const rowStr = row.join(' ').toUpperCase();
        if (rowStr.includes('CIVIL TOTAL') || (rowStr.includes('TOTAL') && !rowStr.includes('GRAND') && !rowStr.includes('IGST'))) {
            const cleanRow = [...row].filter(c=>String(c).trim()!=='');
            const v = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(v) && v > 0 && totalAmount === 0) totalAmount = v;
        }
        if (rowStr.includes('IGST')) {
            const cleanRow = [...row].filter(c=>String(c).trim()!=='');
            const v = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(v) && v > 0 && igstAmount === 0) igstAmount = v;
        }
        if (rowStr.includes('GRAND TOTAL')) {
            const cleanRow = [...row].filter(c=>String(c).trim()!=='');
            const v = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(v) && v > 0) grandTotal = v;
        }
        if (rowStr.includes('RUPEES (IN WORDS)') || rowStr.includes('PAISA ONLY')) {
            amountInWords = row.join(' ').split(':').pop().trim();
        }
    }

    if (totalAmount === 0) totalAmount = sections.reduce((a, s) => a + s.items.reduce((aa, ii) => aa + ii.amount, 0), 0);
    const taxableAmount = totalAmount + outstationCharges;
    if (igstAmount === 0) igstAmount = taxableAmount * 0.18;
    if (grandTotal === 0) grandTotal = taxableAmount + igstAmount;

    return {
        companyName, companyAddress, companyPhone, companyGSTIN,
        invoiceNo, invoiceDate, placeOfSupply, workOrder,
        billToName, billToAddress, billToState, billToStateCode, billToGSTIN,
        consigneeName, consigneeAddress,
        sections, outstationCharges, totalAmount, igstAmount, grandTotal, amountInWords
    };
}

function fmt(num) {
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderFromData(extractedData) {
    const {
        companyName, companyAddress, companyPhone, companyGSTIN,
        invoiceNo, invoiceDate, placeOfSupply, workOrder,
        billToName, billToAddress, billToState, billToStateCode, billToGSTIN,
        consigneeName, consigneeAddress,
        sections, outstationCharges, totalAmount, igstAmount, grandTotal, amountInWords
    } = extractedData;

    let logoDataUri = '';
    try {
        const logoPath = path.join(__dirname, '..', 'assets', 'logo.jpg');
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoDataUri = `data:image/jpeg;base64,${logoBase64}`;
    } catch (e) {
        // Fallback or empty
    }

    let itemRowsHtml = '';
    let globalSerialNo = 0;
    for (const section of sections||[]) {
        itemRowsHtml += `<tr class="section-header"><td colspan="9" class="font-bold text-blue-900 bg-blue-50 text-sm py-2 px-3 border-l-4 border-blue-800">${section.name}</td></tr>\n`;
        for (const item of section.items) {
            globalSerialNo++;
            itemRowsHtml += `<tr class="${globalSerialNo % 2 === 0 ? 'bg-slate-50/50' : ''}">
                <td class="text-center text-slate-500">${item.sno}</td>
                <td class="font-medium text-slate-800">${item.name}</td>
                <td class="text-slate-600">${item.desc}</td>
                <td class="text-center text-slate-500">${item.sac}</td>
                <td class="text-center text-slate-500">${item.product}</td>
                <td class="text-center">${item.unit}</td>
                <td class="text-right">${fmt(item.price)}</td>
                <td class="text-right">${item.qty}</td>
                <td class="text-right font-semibold text-slate-800">₹ ${fmt(item.amount)}</td>
            </tr>\n`;
        }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNo}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #1e3a8a; --border: #e2e8f0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f1f5f9; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .heading-font { font-family: 'Montserrat', sans-serif; }
        .a4-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 12mm 15mm; display: flex; flex-direction: column; }
        table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
        th, td { border: 1px solid var(--border); padding: 4px 6px; }
        th { background-color: var(--primary); color: white; font-weight: 600; text-transform: uppercase; font-size: 0.6rem; letter-spacing: 0.5px; }
        .section-header td { border-left-color: var(--primary) !important; }
        .text-center { text-align: center; } .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .bg-blue-50 { background-color: #eff6ff; }
        .bg-slate-50/50 { background-color: #f8fafc; }
    </style>
</head>
<body>
<div class="a4-page">
    <header style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:2px solid var(--primary); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
            ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="height:70px; width:70px; object-fit:contain; border-radius:6px; border:1px solid #e2e8f0;">` : ''}
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
            <h2 class="heading-font" style="font-size:28px; color:#1e3a8a; letter-spacing:3px;">INVOICE</h2>
            <p style="font-size:7px; color:#94a3b8; margin-top:2px;">TAX INVOICE</p>
        </div>
    </header>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px; font-size:8px;">
        <div style="display:flex; gap:10px;">
            <div style="flex:1; border:1px solid var(--border); border-radius:6px; padding:8px;">
                <h3 class="heading-font" style="font-size:7px; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Bill To</h3>
                <p style="font-size:9px; font-weight:600; margin-bottom:2px;">${billToName}</p>
                <p style="color:#475569; line-height:1.4;">${billToAddress}</p>
                <p style="margin-top:3px; color:#475569;">State: ${billToState} (${billToStateCode}) | GSTIN: ${billToGSTIN}</p>
            </div>
            <div style="flex:1; border:1px solid var(--border); border-radius:6px; padding:8px;">
                <h3 class="heading-font" style="font-size:7px; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Consignee Site</h3>
                <p style="font-size:9px; font-weight:600; margin-bottom:2px;">${consigneeName}</p>
                <p style="color:#475569; line-height:1.4;">${consigneeAddress}</p>
            </div>
        </div>
        <div style="background:#f8fafc; border:1px solid var(--border); border-radius:6px; padding:8px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 12px;">
                <span style="color:#64748b;">Invoice No:</span> <span style="font-weight:700; color:#1e3a8a;">${invoiceNo}</span>
                <span style="color:#64748b;">Invoice Date:</span> <span style="font-weight:500;">${invoiceDate}</span>
                <span style="color:#64748b;">Place of Supply:</span> <span style="font-weight:500;">${placeOfSupply}</span>
                <span style="color:#64748b;">W/O Ref:</span> <span style="font-weight:500;">${workOrder}</span>
            </div>
        </div>
    </div>

    <div style="flex:1;">
        <table>
            <thead><tr>
                <th style="width:4%;">S.No</th>
                <th style="width:14%;">Item Name</th>
                <th style="width:28%;">Description</th>
                <th style="width:7%;">SAC</th>
                <th style="width:10%;">Product</th>
                <th style="width:5%;">Unit</th>
                <th style="width:8%;">Price</th>
                <th style="width:7%;">Qty</th>
                <th style="width:12%;">Amount</th>
            </tr></thead>
            <tbody>${itemRowsHtml}</tbody>
        </table>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:2px solid var(--border); margin-top:8px; padding-top:10px;">
        <div style="width:48%; font-size:8px;">
            <p style="font-weight:700; margin-bottom:2px;">Amount in Words:</p>
            <p style="font-style:italic;">${amountInWords}</p>
            <div style="background:#eff6ff; padding:8px; border-radius:6px; border:1px solid #bfdbfe; margin-top:10px;">
                <h3 style="font-size:8px; font-weight:700; color:#1e3a8a;">Bank Details</h3>
                <p>Bank: HDFC BANK | A/C: 50200073035859 | IFSC: HDFC0002679</p>
            </div>
        </div>
        <div style="width:42%; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border); font-size:9px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>Items Total:</span><span>₹ ${fmt(totalAmount)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>Outstation Charges:</span><span>₹ ${fmt(outstationCharges)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed #cbd5e1;"><span>IGST @ 18%:</span><span>₹ ${fmt(igstAmount)}</span></div>
            <div style="display:flex; justify-content:space-between; background:#1e3a8a; color:white; padding:8px 10px; border-radius:6px; font-size:12px; font-weight:700;">
                <span>GRAND TOTAL</span><span>₹ ${fmt(grandTotal)}</span>
            </div>
        </div>
    </div>

    <footer style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-size:7px;">
        <div style="width:50%;">
            <ol style="padding-left:12px; color:#64748b;">
                <li>Payment due within 45 days.</li>
                <li>Cheque/NEFT in favour of "I FOUR U ENGINEERING SERVICES".</li>
            </ol>
        </div>
        <div style="text-align:center;">
            <div style="border-top:1px solid #cbd5e1; padding-top:25px;">
                <p style="font-weight:700;">Authorized Signatory</p>
            </div>
        </div>
    </footer>
</div>
</body>
</html>`;
}

function extractAndRender(rawData) {
    const data = extractDataFromRaw(rawData);
    const html = renderFromData(data);
    return { data, html };
}

module.exports = {
    extractAndRender,
    renderFromData
};
