const fs = require('fs');
const path = require('path');
const { renderSourceAppendix } = require('./sourceAppendix');

function extractDataFromRaw(data, sourceWorkbook) {
    const companyName = 'M/S I FOUR U ENGINEERING SERVICES';
    const companyAddress = 'House No. 329, New Karmik Nagar, PO ISM, Dhanbad, Jharkhand, 826004';
    const companyPhone = '+91 7042220470';
    const companyGSTIN = '20ARNPA8397C1ZX';

    const invoiceNo = data[3] && data[3][2] ? data[3][2] : '17/CH/FY/25-26';
    const invoiceDate = data[6] && data[6][2] ? data[6][2] : '26/3/2026';
    const placeOfSupply = data[6] && data[6][6] ? data[6][6] : 'Kurseong, Darjeeling (WB)';
    const transportMode = data[3] && data[3][6] ? data[3][6] : 'Work at site';
    const vehicleNo = data[4] && data[4][6] ? data[4][6] : 'N/A';
    const reverseCharge = 'No';
    const workOrder = data[15] && data[15][1] ? data[15][1] : '';

    const billToName = data[9] && data[9][2] ? data[9][2] : '';
    const billToAddress = data[10] && data[10][2] ? data[10][2] : '';
    const billToState = data[12] && data[12][2] ? data[12][2] : '';
    const billToStateCode = data[13] && data[13][2] ? data[13][2] : '';
    const billToGSTIN = data[14] && data[14][2] ? data[14][2] : '';

    const consigneeName = data[9] ? (data[9][5] || data[9][4] || billToName) : billToName;
    const consigneeAddress = data[10] ? (data[10][5] || data[10][4] || billToAddress) : billToAddress;
    const consigneeState = data[12] ? (data[12][5] || data[12][4] || billToState) : billToState;
    const consigneeStateCode = data[13] ? (data[13][5] || data[13][4] || billToStateCode) : billToStateCode;

    // Items
    const sections = [];
    let currentSection = null;
    const itemHeader = data.find(row => {
        const rowStr = (row || []).join(' ').toUpperCase();
        return rowStr.includes('S NO') && rowStr.includes('ITEM NAME');
    }) || [];
    const hasGstRateColumn = itemHeader.some(cell => String(cell).toUpperCase().includes('GST RATE'));
    const unitCol = hasGstRateColumn ? 5 : 4;
    const priceCol = hasGstRateColumn ? 6 : 5;
    const qtyCol = hasGstRateColumn ? 7 : 6;

    for (let i = 18; i < data.length; i++) {
        const row = data[i];
        if(!row) continue;
        const rowStr = row.join(' ').toUpperCase();
        
        if (rowStr.includes('TOTAL') && !rowStr.includes('GRAND') && !rowStr.includes('SUB') && !rowStr.includes('GST') && !rowStr.includes('IGST') && !rowStr.includes('TAX')) {
            const cleanRow = [...row].filter(c=>String(c).trim()!=='');
            const lastVal = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(lastVal) && lastVal > 100000) break;
        }
        if (rowStr.includes('IGST') || rowStr.includes('GRAND TOTAL')) break;
        
        const cleanRow = [...row].filter(c=>String(c).trim()!=='');
        const lastVal = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
        
        const isHeader = (row[0] !== '' || (row[1] !== '' && row[2] === '')) && (isNaN(lastVal) || cleanRow.length <= 3);
        
        if (isHeader && (row[0] !== '' || row[1] !== '')) {
            const sectionName = (row[0] + ' ' + (row[1] || '')).trim();
            if (sectionName && !sectionName.includes('S NO') && sectionName.length > 0) {
                currentSection = { name: sectionName, items: [] };
                sections.push(currentSection);
                continue;
            }
        }
        
        if (!isNaN(lastVal) && lastVal > 0 && cleanRow.length >= 4) {
            const shiftedSerial = !row[0] && row[1] && row[2];
            const item = {
                sno: row[0] || row[1] || '',
                name: shiftedSerial ? row[2] : (row[1] || row[2] || ''),
                desc: shiftedSerial ? '' : (row[2] || ''),
                sac: row[3] || '',
                gstRate: hasGstRateColumn ? (row[4] || '18%') : '18%',
                unit: row[unitCol] || '',
                price: parseFloat(String(row[priceCol]||'').replace(/[^\d.-]/g,'')) || 0,
                qty: parseFloat(String(row[qtyCol]||'').replace(/[^\d.-]/g,'')) || 0,
                amount: lastVal
            };
            
            if (!row[0] && row[1]) {
                item.sno = row[1];
                item.name = row[2] || '';
                item.desc = shiftedSerial ? '' : (row[2] || '');
            }
            
            if (currentSection) {
                currentSection.items.push(item);
            } else {
                currentSection = { name: 'General', items: [] };
                sections.push(currentSection);
                currentSection.items.push(item);
            }
        } else if (cleanRow.length > 0 && currentSection && !rowStr.includes('S NO')) {
            const sectionName = cleanRow.join(' ').trim();
            if (sectionName) {
                currentSection = { name: sectionName, items: [] };
                sections.push(currentSection);
            }
        }
    }

    let totalAmount = 0;
    let igstAmount = 0;
    let grandTotal = 0;
    let amountInWords = '';

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if(!row) continue;
        const rowStr = row.join(' ').toUpperCase();
        
        if (rowStr.includes('IGST') && !rowStr.includes('HSN') && !rowStr.includes('S NO')) {
            const cleanRow = [...row].filter(c=>String(c).trim()!==''); 
            const v = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(v) && v > 100 && igstAmount === 0) igstAmount = v;
        }
        if (rowStr.includes('GRAND TOTAL')) {
            const cleanRow = [...row].filter(c=>String(c).trim()!==''); 
            const v = cleanRow.length ? parseFloat(String(cleanRow[cleanRow.length-1]).replace(/[^\d.-]/g,'')) : NaN;
            if (!isNaN(v) && v > 0) grandTotal = v; 
        }
        if (rowStr.includes('LAKH') || rowStr.includes('RUPEES') || rowStr.includes('TOTAL-') || rowStr.includes('PAISA')) {
            const idx = row.findIndex(c => String(c).toUpperCase().includes('TOTAL-') || String(c).toUpperCase().includes('RUPEES') || String(c).toUpperCase().includes('PAISA'));
            if (idx !== -1) {
                amountInWords = String(row[idx]).replace(/^Total-\s*/i, '').trim();
            }
        }
    }
    
    if (grandTotal > 0 && igstAmount > 0 && totalAmount === 0) {
        totalAmount = grandTotal - igstAmount;
    }

    const gstRows = [];
    let gstTableStart = -1;
    for (let i = 0; i < data.length; i++) {
        if(!data[i]) continue;
        const rowStr = data[i].join(' ').toUpperCase();
        if (rowStr.includes('HSN/SAC') && rowStr.includes('TAX RATE')) {
            gstTableStart = i + 1;
            break;
        }
    }
    if (gstTableStart > 0) {
        for (let i = gstTableStart; i < data.length; i++) {
            const row = data[i];
            if(!row) continue;
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

    return {
        companyName, companyAddress, companyPhone, companyGSTIN,
        invoiceNo, invoiceDate, placeOfSupply, transportMode, vehicleNo, reverseCharge, workOrder,
        billToName, billToAddress, billToState, billToStateCode, billToGSTIN,
        consigneeName, consigneeAddress, consigneeState, consigneeStateCode,
        sections, totalAmount, igstAmount, grandTotal, amountInWords, gstRows,
        sourceWorkbook
    };
}

function fmt(num) {
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderFromData(extractedData) {
    const {
        companyName, companyAddress, companyPhone, companyGSTIN,
        invoiceNo, invoiceDate, placeOfSupply, transportMode, vehicleNo, reverseCharge, workOrder,
        billToName, billToAddress, billToState, billToStateCode, billToGSTIN,
        consigneeName, consigneeAddress, consigneeState, consigneeStateCode,
        sections, totalAmount, igstAmount, grandTotal, amountInWords, gstRows,
        sourceWorkbook
    } = extractedData;
    const sourceAppendixHtml = renderSourceAppendix(sourceWorkbook);

    let logoDataUri = '';
    try {
        const logoPath = path.join(__dirname, '..', 'assets', 'logo.jpg');
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoDataUri = `data:image/jpeg;base64,${logoBase64}`;
    } catch (e) {
    }

    let itemRowsHtml = '';
    let globalSerialNo = 0;
    for (const section of sections || []) {
        itemRowsHtml += `<tr class="section-header"><td colspan="8" class="font-bold text-blue-900 bg-blue-50 text-sm py-2 px-3 border-l-4 border-blue-800">${section.name}</td></tr>\n`;
        for (const item of section.items) {
            globalSerialNo++;
            itemRowsHtml += `<tr class="${globalSerialNo % 2 === 0 ? 'bg-slate-50/50' : ''}">
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

    let gstTableHtml = '';
    if (gstRows && gstRows.length > 0) {
        gstTableHtml = `<div style="margin-top:10px; margin-bottom:10px;">
        <h3 style="font-family:'Montserrat',sans-serif; color:#1e3a8a; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">GST Tax Breakdown</h3>
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
            if (!g.hsnSac || g.hsnSac === 'S NO.' || g.hsnSac === 'undefined' || g.sno === 'S NO.') continue;
            const isTotalRow = String(g.hsnSac).toUpperCase() === 'TOTAL';
            gstTableHtml += `<tr style="${isTotalRow ? 'background:#eff6ff; font-weight:700;' : ''}">
                <td style="text-align:center;">${g.sno}</td>
                <td style="${isTotalRow ? 'font-weight:700;' : ''}">${g.hsnSac}</td>
                <td style="text-align:center;">${g.taxRate || '-'}</td>
                <td style="text-align:right;">${g.taxableAmount && g.taxableAmount !== '0' ? '\u20b9 ' + g.taxableAmount : '-'}</td>
                <td style="text-align:right;">${g.igstAmt && g.igstAmt !== '0' ? '\u20b9 ' + g.igstAmt : '-'}</td>
                <td style="text-align:right;">${g.totalTax && g.totalTax !== '0' ? '\u20b9 ' + g.totalTax : '-'}</td>
            </tr>`;
        }
        gstTableHtml += `</tbody></table></div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
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
        .gst-table th { background-color: #065f46; }
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
                <p style="margin-top:3px; color:#475569;">State: ${consigneeState} (${consigneeStateCode})</p>
            </div>
        </div>
        <div style="background:#f8fafc; border:1px solid var(--border); border-radius:6px; padding:8px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 12px;">
                <span style="color:#64748b;">Invoice No:</span> <span style="font-weight:700; color:#1e3a8a;">${invoiceNo}</span>
                <span style="color:#64748b;">Invoice Date:</span> <span style="font-weight:500;">${invoiceDate}</span>
                <span style="color:#64748b;">Place of Supply:</span> <span style="font-weight:500;">${placeOfSupply}</span>
                ${workOrder ? `<span style="color:#64748b;">W/O Ref:</span> <span style="font-weight:500;">${workOrder}</span>` : ''}
            </div>
        </div>
    </div>

    <div style="flex:1;">
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
            <tbody>${itemRowsHtml}</tbody>
        </table>
    </div>

    ${gstTableHtml}

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
${sourceAppendixHtml}
</body>
</html>`;
}

function extractAndRender(rawData, sourceWorkbook) {
    const data = extractDataFromRaw(rawData, sourceWorkbook);
    const html = renderFromData(data);
    return { data, html };
}

module.exports = {
    extractAndRender,
    renderFromData
};
