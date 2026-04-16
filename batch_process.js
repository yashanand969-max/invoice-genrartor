const fs = require('fs');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const path = require('path');

const EXCEL_DIR = path.join(__dirname, 'excel');
const OUT_EXCEL_DIR = path.join(__dirname, 'new_invoices_excel');
const OUT_PDF_DIR = path.join(__dirname, 'new_invoices_pdf');

if (!fs.existsSync(OUT_EXCEL_DIR)) fs.mkdirSync(OUT_EXCEL_DIR);
if (!fs.existsSync(OUT_PDF_DIR)) fs.mkdirSync(OUT_PDF_DIR);

function extractInvoiceData(filePath) {
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, dateNF: 'dd-mm-yyyy' });
    
    // Convert to uppercase for easy searching, keeping original in a parallel array to preserve casing
    const data = rawData.map(row => Array.from(row).map(cell => (cell !== undefined && cell !== null) ? String(cell).trim() : ''));
    
    const invoice = {
        invoiceNo: '', date: '', placeOfSupply: '',
        billTo: { name: '', address: '', state: '', stateCode: '', gstin: '' },
        consignee: { name: '', address: '', state: '', stateCode: '', gstin: '' },
        items: [],
        subtotal: 0, outstation: 0, taxable: 0,
        igst: 0, cgst: 0, sgst: 0, grandTotal: 0, amountWords: ''
    };

    let itemStartIdx = -1;

    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        const rowStr = row.join(' ').toUpperCase();

        // Header Meta
        if (rowStr.includes('INVOICE NUMBER')) {
            const idx = row.findIndex(c => c.toUpperCase().includes('INVOICE NUMBER'));
            if (idx !== -1 && row[idx+1]) invoice.invoiceNo = row[idx+1];
        }
        if (rowStr.includes('INVOICE DATE')) {
            const idx = row.findIndex(c => c.toUpperCase().includes('INVOICE DATE'));
            if (idx !== -1 && row[idx+1]) invoice.date = row[idx+1];
        }
        if (rowStr.includes('PLACE OF SUPPLY')) {
            const idx = row.findIndex(c => c.toUpperCase().includes('PLACE OF SUPPLY'));
            // Sometimes it's +1, sometimes +2
            if (idx !== -1) {
                 invoice.placeOfSupply = row[idx+1] || row[idx+2] || 'West Bengal';
            }
        }
        
        // Receivers
        if (rowStr.includes('BILLED TO')) {
            // Find columns
            const billCol = row.findIndex(c => c.toUpperCase().includes('BILLED TO'));
            const consCol = row.findIndex(c => c.toUpperCase().includes('CONSIGNEE'));
            
            // Loop next few rows to extract name, address, state, gstin
            for(let scan = r+1; scan < r+8 && scan < data.length; scan++) {
                const sRow = data[scan];
                const type = (sRow[billCol > 0 ? billCol-1 : 1] || '').toUpperCase();
                
                if (type.includes('NAME')) {
                    invoice.billTo.name = sRow[billCol > 0 ? billCol : 2] || sRow[2] || '';
                    if (consCol !== -1) invoice.consignee.name = sRow[consCol+1] || sRow[5] || invoice.billTo.name;
                }
                if (type.includes('ADDRESS')) {
                    invoice.billTo.address = sRow[billCol > 0 ? billCol : 2] || sRow[2] || '';
                    if (consCol !== -1) invoice.consignee.address = sRow[consCol+1] || sRow[5] || invoice.billTo.address;
                }
                if (type.includes('STATE CODE')) {
                    invoice.billTo.stateCode = sRow[billCol > 0 ? billCol : 2] || '';
                    if (consCol !== -1) invoice.consignee.stateCode = sRow[consCol+1] || sRow[5] || invoice.billTo.stateCode;
                } else if (type.includes('STATE')) {
                    invoice.billTo.state = sRow[billCol > 0 ? billCol : 2] || '';
                    if (consCol !== -1) invoice.consignee.state = sRow[consCol+1] || sRow[5] || invoice.billTo.state;
                }
                if (type.includes('GSTIN')) {
                    invoice.billTo.gstin = sRow[billCol > 0 ? billCol : 2] || '';
                    if (consCol !== -1) invoice.consignee.gstin = sRow[consCol+1] || sRow[5] || invoice.billTo.gstin;
                }
            }
        }

        // Items Table Start
        if (rowStr.includes('ITEM NAME') && rowStr.includes('UNIT') && itemStartIdx === -1) {
            itemStartIdx = r + 1;
        }

        // Totals
        if (rowStr.includes('OUTSTATION CHARGES')) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.outstation = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('ELECTRICAL SUB TOTAL') || (rowStr.includes('SUB TOTAL') && !rowStr.includes('GRAND'))) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.subtotal = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('IGST')) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.igst = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('CGST')) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.cgst = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('SGST')) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.sgst = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('GRAND TOTAL')) {
            const vals = row.filter(x => parseFloat(x.replace(/,/g,'')));
            if(vals.length > 0) invoice.grandTotal = parseFloat(vals[vals.length-1].replace(/,/g,'')) || 0;
        }
        if (rowStr.includes('RUPEES (IN WORDS)')) {
            const idx = row.findIndex(c => c.toUpperCase().includes('RUPEES (IN WORDS)'));
            if(idx !== -1) invoice.amountWords = row[idx].split(':')[1] ? row[idx].split(':')[1].trim() : String(row[idx+1] || '');
        }
    }

    // Extract items safely
    if (itemStartIdx !== -1) {
        for (let i = itemStartIdx; i < data.length; i++) {
            const row = data[i];
            const rowStr = row.join(' ').toUpperCase();
            if (rowStr.includes('SUB TOTAL') || rowStr.includes('OUTSTATION')) break; // End of table
            // Expected format: SNO[0], NAME[1], DESC[2], SAC[3], BRAND[4], UNIT[5], PRICE[6], QTY[7], AMT[8]
            // Sometimes it shifts if columns were merged. We try to grab numbers from right to left.
            const cleanRow = [...row];
            while (cleanRow.length > 0 && String(cleanRow[cleanRow.length - 1]).trim() === '') cleanRow.pop();
            const amtStr = cleanRow[cleanRow.length-1];
            const amount = parseFloat(String(amtStr||'').replace(/[^\d.-]/g, ''));
            
            if (!isNaN(amount) && amount > 0) {
                // It's a valid row!
                let item = {
                    sno: row[0] || '',
                    name: row[1] || '',
                    desc: row[2] || '',
                    sac: row[3] || '',
                    brand: row[4] || '',
                    unit: row[5] || '',
                    price: parseFloat(String(cleanRow[cleanRow.length-3] || '').replace(/[^\d.-]/g, '')) || 0,
                    qty: parseFloat(String(cleanRow[cleanRow.length-2] || '').replace(/[^\d.-]/g, '')) || 0,
                    amount: amount
                };
                
                // If the first col starts with empty due to weird merge
                if (!item.sno || !item.name) {
                    const clean = row.filter(c => c !== '');
                    if (clean.length >= 6) {
                        item.sno = clean[0];
                        item.name = clean[1];
                        item.amount = parseFloat((clean[clean.length-1]||'').replace(/,/g,''));
                        item.qty = parseFloat((clean[clean.length-2]||'').replace(/,/g,''));
                        item.price = parseFloat((clean[clean.length-3]||'').replace(/,/g,''));
                        item.unit = clean[clean.length-5] || '';
                    }
                }

                invoice.items.push(item);
            }
            // Add rows that only have descriptions but no numbers (multiline desc)
            else if (row.filter(c => c !== '').length > 0 && !rowStr.includes('S NO.')) {
                 if (invoice.items.length > 0) {
                     const clean = row.filter(c => c !== '');
                     if (clean.length > 0) {
                        invoice.items[invoice.items.length-1].desc += '\n' + clean.join(' ');
                     }
                 }
            }
        }
    }

    // Calculate math cleanly to avoid extraction glitches
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    invoice.taxable = invoice.subtotal + invoice.outstation;
    invoice.grandTotal = invoice.taxable + invoice.igst + invoice.cgst + invoice.sgst;

    return invoice;
}

// ======================== HTML GENERATOR ==============================
function generateInvoiceHTML(inv) {
    const itemsHtml = inv.items.map((item, idx) => `
        <tr>
            <td class="text-center text-slate-500">${idx+1}</td>
            <td class="font-medium">${item.name}</td>
            <td class="text-slate-600 text-xs whitespace-pre-wrap">${item.desc}</td>
            <td class="text-slate-500 text-center">${item.sac}</td>
            <td class="text-center">${item.brand}</td>
            <td class="text-center">${item.unit}</td>
            <td class="text-right">${item.qty}</td>
            <td class="text-right">${item.price.toFixed(2)}</td>
            <td class="text-right font-medium">${item.amount.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STANDARDIZED INVOICE</title>
    <!-- Use standard fonts for premium feel -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root { --primary: #1e3a8a; --border: #e2e8f0; }
        body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        h1, h2, h3, .heading-font { font-family: 'Montserrat', sans-serif; }
        .a4-page {
            width: 210mm; min-height: 297mm; margin: 0 auto; background: white;
            position: relative; box-sizing: border-box; display: flex; flex-direction: column; padding: 15mm;
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        th, td { border: 1px solid var(--border); padding: 6px 8px; }
        th { background-color: var(--primary); color: white; text-align: left; font-weight: 500; border-color: rgba(255,255,255,0.2); }
        .bg-gray-50 { background-color: #f8fafc; }
    </style>
</head>
<body>
<div class="a4-page">
    <header class="flex justify-between items-start mb-6 border-b pb-4 border-slate-200">
        <div class="flex items-center gap-6">
            <!-- Convert local logo to file URL or base64. Puppeteer needs absolute path -->
            <img src="file:///${path.join(__dirname, 'logo/WhatsApp Image 2025-03-31 at 17.11.56_644e8239.jpg').replace(/\\/g, '/')}" alt="Company Logo" class="h-24 w-24 object-contain rounded-md" onerror="this.style.display='none'">
            <div>
                <h1 class="text-2xl text-blue-900 heading-font uppercase tracking-wide">M/S I FOUR U ENGINEERING SERVICES</h1>
                <p class="text-sm text-slate-500 mt-1 max-w-[300px]">House No. 329, New Karmik Nagar, PO- ISM, Dhanbad, Jharkhand-826004</p>
                <div class="mt-2 text-sm font-medium text-slate-600">
                    GSTIN: <span class="text-slate-800 border bg-yellow-50 px-1 rounded border-yellow-200">20ARNPA8397C1ZX</span><br>
                    Phone: <span class="text-slate-800">+91 7042220470</span>
                </div>
            </div>
        </div>
        <div class="text-right">
            <h2 class="text-4xl text-blue-900 heading-font tracking-widest opacity-90">INVOICE</h2>
        </div>
    </header>

    <div class="grid grid-cols-2 gap-8 mb-6 text-sm">
        <div class="flex gap-4">
            <div class="flex-1 text-xs">
                <h3 class="font-bold text-slate-400 uppercase tracking-wider mb-2 heading-font text-[10px]">Bill To</h3>
                <p class="font-semibold text-sm mb-1">${inv.billTo.name}</p>
                <p class="text-slate-600 leading-relaxed">${inv.billTo.address}<br>State: ${inv.billTo.state} (${inv.billTo.stateCode})<br>GSTIN: <span class="font-mono text-slate-800 bg-slate-100 px-1 rounded">${inv.billTo.gstin}</span></p>
            </div>
            <div class="flex-1 text-xs">
                <h3 class="font-bold text-slate-400 uppercase tracking-wider mb-2 heading-font text-[10px]">Consignee Site</h3>
                <p class="font-semibold text-sm mb-1">${inv.consignee.name}</p>
                <p class="text-slate-600 leading-relaxed">${inv.consignee.address}<br>State: ${inv.consignee.state} (${inv.consignee.stateCode})</p>
            </div>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg border border-slate-200 self-start text-xs">
            <div class="flex justify-between mb-2">
                <span class="text-slate-500">Invoice No:</span>
                <span class="font-semibold heading-font text-blue-900 border-b border-blue-900 pb-0.5">${inv.invoiceNo}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="text-slate-500">Invoice Date:</span>
                <span class="font-medium">${inv.date}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="text-slate-500">Place of Supply:</span>
                <span class="font-medium">${inv.placeOfSupply}</span>
            </div>
        </div>
    </div>

    <!-- Details Table -->
    <div class="flex-1">
        <table class="mb-6 table-fixed">
            <thead>
                <tr>
                    <th class="w-[5%] text-center">S.No</th>
                    <th class="w-[18%]">Item Name</th>
                    <th class="w-[30%]">Description</th>
                    <th class="w-[7%] text-center">SAC</th>
                    <th class="w-[10%] text-center">Brand</th>
                    <th class="w-[5%] text-center">Unit</th>
                    <th class="w-[7%] text-right">Qty</th>
                    <th class="w-[8%] text-right">Price</th>
                    <th class="w-[10%] text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
    </div>

    <div class="flex justify-between items-end border-t border-slate-200 mt-auto pt-6">
        <div class="w-1/2 pr-8">
            <div class="mb-4 text-xs">
                <p class="text-slate-500 uppercase font-bold tracking-wider mb-1">Amount in Words:</p>
                <p class="italic text-sm font-medium text-slate-800">${inv.amountWords || 'Rupees...'}</p>
            </div>
            
            <div class="bg-blue-50/50 p-3 rounded border border-blue-100 text-xs">
                <h3 class="font-bold text-blue-900 uppercase mb-2">Bank Details</h3>
                <div class="grid grid-cols-[80px_1fr] gap-y-1">
                    <span class="text-slate-500">Bank Name:</span> <span class="font-medium">HDFC BANK</span>
                    <span class="text-slate-500">A/C No:</span> <span class="font-medium">50200073035859</span>
                    <span class="text-slate-500">IFSC:</span> <span class="font-medium">HDFC0002679</span>
                    <span class="text-slate-500">Branch:</span> <span class="font-medium">Sri Ram City, Saraidhela, Dhanbad</span>
                </div>
            </div>
        </div>

        <div class="w-[45%] bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div class="flex justify-between mb-1"><span class="text-slate-600">Electrical Subtotal:</span><span class="font-bold">₹ ${inv.subtotal.toFixed(2)}</span></div>
            <div class="flex justify-between mb-2 pb-2 border-b border-dashed border-slate-300"><span class="text-slate-600">Outstation Charges:</span><span>₹ ${inv.outstation.toFixed(2)}</span></div>
            <div class="flex justify-between mb-1"><span class="text-slate-800 font-semibold">Taxable Amount:</span><span class="font-semibold text-slate-800">₹ ${inv.taxable.toFixed(2)}</span></div>
            ${inv.igst > 0 ? `<div class="flex justify-between mb-1 text-slate-600"><span class="pl-4">IGST:</span><span>₹ ${inv.igst.toFixed(2)}</span></div>` : ''}
            ${inv.cgst > 0 ? `<div class="flex justify-between mb-1 text-slate-600"><span class="pl-4">CGST:</span><span>₹ ${inv.cgst.toFixed(2)}</span></div>` : ''}
            ${inv.sgst > 0 ? `<div class="flex justify-between mb-2 text-slate-600"><span class="pl-4">SGST:</span><span>₹ ${inv.sgst.toFixed(2)}</span></div>` : ''}
            
            <div class="flex justify-between items-center bg-blue-900 text-white p-3 -mx-2 -mb-2 mt-2 rounded text-base font-bold">
                <span class="heading-font">GRAND TOTAL</span>
                <span>₹ ${inv.grandTotal.toFixed(2)}</span>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-between items-end border-t border-slate-200 mt-4 pt-4 text-xs">
        <div class="w-1/2">
            <h4 class="font-bold text-slate-800 uppercase mb-1 text-[10px]">Terms & Conditions</h4>
            <ol class="list-decimal pl-4 space-y-0.5 text-slate-600 text-[9px]">
                <li>Payment due within 30 days of invoice date.</li>
                <li>Cheque/NEFT in favour of "I FOUR U ENGINEERING SERVICES".</li>
                <li>Goods once sold will not be taken back.</li>
                <li>Subject to Dhanbad jurisdiction.</li>
            </ol>
        </div>
        <div class="text-center w-[180px]">
            <p class="font-bold text-slate-800 mb-10 pt-4 border-t border-slate-300">Authorized Signatory</p>
            <p class="text-[9px] text-slate-500">For I FOUR U ENGINEERING SERVICES</p>
        </div>
    </div>
</div>
</body>
</html>`;
}

async function writeExceljsFile(inv, outPath) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Standard_Invoice');

    // Make minimal structured headers based on the strict output
    ws.columns = [
        { width: 5 }, { width: 30 }, { width: 40 }, { width: 10 }, 
        { width: 15 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 15 }
    ];

    ws.mergeCells('A1:I3');
    ws.getCell('A1').value = "M/S I FOUR U ENGINEERING SERVICES\nHouse No. 329, New Karmik Nagar, PO- ISM, Dhanbad, Jharkhand-826004\nGSTIN: 20ARNPA8397C1ZX | Ph: +91 7042220470";
    ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };

    ws.getCell('A5').value = "Bill To:"; ws.getCell('A5').font = {bold:true};
    ws.getCell('A6').value = inv.billTo.name;
    ws.getCell('A7').value = inv.billTo.address;
    ws.getCell('A8').value = "GSTIN: " + inv.billTo.gstin;

    ws.getCell('E5').value = "Consignee:"; ws.getCell('E5').font = {bold:true};
    ws.getCell('E6').value = inv.consignee.name;
    ws.getCell('E7').value = inv.consignee.address;
    ws.getCell('E8').value = "GSTIN: " + inv.consignee.gstin;

    ws.getCell('G5').value = "Invoice No:"; ws.getCell('H5').value = inv.invoiceNo;
    ws.getCell('G6').value = "Date:"; ws.getCell('H6').value = inv.date;
    ws.getCell('G7').value = "POS:"; ws.getCell('H7').value = inv.placeOfSupply;

    // Table Header
    const row11 = ws.getRow(11);
    const headers = ["S.No", "Item Name", "Description", "SAC", "Brand", "Unit", "Qty", "Unit Price", "Amount"];
    row11.values = headers;
    row11.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row11.alignment = { horizontal: 'center' };
    row11.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' }};
        c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    let rIdx = 12;
    for(const item of inv.items) {
        const row = ws.getRow(rIdx);
        row.values = [item.sno, item.name, item.desc, item.sac, item.brand, item.unit, item.qty, item.price, item.amount];
        row.alignment = { wrapText: true, vertical: 'top' };
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(8).numFmt = '#,##0.00';
        row.getCell(9).numFmt = '#,##0.00';
        row.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        rIdx++;
    }

    // Totals
    rIdx += 1;
    ws.getCell(`H${rIdx}`).value = "Subtotal"; ws.getCell(`I${rIdx}`).value = inv.subtotal; rIdx++;
    ws.getCell(`H${rIdx}`).value = "Outstation Charges"; ws.getCell(`I${rIdx}`).value = inv.outstation; rIdx++;
    ws.getCell(`H${rIdx}`).value = "Taxable Amount"; ws.getCell(`I${rIdx}`).value = inv.taxable; rIdx++;
    ws.getCell(`H${rIdx}`).value = "IGST"; ws.getCell(`I${rIdx}`).value = inv.igst; rIdx++;
    ws.getCell(`H${rIdx}`).value = "CGST"; ws.getCell(`I${rIdx}`).value = inv.cgst; rIdx++;
    ws.getCell(`H${rIdx}`).value = "SGST"; ws.getCell(`I${rIdx}`).value = inv.sgst; rIdx++;
    
    ws.getCell(`H${rIdx}`).value = "GRAND TOTAL"; ws.getCell(`H${rIdx}`).font = {bold:true};
    ws.getCell(`I${rIdx}`).value = inv.grandTotal; ws.getCell(`I${rIdx}`).font = {bold:true};
    
    for(let i = rIdx - 6; i <= rIdx; i++) {
        ws.getCell(`I${i}`).numFmt = '#,##0.00';
    }

    await workbook.xlsx.writeFile(outPath);
}

// ======================= MAIN BATCH PROCESS ==============================
async function run() {
    let files = fs.readdirSync(EXCEL_DIR).filter(f => f.endsWith('.xlsx'));
    
    // Check if a specific file was passed as an argument
    if (process.argv[2]) {
        const targetName = path.basename(process.argv[2]);
        files = files.filter(f => f === targetName);
        if (files.length === 0) {
            console.log(`File ${targetName} not found in ${EXCEL_DIR}`);
            return;
        }
    }
    
    console.log(`Found ${files.length} EXCEL files. Processing...`);
    
    const browser = await puppeteer.launch({ headless: true });

    for (const file of files) {
        console.log(`-----------------------------`);
        console.log(`Processing: ${file}`);
        try {
            const rawPath = path.join(EXCEL_DIR, file);
            
            // 1. Extract Data
            const invoiceData = extractInvoiceData(rawPath);
            const safeInvoiceNo = (invoiceData.invoiceNo || file.replace('.xlsx','')).replace(/[\/\\]/g, '-');
            
            console.log(`Extracted -> Inv No: ${invoiceData.invoiceNo}, Grand Total: ${invoiceData.grandTotal}`);

            // 2. Generate PDF using Puppeteer
            const html = generateInvoiceHTML(invoiceData);
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdfOutPath = path.join(OUT_PDF_DIR, `${safeInvoiceNo}_NEW_INVOICE.pdf`);
            await page.pdf({ 
                path: pdfOutPath, 
                format: 'A4', 
                printBackground: true, 
                margin: { top: '0', bottom: '0', left: '0', right: '0' }
            });
            await page.close();
            console.log(`Generated PDF -> ${pdfOutPath}`);

            // 3. Generate pure Excel Template
            const excelOutPath = path.join(OUT_EXCEL_DIR, `${safeInvoiceNo}_NEW_INVOICE.xlsx`);
            await writeExceljsFile(invoiceData, excelOutPath);
            console.log(`Generated Excel -> ${excelOutPath}`);

        } catch (e) {
            console.error(`Error processing ${file}: `, e.stack);
        }
    }

    await browser.close();
    console.log(`\nAll done! Processed ${files.length} files.`);
}

run();
