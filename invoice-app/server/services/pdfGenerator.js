const puppeteer = require('puppeteer');

const PDF_RENDER_TIMEOUT_MS = 60000;
const EXTERNAL_FONT_LINK_RE = /<link[^>]+fonts\.googleapis\.com[^>]*>/gi;

async function generatePdf(htmlContent) {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);

        const offlineHtml = htmlContent.replace(EXTERNAL_FONT_LINK_RE, '');
        await page.setContent(offlineHtml, {
            waitUntil: 'domcontentloaded',
            timeout: PDF_RENDER_TIMEOUT_MS
        });
        await page.emulateMediaType('screen');
        await page.evaluate(async () => {
            await Promise.all(
                Array.from(document.images)
                    .filter((image) => !image.complete)
                    .map((image) => new Promise((resolve) => {
                        image.onload = resolve;
                        image.onerror = resolve;
                    }))
            );
        });
        
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true, 
            margin: { top: '0', bottom: '0', left: '0', right: '0' } 
        });
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = {
    generatePdf
};
