const puppeteer = require('puppeteer');

async function generatePdf(htmlContent) {
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    };

    // Use the pre-installed Chrome in Docker (set via PUPPETEER_EXECUTABLE_PATH env var)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const browser = await puppeteer.launch(launchOptions);
    
    try {
        const page = await browser.newPage();
        
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
