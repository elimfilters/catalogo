// ============================================================================
// GOOGLE SHEETS SYNC SERVICE
// Export MongoDB cache to Google Sheet Master for visualization/reporting
// ============================================================================

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { getAllFilters } = require('./mongoService');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function initSheet() {
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        console.log(`📊 Google Sheet loaded: ${doc.title}`);
        return doc;

    } catch (error) {
        console.error('❌ Error initializing Google Sheet:', error.message);
        throw error;
    }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync MongoDB cache to Google Sheets
 * @param {number} limit - Max records to sync
 */
async function syncToSheets(limit = 1000) {
    try {
        console.log('🔄 Starting sync to Google Sheets...');

        // Get all filters from MongoDB
        const filters = await getAllFilters({}, limit);
        
        if (filters.length === 0) {
            console.log('⚠️  No filters to sync');
            return { success: false, message: 'No filters in MongoDB' };
        }

        console.log(`📊 Syncing ${filters.length} filters...`);

        // Initialize Sheet
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];

        // Clear existing data (keep headers)
        await sheet.clearRows();

        // Initialize headers if needed
        await sheet.setHeaderRow([
            'CODE_CLIENT',
            'CODE_OEM',
            'DUTY',
            'FAMILY',
            'SKU',
            'MEDIA',
            'SOURCE',
            'CROSS_REF',
            'APPLICATIONS',
            'ATTRIBUTES',
            'TIMESTAMP'
        ]);

        // Prepare rows
        const rows = filters.map(filter => ({
            CODE_CLIENT: filter.code_client || '',
            CODE_OEM: filter.code_oem || '',
            DUTY: filter.duty || '',
            FAMILY: filter.family || '',
            SKU: filter.sku || '',
            MEDIA: filter.media || '',
            SOURCE: filter.source || '',
            CROSS_REF: JSON.stringify(filter.cross_reference || []),
            APPLICATIONS: JSON.stringify(filter.applications || []),
            ATTRIBUTES: JSON.stringify(filter.attributes || {}),
            TIMESTAMP: filter.timestamp ? new Date(filter.timestamp).toISOString() : ''
        }));

        // Add rows in batches (Google Sheets API limit)
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            await sheet.addRows(batch);
            console.log(`✅ Synced batch ${i / batchSize + 1} (${batch.length} rows)`);
        }

        console.log(`✅ Sync complete: ${filters.length} filters synced to Google Sheets`);
        
        return {
            success: true,
            synced: filters.length,
            message: `Successfully synced ${filters.length} filters`
        };

    } catch (error) {
        console.error('❌ Sync error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Append single filter to Google Sheets (real-time)
 * @param {object} filter - Filter data to append
 */
async function appendToSheet(filter) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];

        const rowData = {
            CODE_CLIENT: filter.code_client || filter.query || '',
            CODE_OEM: filter.code_oem || filter.oem_equivalent || '',
            DUTY: filter.duty || '',
            FAMILY: filter.family || '',
            SKU: filter.sku || '',
            MEDIA: filter.media || '',
            SOURCE: filter.source || '',
            CROSS_REF: JSON.stringify(filter.cross_reference || []),
            APPLICATIONS: JSON.stringify(filter.applications || []),
            ATTRIBUTES: JSON.stringify(filter.attributes || {}),
            TIMESTAMP: new Date().toISOString()
        };

        await sheet.addRow(rowData);
        console.log(`📊 Appended to Sheet: ${filter.sku}`);

    } catch (error) {
        console.error('❌ Error appending to sheet:', error.message);
        // Non-critical, don't throw
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    syncToSheets,
    appendToSheet
};
