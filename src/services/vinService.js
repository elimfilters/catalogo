// ============================================================================
// VIN SERVICE - Simplified Version
// Basic VIN decoding without external dependencies
// ============================================================================

/**
 * Validate VIN format
 * @param {string} vin - VIN to validate
 * @returns {boolean} - True if valid format
 */
function isValidVIN(vin) {
    if (!vin || typeof vin !== 'string') return false;
    return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Decode VIN basic information
 * @param {string} vin - VIN code
 * @returns {object} - Decoded information
 */
function decodeVIN(vin) {
    try {
        if (!isValidVIN(vin)) {
            return {
                valid: false,
                error: 'Invalid VIN format. VIN must be 17 characters.'
            };
        }

        const vinUpper = vin.toUpperCase();
        
        // Extract basic VIN components
        const wmi = vinUpper.substring(0, 3);  // World Manufacturer Identifier
        const vds = vinUpper.substring(3, 9);  // Vehicle Descriptor Section
        const vis = vinUpper.substring(9, 17); // Vehicle Identifier Section
        const year = vinUpper.charAt(9);       // Model year
        
        // Basic manufacturer detection (simplified)
        let manufacturer = 'Unknown';
        if (wmi.startsWith('1') || wmi.startsWith('4') || wmi.startsWith('5')) {
            manufacturer = 'USA';
        } else if (wmi.startsWith('2')) {
            manufacturer = 'Canada';
        } else if (wmi.startsWith('3')) {
            manufacturer = 'Mexico';
        } else if (wmi.startsWith('J')) {
            manufacturer = 'Japan';
        } else if (wmi.startsWith('K')) {
            manufacturer = 'Korea';
        } else if (wmi.startsWith('W') || wmi.startsWith('V')) {
            manufacturer = 'Germany';
        }

        return {
            valid: true,
            vin: vinUpper,
            wmi,
            vds,
            vis,
            manufacturer,
            year_code: year,
            message: 'VIN decoded successfully. For complete vehicle filter information, please provide vehicle year, make, and model.'
        };

    } catch (error) {
        console.error('VIN decode error:', error);
        return {
            valid: false,
            error: 'Error decoding VIN',
            details: error.message
        };
    }
}

module.exports = {
    decodeVIN,
    isValidVIN
};
