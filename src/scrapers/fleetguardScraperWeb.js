const puppeteer = require('puppeteer');

/**
 * Scrape Fleetguard product page by search
 * Extracts equipment applications, engine applications, cross references, and technical specs
 * @param {string} code - Donaldson or OEM code to search
 * @returns {Promise<object>} - Scraped data
 */
async function scrapeFleetguardBySearch(code) {
    console.log(`🔍 [Fleetguard] Scraping by search for: ${code}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Search for the code
        const searchUrl = `https://www.fleetguard.com/en-US/products?search=${encodeURIComponent(code)}`;
        console.log(`📡 Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for results
        await page.waitForTimeout(3000);

        // Click on first product result
        const productLinkClicked = await page.evaluate(() => {
            const productLink = document.querySelector('a[href*="/products/"]');
            if (productLink) {
                productLink.click();
                return true;
            }
            return false;
        });

        if (!productLinkClicked) {
            console.log(`⚠️  [Fleetguard] No product found for: ${code}`);
            await browser.close();
            return { found: false };
        }

        // Wait for product page to load
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
        await page.waitForTimeout(2000);

        // Extract data from product page
        const data = await page.evaluate(() => {
            const result = {
                found: true,
                technical: {},
                crossCodes: [],
                applications: [],
                engineApplications: [],
                description: ''
            };

            // Extract description
            const descEl = document.querySelector('.product-description, .description, h1.product-title');
            if (descEl) result.description = descEl.textContent.trim();

            // Extract technical specifications
            const specRows = document.querySelectorAll('table.specs tr, .specifications tr, .technical-specs tr');
            specRows.forEach(row => {
                const label = row.querySelector('th, td:first-child')?.textContent.trim().toLowerCase();
                const value = row.querySelector('td:last-child')?.textContent.trim();

                if (label && value) {
                    if (label.includes('height') || label.includes('length')) {
                        result.technical.height_mm = value;
                    } else if (label.includes('diameter') || label.includes('od')) {
                        result.technical.outer_diameter_mm = value;
                    } else if (label.includes('thread')) {
                        result.technical.thread_size = value;
                    }
                }
            });

            // Extract cross references / OEM codes
            const crossSection = document.querySelector('[data-tab="cross-reference"], .cross-references, #cross-references');
            if (crossSection) {
                const codes = crossSection.querySelectorAll('li, .code, .part-number');
                codes.forEach(el => {
                    const code = el.textContent.trim();
                    if (code && code.length > 3) {
                        result.crossCodes.push(code);
                    }
                });
            }

            // **CRITICAL: Extract Equipment Applications from Equipment tab**
            const equipmentTab = document.querySelector('[data-tab="equipment"], #equipment, .equipment-applications');
            if (equipmentTab) {
                const equipmentItems = equipmentTab.querySelectorAll('li, .application-item, .equipment-item');
                equipmentItems.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.length > 2) {
                        result.applications.push(text);
                    }
                });
            }

            // Extract Engine Applications
            const engineTab = document.querySelector('[data-tab="engine"], #engine, .engine-applications');
            if (engineTab) {
                const engineItems = engineTab.querySelectorAll('li, .application-item, .engine-item');
                engineItems.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.length > 2) {
                        result.engineApplications.push(text);
                    }
                });
            }

            // Fallback: Try to find applications in any list on the page
            if (result.applications.length === 0) {
                const allLists = document.querySelectorAll('ul li, .application, .app-list li');
                allLists.forEach(el => {
                    const text = el.textContent.trim();
                    // Filter out navigation and irrelevant items
                    if (text && text.length > 5 && !text.toLowerCase().includes('home') && !text.toLowerCase().includes('product')) {
                        if (text.match(/[A-Z0-9]/)) {
                            result.applications.push(text);
                        }
                    }
                });
            }

            return result;
        });

        await browser.close();

        console.log(`✅ [Fleetguard] Data extracted for ${code}:`, {
            applications: data.applications.length,
            engineApplications: data.engineApplications.length,
            crossCodes: data.crossCodes.length
        });

        return data;

    } catch (error) {
        console.error(`❌ [Fleetguard] Scraping error for ${code}:`, error.message);
        if (browser) await browser.close();
        return {
            found: false,
            technical: {},
            crossCodes: [],
            applications: [],
            engineApplications: [],
            description: ''
        };
    }
}

module.exports = {
    scrapeFleetguardBySearch
};
