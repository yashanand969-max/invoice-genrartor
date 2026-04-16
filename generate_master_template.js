const ExcelJS = require('exceljs');
const path = require('path');

async function createMasterTemplate() {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Invoice Data');

    // Define columns to match extraction logc
    ws.columns = [
        { header: 'S NO.', key: 'sno', width: 10 },
        { header: 'ITEM NAME', key: 'name', width: 30 },
        { header: 'DESCRIPTION OF THE ITEM', key: 'desc', width: 50 },
        { header: 'SAC', key: 'sac', width: 15 },
        { header: 'PRODUCT', key: 'product', width: 20 },
        { header: 'UNIT', key: 'unit', width: 10 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'Quantity', key: 'qty', width: 15 },
        { header: 'Amount', key: 'amount', width: 20 }
    ];

    // Add some sample headers for Meta info (following the structure extracted earlier)
    // Row 1: Company (Handled by generator, but good to have reference)
    // Row 4: Invoice Number
    ws.getCell('B4').value = '   INVOICE NUMBER ';
    ws.getCell('C4').value = 'APLE-XXX-25/26';
    ws.getCell('E4').value = 'Transportation Mode';
    ws.getCell('G4').value = 'Work at site';

    // Row 7: Date & Place
    ws.getCell('B7').value = 'INVOICE DATE';
    ws.getCell('C7').value = new Date().toISOString().split('T')[0];
    ws.getCell('E7').value = 'Place of supply';
    ws.getCell('G7').value = 'State Name';

    // Row 9: Headers for Reciever/Consignee
    ws.getCell('B9').value = 'Details of Reciever (Billed to)';
    ws.getCell('E9').value = 'Details of Consignee (Work at Site)';

    // Row 10: Name
    ws.getCell('B10').value = 'Name';
    ws.getCell('C10').value = '[Client Name]';
    ws.getCell('E10').value = 'Name';
    ws.getCell('F10').value = '[Consignee Name]';

    // Row 11: Address
    ws.getCell('B11').value = 'Address';
    ws.getCell('C11').value = '[Full Address]';
    ws.getCell('E11').value = 'Address';
    ws.getCell('F11').value = '[Site Address]';

    // Row 13: State
    ws.getCell('B13').value = 'State';
    ws.getCell('C13').value = '[State]';
    ws.getCell('E13').value = 'State';
    ws.getCell('F13').value = '[State]';

    // Row 14: State Code
    ws.getCell('B14').value = 'State Code';
    ws.getCell('C14').value = '[00]';
    ws.getCell('E14').value = 'State Code';
    ws.getCell('F14').value = '[00]';

    // Row 15: GSTIN
    ws.getCell('B15').value = 'GSTIN NO.';
    ws.getCell('C15').value = '[15-digit GSTIN]';
    ws.getCell('E15').value = 'GSTIN NO.';
    ws.getCell('F15').value = '[15-digit GSTIN]';

    // Row 18: Table Header
    // (Already added via ws.columns headers, but let's place it at row 18 specifically)
    const tableHeader = ['S NO.', 'ITEM NAME', 'DESCRIPTION OF THE ITEM', 'SAC', 'PRODUCT', 'UNIT', 'Price', 'Quantity', 'Amount'];
    ws.getRow(18).values = tableHeader;
    ws.getRow(18).font = { bold: true };

    // Row 20: First sample item
    ws.getRow(20).values = [1, 'Sample Work', 'Description of work here...', '995461', 'Brand/Product', 'Nos', 1000, 1, 1000];

    // Outstation row logic (usually looks for "OUTSTATION CHARGES")
    ws.getCell('E25').value = 'OUTSTATION CHARGES 15% / L.S';
    ws.getCell('I25').value = 0;

    const templatePath = path.join(__dirname, 'Master_Blank_Template.xlsx');
    await workbook.xlsx.writeFile(templatePath);
    console.log('Master_Blank_Template.xlsx created successfully.');
}

createMasterTemplate();
