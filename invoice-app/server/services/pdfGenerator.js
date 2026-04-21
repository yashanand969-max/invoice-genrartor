const puppeteer = require('puppeteer');
const fs = require('fs');

async function generatePdf(htmlContent) {
    let execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!execPath) {
        if (fs.existsSync('/usr/bin/google-chrome-stable')) {
            execPath = '/usr/bin/google-chrome-stable';
        } else if (fs.existsSync('/usr/bin/google-chrome')) {
            execPath = '/usr/bin/google-chrome';
        } else if (fs.existsSync('/usr/bin/chromium')) {
            execPath = '/usr/bin/chromium';
        } else {
            execPath = puppeteer.executablePath();
        }
    }

    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: execPath,
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
