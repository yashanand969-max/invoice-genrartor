const express = require('express');
const multer = require('multer');
const { parseExcel } = require('../services/excelParser');
const { detectInvoiceType } = require('../services/invoiceDetector');
const { generatePdf } = require('../services/pdfGenerator');
const cholaTemplate = require('../templates/cholaInvoice');
const apolloTemplate = require('../templates/apolloInvoice');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 1. Parse Excel
        const parsedData = parseExcel(req.file.buffer);

        // 2. Detect Type
        const invoiceType = detectInvoiceType(parsedData.rawData, parsedData.flatText);

        // 3. Render HTML
        let previewHtml = '';
        let invoiceData = parsedData.parsedDetails;

        if (invoiceType === 'CHOLA') {
             // For Chola, you might want to structure generic parsedDetails specifically
             // or expect parseExcel to provide enough unified structure.
             // Here we use the raw data to extract using specific extractors if needed
             const templateResult = cholaTemplate.extractAndRender(parsedData.rawData);
             previewHtml = templateResult.html;
             invoiceData = templateResult.data;
        } else if (invoiceType === 'APOLLO') {
             const templateResult = apolloTemplate.extractAndRender(parsedData.rawData);
             previewHtml = templateResult.html;
             invoiceData = templateResult.data;
        } else {
             return res.status(400).json({ error: 'Could not detect invoice type. Please check the Excel file format.' });
        }

        res.json({
            invoiceType,
            invoiceData,
            previewHtml
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/download', async (req, res) => {
    try {
        const { invoiceType, invoiceData } = req.body || {};
        
        if (!invoiceData || typeof invoiceData !== 'object') {
            console.error('Download error: Missing or invalid invoiceData. Body keys:', Object.keys(req.body || {}));
            return res.status(400).json({ error: 'Invoice data is required. The request body may have been truncated.' });
        }

        if (!invoiceType) {
            return res.status(400).json({ error: 'Invoice type is required.' });
        }

        console.log(`Generating PDF for ${invoiceType} invoice: ${invoiceData.invoiceNo || 'Unknown'}`);

        // Re-generate HTML from state data to ensure PDF exactly matches what was previewed.
        let htmlContext = '';
        let pdfName = 'invoice';

        if (invoiceType === 'CHOLA') {
            htmlContext = cholaTemplate.renderFromData(invoiceData);
            pdfName = `CHOLA_Invoice_${invoiceData.invoiceNo||'Unknown'}.pdf`;
        } else if (invoiceType === 'APOLLO') {
            htmlContext = apolloTemplate.renderFromData(invoiceData);
            pdfName = `APOLLO_Invoice_${invoiceData.invoiceNo||'Unknown'}.pdf`;
        } else {
            return res.status(400).json({ error: `Invalid invoice type: ${invoiceType}` });
        }

        const pdfBuffer = await generatePdf(htmlContext);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${pdfName.replace(/[\/\\]/g, '-')}"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    } catch (error) {
         console.error('Error generating PDF:', error.message, error.stack);
         res.status(500).json({ error: `PDF generation failed: ${error.message}` });
    }
});

module.exports = router;
