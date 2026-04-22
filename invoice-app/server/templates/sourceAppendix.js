function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function renderSourceAppendix(sourceWorkbook) {
    const sheets = sourceWorkbook && Array.isArray(sourceWorkbook.sheets)
        ? sourceWorkbook.sheets
        : [];

    const sheetsWithContent = sheets.filter(sheet =>
        sheet && Array.isArray(sheet.rows) && sheet.rows.length > 0
    );

    if (sheetsWithContent.length === 0) return '';

    const sheetsHtml = sheetsWithContent.map(sheet => {
        const rowsHtml = sheet.rows.map(row => {
            const cellHtml = row.cells.map(cell => `
                <div style="margin-bottom:3px;">
                    <span style="display:inline-block; min-width:34px; color:#1e3a8a; font-weight:700;">${escapeHtml(cell.address)}</span>
                    <span style="white-space:pre-wrap;">${escapeHtml(cell.text)}</span>
                </div>
            `).join('');

            return `
                <tr>
                    <td style="width:44px; text-align:center; color:#64748b; font-weight:700; vertical-align:top;">${escapeHtml(row.rowNumber)}</td>
                    <td style="vertical-align:top;">${cellHtml}</td>
                </tr>
            `;
        }).join('');

        return `
            <section style="margin-top:10px;">
                <h3 style="font-family:'Montserrat',sans-serif; font-size:11px; color:#1e3a8a; margin-bottom:6px;">Sheet: ${escapeHtml(sheet.name)}</h3>
                <table style="width:100%; border-collapse:collapse; font-size:7px;">
                    <thead>
                        <tr>
                            <th style="width:44px;">Row</th>
                            <th>Cell text read from Excel</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </section>
        `;
    }).join('');

    return `
        <div class="a4-page" style="page-break-before:always; break-before:page;">
            <header style="border-bottom:2px solid var(--primary); padding-bottom:8px; margin-bottom:8px;">
                <h2 class="heading-font" style="font-size:16px; color:#1e3a8a; text-transform:uppercase; letter-spacing:0;">Complete Excel Source Data</h2>
                <p style="font-size:8px; color:#64748b; margin-top:3px;">Every non-empty cell read from the uploaded workbook is listed here so no Excel text is dropped from the generated invoice.</p>
            </header>
            ${sheetsHtml}
        </div>
    `;
}

module.exports = {
    escapeHtml,
    renderSourceAppendix
};
