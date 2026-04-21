const puppeteer = require('puppeteer');

async function generatePdf(htmlContent) {
    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });
        
        // Let fonts load if any
        await page.evaluateHandle('document.fonts.ready');
        
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
