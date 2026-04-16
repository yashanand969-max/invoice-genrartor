const xlsx = require('xlsx');

function parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    
    if (workbook.SheetNames.length === 0) {
        throw new Error("No sheets found in Excel file.");
    }
    
    // Parse the first sheet
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { 
        header: 1, 
        raw: false, 
        dateNF: 'dd/mm/yyyy' 
    });

    // Clean data - turn all cells into strings
    const cleanedData = rawData.map(row => 
        Array.from(row || []).map(cell => (cell !== undefined && cell !== null) ? String(cell).trim() : '')
    );

    // Create a flat text representation for keyword detection
    const flatText = cleanedData.map(row => row.join(' ')).join('\n').toLowerCase();

    return {
        rawData: cleanedData,
        flatText: flatText
    };
}

module.exports = {
    parseExcel
};
