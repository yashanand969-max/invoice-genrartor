const puppeteer = require('puppeteer');

async function generatePdf(htmlContent) {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Set content with a generous timeout for container environments
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true, 
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
            timeout: 30000
        });
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = {
    generatePdf
};
