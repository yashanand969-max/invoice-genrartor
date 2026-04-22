const xlsx = require('xlsx');

function cleanCellValue(cell) {
    if (cell === undefined || cell === null) return '';
    return String(cell).replace(/\r\n/g, '\n').trim();
}

function buildSourceRows(rows) {
    return rows
        .map((row, rowIndex) => {
            const cells = row
                .map((cell, columnIndex) => ({
                    address: xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex }),
                    text: cell
                }))
                .filter(cell => cell.text !== '');

            return {
                rowNumber: rowIndex + 1,
                cells
            };
        })
        .filter(row => row.cells.length > 0);
}

function parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    
    if (workbook.SheetNames.length === 0) {
        throw new Error("No sheets found in Excel file.");
    }
    
    const parsedSheets = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
            dateNF: 'dd/mm/yyyy',
            defval: '',
            blankrows: true
        });

        const rows = rawRows.map(row =>
            Array.from(row || []).map(cleanCellValue)
        );

        return {
            name: sheetName,
            rows,
            sourceRows: buildSourceRows(rows)
        };
    });

    // Create a flat text representation across every worksheet for keyword detection.
    const flatText = parsedSheets
        .flatMap(sheet => sheet.rows.map(row => row.join(' ')))
        .join('\n')
        .toLowerCase();

    return {
        rawData: parsedSheets[0].rows,
        allSheets: parsedSheets.map(sheet => ({
            name: sheet.name,
            rows: sheet.rows
        })),
        sourceWorkbook: {
            sheets: parsedSheets.map(sheet => ({
                name: sheet.name,
                rows: sheet.sourceRows
            }))
        },
        flatText
    };
}

module.exports = {
    parseExcel
};
