require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

const app = express();

// Configuración de CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://elimfilters.com', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * ENDPOINT PRINCIPAL - CON DATOS DE PRUEBA
 * Como Google Sheets y MongoDB están vacíos, devuelve datos MOCK
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { searchTerm, searchType } = req.body;

        if (!searchTerm || !searchType) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing search data. Required: searchTerm and searchType" 
            });
        }

        console.log('🔍 Search received:', { searchTerm, searchType });

        // DATOS DE PRUEBA (MOCK) - Hasta que Google Sheets/MongoDB tengan datos
        const mockData = {
            sku: `EL8-${searchTerm.toUpperCase()}`,
            filterType: "Heavy Duty Lube Filter",
            description: `ELIMFILTERS premium filter for ${searchTerm}. SISTEMGUARD™ EK5 technology with German quality standards.`,
            imageUrl: "https://elimfilters.com/wp-content/uploads/2025/08/Screenshot-2025-08-20-204050.png",
            specifications: [
                { label: "Outside Diameter", value: "93.5 mm" },
                { label: "Height", value: "142 mm" },
                { label: "Thread Size", value: "M20 x 1.5" },
                { label: "Gasket OD", value: "71 mm" },
                { label: "Filter Type", value: "Spin-On" },
                { label: "Micron Rating", value: "25 microns" },
                { label: "Max Flow Rate", value: "45 L/min" },
                { label: "Burst Pressure", value: "250 PSI" }
            ],
            equipment: [
                { equipment: "CAT 320D", engine: "C6.6 ACERT", year: "2008-2015", quantity: "1" },
                { equipment: "CAT 330D", engine: "C9 ACERT", year: "2007-2013", quantity: "1" },
                { equipment: "Volvo EC210", engine: "D6E", year: "2010-2018", quantity: "2" }
            ],
            oemCross: {
                "Caterpillar": ["1R-0750", "1R-1807", "1R-0739"],
                "Donaldson": ["P551329", "P550345"],
                "Fleetguard": ["LF3000", "LF667"],
                "Baldwin": ["B7125", "B7335"]
            },
            crossReference: [
                "WIX 51348", "FRAM PH8170", "MANN W962", 
                "MAHLE OC47", "BOSCH 0451103274", "HENGST H200W"
            ],
            maintenanceKits: [
                { code: "EK5-320D", description: "Complete service kit for CAT 320D - includes oil, fuel, air filters" },
                { code: "EK5-VOLVO", description: "Volvo EC210 maintenance package - 500hr service" }
            ]
        };

        res.json({
            success: true,
            data: mockData
        });

        console.log('✅ Mock data sent successfully');

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message 
        });
    }
});

/**
 * ENDPOINT ALTERNATIVO - Para compatibilidad
 */
app.post('/api/search', async (req, res) => {
    try {
        const { searchTerm, searchType } = req.body;

        if (!searchTerm || !searchType) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing search data" 
            });
        }

        console.log('🔍 Search received (alt route):', { searchTerm, searchType });

        // Mismo MOCK data
        const mockData = {
            sku: `EL8-${searchTerm.toUpperCase()}`,
            filterType: "Heavy Duty Lube Filter",
            description: `ELIMFILTERS premium filter for ${searchTerm}. SISTEMGUARD™ EK5 technology.`,
            imageUrl: "https://elimfilters.com/wp-content/uploads/2025/08/Screenshot-2025-08-20-204050.png",
            specifications: [
                { label: "Outside Diameter", value: "93.5 mm" },
                { label: "Height", value: "142 mm" },
                { label: "Thread Size", value: "M20 x 1.5" }
            ],
            equipment: [
                { equipment: "CAT 320D", engine: "C6.6 ACERT", year: "2008-2015", quantity: "1" }
            ],
            oemCross: {
                "Caterpillar": ["1R-0750"],
                "Donaldson": ["P551329"]
            },
            crossReference: ["WIX 51348", "FRAM PH8170"],
            maintenanceKits: []
        };

        res.json({
            success: true,
            data: mockData
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server ready on port ${PORT}`);
    console.log(`📦 Running with MOCK data (Google Sheets/MongoDB empty)`);
});
