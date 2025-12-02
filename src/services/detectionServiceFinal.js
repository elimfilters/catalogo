// ============================================================================
// DETECTION SERVICE FINAL - v5.2.0
// Flujo correcto: ValidaciÃ³n â†’ Google Sheets â†’ GeneraciÃ³n â†’ Guardado â†’ Return
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const prefixMap = require('../config/prefixMap');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = require('../sku/generator');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, upsertBySku } = require('./syncSheetsService');
const { enrichHDWithFleetguard } = require('./fleetguardEnrichmentService');
const { enrichFramLD } = require('./framEnrichmentService');
const { saveToCache } = require('./mongoService');
const { upsertMarinosBySku } = require('./marineImportService');
const { extractFramSpecs, extractDonaldsonSpecs, getDefaultSpecs, extractParkerSpecs, extractMercurySpecs, extractSierraSpecs } = require('../services/technicalSpecsScraper');
// OEM dataset para fallback SOLO cuando el cÃ³digo no es ni Donaldson ni FRAM (Regla 3)
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

function canonKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function classifyInputCode(code) {
  const up = prefixMap.normalize(code);
  const isDonaldson = prefixMap.DONALDSON_STRICT_REGEX?.test?.(up);
  const isFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(up);
  if (isDonaldson) return 'MANUFACTURER_DONALDSON';
  if (isFram) return 'MANUFACTURER_FRAM';
  const meta = OEM_XREF[canonKey(code)];
  if (meta && meta.brand) return 'OEM';
  return /^[A-Z]{1,4}\d{3,}/.test(up) ? 'CROSS_REF' : 'UNKNOWN';
}

async function tryOemFallback(oemCode, duty, familyHint) {
  const key = canonKey(oemCode);
  const meta = OEM_XREF[key] || null;
  // Requisito estricto: solo proceder si el OEM estÃ¡ homologado en OEM_XREF
  if (!meta) {
    return null;
  }

  const family = meta.family || familyHint || null;
  if (!family) return null;

  const last4 = extract4Digits(oemCode);
  const sku = generateSKU(family, duty, last4);
  if (!sku || sku.error) return null;

  // LÃ³gica pura: sin persistencia ni datos por defecto
  const oemClean = [oemCode];
  const crossClean = [];
  const equipFinal = [];
  const engineFinal = [];

  const familyUpper = String(family).toUpperCase();
  const attributes = {
    manufactured_by: 'ELIMFILTERS',
    oem_brand: meta?.brand || undefined
  };

  return {
    status: 'OK',
    found_in_master: false,
    query_normalized: normalize.code(oemCode),
    code_input: normalize.code(oemCode),
    code_oem: normalize.code(oemCode),
    oem_codes: oemClean,
    duty,
    family: familyUpper,
    sku,
    media: getMedia(familyUpper, duty),
    source: 'OEM',
    cross_reference: crossClean,
    applications: engineFinal,
    equipment_applications: equipFinal,
    attributes,
    message: 'Fallback OEM homologado: prefijo activo + Ãºltimos 4 del OEM'
  };
}

// Helper local: extraer aÃ±os de un texto
function extractYears(text = '') {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const range = t.match(/\b(19|20)\d{2}\s*[-â€“â€”]\s*(19|20)\d{2}\b/);
    if (range) return `${range[1]}${range[0].slice(range[1].length, range[0].length - range[2].length)}${range[2]}`;
    const present = t.match(/\b(19|20)\d{2}\s*(?:-|to|a|hasta)\s*(?:present|presente|actual)\b/i);
    if (present) return `${present[1]}+`;
    const single = t.match(/\b(19|20)\d{2}\b/);
    if (single) return single[0];
    return '';
}

// ---------------------------------------------------------------------------
// Limpieza y estandarizaciÃ³n global (LD): OEM y Cross-References
// ---------------------------------------------------------------------------
// Prioridad de marcas aftermarket para orden global (mercado mundial)
const AFTERMARKET_PRIORITY = [
    'MOTORCRAFT', 'PUROLATOR', 'WIX', 'NAPA', 'ACDELCO', 'BOSCH', 'K&N', 'STP',
    'CHAMP', 'MICROGARD', 'CARQUEST', 'MOBIL', 'MOBIL 1', 'DENSO', 'SUPERTECH',
    'PREMIUM', 'PREMIUM GUARD', 'HASTINGS', 'BALDWIN',
    // Global brands (EU/ASIA) to consider when presentes
    'MANN-FILTER', 'MAHLE', 'HENGST', 'RYCO', 'CHAMPION', 'UFI', 'SCT', 'FILTRON',
    'VIC', 'TOKYO ROKI',
    // Latin America regionals (lower priority)
    'TECFIL','WEGA','VOX','GFC','VEGA','PARTMO','GOHNER','FILTROS WEB','PREMIUM FILTER','MILLAR FILTERS',
    // Europe regional
    'HIFI FILTER'
];

function cleanOEMList(list, duty) {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const cleaned = [];
    for (const item of arr) {
        const val = String(item || '').trim().replace(/\s+/g, ' ');
        if (!val) continue;
        const code = codeOnly(val);
        if (!code) continue;
        const key = code.toUpperCase();
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(code);
        }
    }
    // Unificar lÃ­mite: siempre mÃ¡ximo 20 elementos
    return cleaned.slice(0, 20);
}

function cleanCrossList(list, duty, inputCode, source) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return arr;

    // Normalize and deduplicate by original string
    const seen = new Set();
    const normalized = [];
    for (const item of arr) {
        const val = String(item || '').trim().replace(/\s+/g, ' ');
        if (!val) continue;
        const key = val.toUpperCase();
        if (!seen.has(key)) {
            seen.add(key);
            normalized.push(val);
        }
    }

    // Eliminar self-codes de FRAM (p.ej., "FRAM PH6607")
    const inputUpper = String(inputCode || '').toUpperCase();
    const filtered = normalized.filter(s => {
        const up = s.toUpperCase();
        const isFramSelf = up.startsWith('FRAM ') && up.includes(inputUpper);
        return !isFramSelf;
    });

    // Map to code-only y deduplicar por cÃ³digo
    const codeSeen = new Set();
    let codeOnlyList = [];
    for (const s of filtered) {
        const c = codeOnly(s);
        if (!c) continue;
        const k = c.toUpperCase();
        if (!codeSeen.has(k)) {
            codeSeen.add(k);
            codeOnlyList.push(c);
        }
    }

    // Filtro adicional para HD Donaldson: eliminar tokens no parecidos a part numbers
    if (String(duty).toUpperCase() === 'HD' && String(source).toUpperCase() === 'DONALDSON') {
        const partNumberLike = (c) => {
            const s = String(c || '').toUpperCase();
            if (!s) return false;
            // Aceptar patrones comunes: "BRANDCODE" o "BRAND-CODE" con dÃ­gitos
            if (/^[A-Z]{1,4}[A-Z0-9\-]*\d[A-Z0-9\-]*$/.test(s)) return true;
            // Aceptar cÃ³digos numÃ©ricos con separadores tÃ­picos
            if (/^\d{3,}(?:[A-Z\-\.]+\d+)?$/.test(s)) return true;
            return false;
        };
        codeOnlyList = codeOnlyList.filter(c => {
            const s = String(c || '');
            if (!partNumberLike(s)) return false;
            if (/^(?:MAPS|GOOGL|GOOGLE|HTTP|HTTPS)$/i.test(s)) return false;
            // Eliminar nÃºmeros puros cortos (<5 dÃ­gitos) que suelen ser ruido
            if (/^\d{1,4}$/.test(s)) return false;
            return true;
        });
    }

    // Orden alfanumÃ©rico por cÃ³digo
    codeOnlyList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // Unificar lÃ­mite: siempre mÃ¡ximo 20 elementos
    return codeOnlyList.slice(0, 20);
}

function cleanAppsList(list, duty) {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const cleaned = [];
    for (const item of arr) {
        let name = '';
        let years = '';
        if (item && typeof item === 'object' && 'name' in item) {
            name = String(item.name || '').trim().replace(/\s+/g, ' ');
            years = String(item.years || '').trim();
        } else {
            const val = String(item || '').trim().replace(/\s+/g, ' ');
            if (!val) continue;
            name = val;
            years = extractYears(val);
        }
        if (!name) continue;
        const key = `${name.toUpperCase()}|${years}`;
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push({ name, years });
        }
    }
    const limited = duty === 'LD' ? cleaned.slice(0, 20) : cleaned;
    return limited;
}

// Extract only the part number code from a string, stripping leading brand words
function codeOnly(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    // Prefer capturing the trailing code-like segment (allows internal hyphens)
    // e.g., "BALDWIN-B495" -> "B495", "FLEETGUARD-LF-910S" -> "FL-910S"
    const m = s.match(/(?:^|[\s\-â€“â€”])([A-Z0-9][A-Z0-9\-\.]*\d[A-Z0-9\-\.]*)$/i);
    if (m && m[1]) {
        return m[1].trim();
    }
    // Fallback: remove leading brand-only prefix tokens (no digits) and keep the rest
    const tokens = s.split(/[\s\-â€“â€”]+/).filter(Boolean);
    let startIdx = 0;
    for (let i = 0; i < tokens.length; i++) {
        if (/\d/.test(tokens[i])) { startIdx = i > 0 ? i - 1 : i; break; }
    }
    const remainder = tokens.slice(startIdx).join('-').trim();
    if (remainder) return remainder;
    // Final fallback: return original string
    return s;
}

// Preferred display: "Brand Model" when brand is detectable in name
const OEM_MANUFACTURERS = [
    'TOYOTA','LEXUS','HONDA','ACURA','NISSAN','INFINITI','FORD','LINCOLN','GM','CHEVROLET','CADILLAC','BUICK','GMC',
    'MOPAR','CHRYSLER','DODGE','JEEP','KIA','HYUNDAI','BMW','AUDI','VOLKSWAGEN','VW','MERCEDES','MERCEDES-BENZ',
    'MAZDA','SUBARU','SUZUKI','PEUGEOT','RENAULT','FIAT','CITROEN','VOLVO','SAAB','PORSCHE','SEAT','SKODA','MINI',
    'MITSUBISHI','ISUZU','YAMAHA','CUMMINS','CATERPILLAR','CAT','DETROIT','MTU','JOHN DEERE','KOMATSU'
];

function preferBrandModelFormat(apps) {
    const arr = Array.isArray(apps) ? apps : [];
    return arr.map(item => {
        if (!item || typeof item !== 'object') return item;
        const name = String(item.name || '').trim();
        if (!name) return item;

        const tokens = name.split(/\s+/);
        const upper = name.toUpperCase();

        function hasBrand(br) { return upper.includes(br); }
        const brand = OEM_MANUFACTURERS.find(b => hasBrand(b));
        if (!brand) return item; // Nothing to do if no detectable brand

        // Patterns: "Model (Brand)" -> "Brand Model"
        const paren = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (paren) {
            const model = paren[1].trim();
            const brandRaw = paren[2].trim();
            const brandUp = brandRaw.toUpperCase();
            const matchBrand = OEM_MANUFACTURERS.find(b => brandUp.includes(b));
            if (matchBrand) {
                const newName = `${matchBrand.charAt(0) + matchBrand.slice(1).toLowerCase()} ${model}`.trim();
                return { ...item, name: newName };
            }
        }

        // Patterns: "Brand - Model" or "Model - Brand"
        const dash = name.split(/\s*[-â€“â€”]\s*/);
        if (dash.length === 2) {
            const a = dash[0].trim();
            const b = dash[1].trim();
            const aUp = a.toUpperCase();
            const bUp = b.toUpperCase();
            const aBrand = OEM_MANUFACTURERS.find(x => aUp.includes(x));
            const bBrand = OEM_MANUFACTURERS.find(x => bUp.includes(x));
            if (aBrand && !bBrand) {
                return { ...item, name: `${aBrand.charAt(0) + aBrand.slice(1).toLowerCase()} ${b}` };
            }
            if (bBrand && !aBrand) {
                return { ...item, name: `${bBrand.charAt(0) + bBrand.slice(1).toLowerCase()} ${a}` };
            }
        }

        // Pattern: trailing brand (e.g., "Camry Toyota") -> "Toyota Camry"
        const lastToken = tokens[tokens.length - 1];
        const lastUp = String(lastToken || '').toUpperCase();
        const trailingBrand = OEM_MANUFACTURERS.find(x => lastUp.includes(x));
        if (trailingBrand && tokens.length > 1 && !name.toUpperCase().startsWith(trailingBrand)) {
            const model = tokens.slice(0, -1).join(' ').trim();
            return { ...item, name: `${trailingBrand.charAt(0) + trailingBrand.slice(1).toLowerCase()} ${model}` };
        }

        // Already starts with brand or no clear model separation; keep as is
        return item;
    });
}

// Defaults to guarantee minimum application count
const LD_ENGINE_DEFAULTS = [
    { name: 'Gasoline Engines', years: '' },
    { name: 'Diesel Engines', years: '' },
    { name: 'Hybrid Engines', years: '' },
    { name: 'V6 Engines', years: '' },
    { name: 'V8 Engines', years: '' },
    { name: 'Inline-4 Engines', years: '' },
    { name: 'Inline-6 Engines', years: '' },
    { name: 'Turbocharged Engines', years: '' },
    { name: 'High-Performance Engines', years: '' },
    { name: 'Small Displacement Engines', years: '' },
    { name: 'Naturally Aspirated Engines', years: '' }
];

const LD_EQUIPMENT_DEFAULTS = [
    { name: 'Passenger Vehicles', years: '' },
    { name: 'Light Trucks', years: '' },
    { name: 'SUVs', years: '' },
    { name: 'Crossovers', years: '' },
    { name: 'Minivans', years: '' },
    { name: 'Compact Cars', years: '' },
    { name: 'Midsize Cars', years: '' },
    { name: 'Full-Size Cars', years: '' },
    { name: 'Pickup Trucks', years: '' },
    { name: 'Performance Cars', years: '' },
    { name: 'Luxury Vehicles', years: '' }
];

const HD_ENGINE_DEFAULTS = [
    { name: 'Heavy Duty Diesel Engines', years: '' },
    { name: 'Inline-6 Diesel Engines', years: '' },
    { name: 'V8 Diesel Engines', years: '' },
    { name: 'Turbo Diesel Engines', years: '' },
    { name: 'Offâ€‘Highway Diesel Engines', years: '' },
    { name: 'Marine Diesel Engines', years: '' },
    { name: 'Generator Diesel Engines', years: '' },
    { name: 'Bus and Coach Diesel Engines', years: '' },
    { name: 'Industrial Diesel Engines', years: '' },
    { name: 'Agricultural Diesel Engines', years: '' },
    { name: 'Railway Diesel Engines', years: '' }
];

const HD_EQUIPMENT_DEFAULTS = [
    { name: 'Commercial Trucks', years: '' },
    { name: 'Construction Equipment', years: '' },
    { name: 'Agricultural Equipment', years: '' },
    { name: 'Mining Machinery', years: '' },
    { name: 'Buses and Coaches', years: '' },
    { name: 'Heavy Machinery', years: '' },
    { name: 'Generators', years: '' },
    { name: 'Marine Equipment', years: '' },
    { name: 'Industrial Equipment', years: '' },
    { name: 'Forestry Equipment', years: '' },
    { name: 'Rail Equipment', years: '' }
];

function ensureMinApps(list, duty, kind) {
    const targetMin = 10;
    const out = Array.isArray(list) ? [...list] : [];
    const seen = new Set(out.map(x => `${String(x?.name || '').toUpperCase()}|${String(x?.years || '')}`));
    if (out.length < targetMin && kind === 'engine') {
        const defaults = duty === 'LD' ? LD_ENGINE_DEFAULTS : HD_ENGINE_DEFAULTS;
        for (const def of defaults) {
            const key = `${def.name.toUpperCase()}|${def.years}`;
            if (!seen.has(key)) {
                out.push(def);
                seen.add(key);
            }
            if (out.length >= targetMin) break;
        }
    }
    // Limitar a 20 elementos para LD y HD
    return out.slice(0, 20);
}

// Consolidate multiple entries of the same name into one with merged years
function consolidateApps(list) {
    const arr = Array.isArray(list) ? list : [];
    const groups = new Map(); // nameUpper -> { name, yearsSet: Set<string>, parsed: [{start,end,open}]} 

    function parseYears(y) {
        const s = String(y || '').trim();
        if (!s) return null;
        const range = s.match(/^((?:19|20)\d{2})\s*[-â€“â€”]\s*((?:19|20)\d{2})$/);
        if (range) {
            const start = parseInt(range[1], 10);
            const end = parseInt(range[2], 10);
            if (!isNaN(start) && !isNaN(end)) return { start, end, open: false };
        }
        const open = s.match(/^((?:19|20)\d{2})\+$/);
        if (open) {
            const start = parseInt(open[1], 10);
            if (!isNaN(start)) return { start, end: null, open: true };
        }
        const single = s.match(/^((?:19|20)\d{2})$/);
        if (single) {
            const year = parseInt(single[1], 10);
            if (!isNaN(year)) return { start: year, end: year, open: false };
        }
        return null;
    }

    for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        const name = String(item.name || '').trim();
        if (!name) continue;
        const years = String(item.years || '').trim();
        const key = name.toUpperCase();
        if (!groups.has(key)) {
            groups.set(key, { name, yearsSet: new Set(), parsed: [] });
        }
        const g = groups.get(key);
        if (years) g.yearsSet.add(years);
        const parsed = parseYears(years);
        if (parsed) g.parsed.push(parsed);
    }

    const consolidated = [];
    for (const [, g] of groups) {
        let yearsOut = '';
        if (g.parsed.length > 0) {
            let minStart = Infinity;
            let maxEnd = -Infinity;
            let hasOpen = false;
            for (const p of g.parsed) {
                if (p.start < minStart) minStart = p.start;
                if (p.end === null) {
                    hasOpen = true;
                } else {
                    if (p.end > maxEnd) maxEnd = p.end;
                }
            }
            if (minStart !== Infinity) {
                if (hasOpen) {
                    yearsOut = `${minStart}+`;
                } else if (maxEnd !== -Infinity) {
                    yearsOut = minStart === maxEnd ? `${minStart}` : `${minStart}-${maxEnd}`;
                }
            }
        } else if (g.yearsSet.size > 0) {
            // Fallback: concatenate unique strings if unparsable
            yearsOut = Array.from(g.yearsSet).join(', ');
        }
        consolidated.push({ name: g.name, years: yearsOut });
    }
    return consolidated;
}

// ============================================================================
// MAIN DETECTION SERVICE
// ============================================================================

async function detectFilter(rawInput, lang = 'en', options = {}) {
    try {
        const query = normalize.code(rawInput);
        const force = !!(options && options.force);
        const generateAll = !!(options && options.generateAll);

        console.log(`ðŸ“Š Processing: ${query}`);

        // ---------------------------------------------------------------------
        // PASO 1: VALIDAR CÃ“DIGO (OEM o Cross-Reference vÃ¡lido)
        // ---------------------------------------------------------------------
        console.log(`ðŸ” Step 1: Validating code via scrapers...`);
        
        const codeUpper = prefixMap.normalize(query);

        // Initial duty via prefix map hint; fallback to FRAM-pattern LD vs HD
        const hint = prefixMap.resolveBrandFamilyDutyByPrefix(codeUpper) || {};
        let duty = hint.duty || (/^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper) ? 'LD' : 'HD');
        // Override: ECOGARD cabin 'XC' prefix should be treated as LD
        try {
            const prefixMatch = codeUpper.match(/^([A-Z]{1,4})/);
            const prefix = prefixMatch ? prefixMatch[1] : '';
            if (duty === 'HD' && prefix === 'XC') {
                duty = 'LD';
                console.log('ðŸ”„ Duty override â†’ LD for ECOGARD XC prefix');
            }
            // Override: WIX numeric XP series (e.g., 57356XP) are automotive LD
            if (duty === 'HD' && /^\d{5}XP$/.test(codeUpper)) {
                duty = 'LD';
                console.log('ðŸ”„ Duty override â†’ LD for WIX XP numeric series');
            }
        } catch (_) {}
        console.log(`âœ… Duty detected: ${duty} (init via prefix hint: ${hint.brand || 'N/A'})`);

        // Validar cÃ³digo con scrapers
        let scraperResult = await scraperBridge(query, duty);

        // Fallback HD: cruce curado aftermarket/OEM â†’ Donaldson (ej. BF7633 â†’ P551313)
        if ((!scraperResult || !scraperResult.last4) && duty === 'HD') {
            try {
                const upHD = prefixMap.normalize(query);
                const HD_CURATED_MAP = {
                    'BF7633': 'P551313',
                    // Regla de oro: Caterpillar OEM â†’ Donaldson
                    '1R0750': 'P551311',
                    '8041642': 'P828889'
                };
                const mapped = HD_CURATED_MAP[upHD];
                if (mapped) {
                    const { validateDonaldsonCode } = require('../scrapers/donaldson');
                    const don = await validateDonaldsonCode(mapped);
                    if (don && don.last4) {
                        scraperResult = don;
                        duty = 'HD';
                        console.log(`âœ… Canonizado vÃ­a cruce curado HD (Baldwinâ†’Donaldson): ${query} â†’ ${mapped}`);
                    }
                }
            } catch (hdCuratedErr) {
                console.log(`âš ï¸  Error en cruce curado HD: ${hdCuratedErr.message}`);
            }
        }

        // Fallback: intentar resolver OEMâ†’FRAM con mapa curado solo si el duty es LD
        if ((!scraperResult || !scraperResult.last4) && duty === 'LD') {
            try {
                const { resolveFramByCuratedOEM, validateFramCode } = require('../scrapers/fram');
                const framResolved = resolveFramByCuratedOEM(query);
                if (framResolved) {
                    const fr2 = await validateFramCode(framResolved);
                    if (fr2 && fr2.last4) {
                        scraperResult = fr2;
                        duty = 'LD';
                        console.log(`âœ… Resuelto vÃ­a mapa curado OEMâ†’FRAM (LD): ${query} â†’ ${framResolved}`);
                    }
                }
            } catch (fallbackErr) {
                console.log(`âš ï¸  Error en fallback OEMâ†’FRAM (LD): ${fallbackErr.message}`);
            }
            // FRAM-first canonicalization for LD cross references (e.g., ECOGARD XC â†’ FRAM CF)
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const { findFramCode } = require('../scrapers/Fram complete');
                    const { validateFramCode } = require('../scrapers/fram');
                    const framX = findFramCode(query);
                    if (framX) {
                        const fr3 = await validateFramCode(framX);
                        if (fr3 && fr3.last4) {
                            scraperResult = fr3;
                            duty = 'LD';
                            console.log(`âœ… Canonizado vÃ­a cross FRAM (LD): ${query} â†’ ${framX}`);
                        }
                    }
                } catch (crossErr) {
                    console.log(`âš ï¸  Error en canonicalizaciÃ³n LD via FRAM cross: ${crossErr.message}`);
                }
            }
            // ECOGARD â†’ FRAM direct series mapping heuristics (LD): XA#### â†’ CA####
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const up = prefixMap.normalize(query);
                    const m = up.match(/^XA(\d{3,5}[A-Z]?)$/);
                    if (m) {
                        const candidate = `CA${m[1]}`;
                        const { validateFramCode } = require('../scrapers/fram');
                        const fr4 = await validateFramCode(candidate);
                        if (fr4 && fr4.last4) {
                            scraperResult = fr4;
                            duty = 'LD';
                            console.log(`âœ… Canonizado vÃ­a heurÃ­stica ECOGARDâ†’FRAM (LD): ${query} â†’ ${candidate}`);
                        }
                    }
                } catch (heurErr) {
                    console.log(`âš ï¸  Error en heurÃ­stica XAâ†’CA: ${heurErr.message}`);
                }
            }
            // ExcepciÃ³n LD: ECOGARD S-series (ej. S11880) â†’ usar OEM curado si FRAM no fabrica
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const brandUp = String(hint.brand || '').toUpperCase();
                    const up = prefixMap.normalize(query);
                    const isEcoS = brandUp === 'ECOGARD' && /^S\d{5}$/.test(up);
                    if (isEcoS) {
                        const ECO_S_TO_OEM = {
                            'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                        };
                        const oems = ECO_S_TO_OEM[up];
                        if (oems && oems.length) {
                            const primaryOEM = oems[0];
                            console.log(`ðŸ” ECOGARD S-series sin FRAM: usando OEM curado ${primaryOEM} para Ãºltimos 4`);
                            const oemFallback = await tryOemFallback(primaryOEM, 'LD', 'OIL');
                            if (oemFallback) {
                                // Simular resultado mÃ­nimo para continuar con generaciÃ³n de SKU
                                scraperResult = {
                                    valid: true,
                                    code: primaryOEM,
                                    source: 'OEM',
                                    family: 'OIL',
                                    duty: 'LD',
                                    last4: extract4Digits(primaryOEM)
                                };
                                duty = 'LD';
                                console.log(`âœ… Fallback OEM aplicado para ECOGARD ${query}: last4=${scraperResult.last4}`);
                            }
                        }
                    }
                } catch (ecoErr) {
                    console.log(`âš ï¸  Error en excepciÃ³n ECOGARD S-series OEM fallback: ${ecoErr.message}`);
                }
            }
        }

        if (!scraperResult || !scraperResult.last4) {
            const codeUpper = prefixMap.normalize(query);
            const looksDonaldson = prefixMap.DONALDSON_STRICT_REGEX.test(codeUpper);
            const looksFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper);
            console.log(`âŒ Invalid code via scrapers: ${query}. looksDonaldson=${looksDonaldson} looksFram=${looksFram}`);

            // Nueva regla: Si FRAM/Donaldson no lo fabrican, intentar fallback OEM con prefijo + Ãºltimos 4
            if (looksDonaldson || looksFram) {
                const famHintA = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackA = await tryOemFallback(query, duty, famHintA);
                if (oemFallbackA) {
                    console.log(`âœ… OEM fallback aplicado (fabricante no fabrica): ${query} â†’ ${oemFallbackA.sku}`);
                    return oemFallbackA;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'Fabricante no fabrica y no hay metadata OEM suficiente para aplicar prefijo + Ãºltimos 4.',
                    valid: false
                };
            }

            // Regla: si el duty es HD/LD, exigir homologaciÃ³n del fabricante y NO aplicar fallback OEM
            // ExcepciÃ³n: LD ECOGARD S-series permite fallback OEM curado
            const up2 = prefixMap.normalize(query);
            const hint2 = prefixMap.resolveBrandFamilyDutyByPrefix(up2) || {};
            const brandUp2 = String(hint2.brand || hint.brand || '').toUpperCase();
            const allowEcoSFallback = (duty === 'LD' && brandUp2 === 'ECOGARD' && /^S\d{5}$/.test(up2));
            if (!allowEcoSFallback && (duty === 'HD' || duty === 'LD')) {
                // Intentar regla OEM general antes de abandonar
                const famHintB = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackB = await tryOemFallback(query, duty, famHintB);
                if (oemFallbackB) {
                    console.log(`âœ… OEM fallback aplicado (HD/LD sin homologaciÃ³n): ${query} â†’ ${oemFallbackB.sku}`);
                    return oemFallbackB;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'HD/LD sin homologaciÃ³n y sin OEM detectable para aplicar prefijo + Ãºltimos 4.',
                    valid: false
                };
            }
            if (allowEcoSFallback) {
                const ECO_S_TO_OEM = {
                    'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                };
                const oems2 = ECO_S_TO_OEM[up2];
                if (oems2 && oems2.length) {
                    const primaryOEM2 = oems2[0];
                    const oemFallback2 = await tryOemFallback(primaryOEM2, 'LD', 'OIL');
                    if (oemFallback2) {
                        console.log(`âœ… OEM fallback aplicado (ExcepciÃ³n ECOGARD S): ${query} â†’ ${oemFallback2.sku}`);
                        return oemFallback2;
                    }
                }
            }
            // Regla 3: NO HD ni LD (no es Donaldson ni FRAM) â†’ fallback OEM
            const oemFallback = await tryOemFallback(query, duty, hint.family);
            if (oemFallback) {
                console.log(`âœ… OEM fallback aplicado (Regla 3): ${query} â†’ ${oemFallback.sku}`);
                return oemFallback;
            }
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Regla 3: NO HD ni LD, pero sin metadata OEM (familia) para generar SKU',
                valid: false
            };
        }

        console.log(`âœ… Code validated: ${query} â†’ ${scraperResult.code} (${scraperResult.source})`);

        // Ajuste de duty basado en la fuente resuelta del scraper
        const sourceUp = String(scraperResult.source || '').toUpperCase();
        if (sourceUp === 'FRAM' && duty !== 'LD') {
            console.log(`ðŸ” Duty adjusted to LD based on FRAM source`);
            duty = 'LD';
        } else if (sourceUp === 'DONALDSON' && duty !== 'HD') {
            console.log(`ðŸ” Duty adjusted to HD based on Donaldson source`);
            duty = 'HD';
        }

        // PolÃ­tica de homologaciÃ³n: HD requiere DONALDSON, LD requiere FRAM
        // ExtensiÃ³n marina/turbina: aceptar OEM Parker/Racor (TURBINE SERIES)
        // y MerCruiser/Sierra (MARINE) para permitir generaciÃ³n jerÃ¡rquica ET9/EM9
        const familyUp = String(scraperResult.family || '').toUpperCase();
        const homologationOk = (
            (duty === 'HD' && sourceUp === 'DONALDSON') ||
            (duty === 'LD' && sourceUp === 'FRAM') ||
            (familyUp === 'TURBINE SERIES' && sourceUp === 'PARKER') ||
            (familyUp === 'MARINE' && (sourceUp === 'PARKER' || sourceUp === 'MERCRUISER' || sourceUp === 'SIERRA'))
        );
        if (!homologationOk) {
            const codeUpper = prefixMap.normalize(query);
            const looksDonaldson = prefixMap.DONALDSON_STRICT_REGEX.test(codeUpper);
            const looksFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper);
            console.log(`â›” HomologaciÃ³n no cumplida: duty=${duty}, source=${sourceUp}, family=${familyUp}. looksDonaldson=${looksDonaldson} looksFram=${looksFram}`);

            // Si parece fabricante, NO fallback OEM (reglas 1 y 2)
            if (looksDonaldson || looksFram) {
                const famHintC = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackC = await tryOemFallback(query, duty, famHintC);
                if (oemFallbackC) {
                    console.log(`âœ… OEM fallback aplicado (no homologaciÃ³n fabricante): ${query} â†’ ${oemFallbackC.sku}`);
                    return oemFallbackC;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'Fabricante no homologado y sin OEM detectable para aplicar prefijo + Ãºltimos 4.',
                    valid: false
                };
            }
            // Regla: si el duty es HD/LD, exigir homologaciÃ³n del fabricante y NO aplicar fallback OEM
            // ExcepciÃ³n: LD ECOGARD S-series permite fallback OEM curado
            {
                const up3 = prefixMap.normalize(query);
                const hint3 = prefixMap.resolveBrandFamilyDutyByPrefix(up3) || {};
                const brandUp3 = String(hint3.brand || hint.brand || '').toUpperCase();
                const allowEcoSFallback2 = (duty === 'LD' && brandUp3 === 'ECOGARD' && /^S\d{5}$/.test(up3));
                if (allowEcoSFallback2) {
                    const ECO_S_TO_OEM = {
                        'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                    };
                    const oems3 = ECO_S_TO_OEM[up3];
                    if (oems3 && oems3.length) {
                        const primaryOEM3 = oems3[0];
                        const oemFallback3 = await tryOemFallback(primaryOEM3, 'LD', 'OIL');
                        if (oemFallback3) {
                            console.log(`âœ… OEM fallback aplicado (ExcepciÃ³n ECOGARD S - no homologaciÃ³n): ${query} â†’ ${oemFallback3.sku}`);
                            return oemFallback3;
                        }
                    }
                }
            }
            if (duty === 'HD' || duty === 'LD') {
                const famHintD = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackD = await tryOemFallback(query, duty, famHintD);
                if (oemFallbackD) {
                    console.log(`âœ… OEM fallback aplicado (HD/LD no homologado): ${query} â†’ ${oemFallbackD.sku}`);
                    return oemFallbackD;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'HD/LD sin homologaciÃ³n y sin OEM detectable para aplicar prefijo + Ãºltimos 4.',
                    valid: false
                };
            }
            // En caso contrario, aplicar Regla 3
            const oemFallback = await tryOemFallback(query, duty, hint.family);
            if (oemFallback) {
                console.log(`âœ… OEM fallback aplicado por no homologaciÃ³n (Regla 3): ${query} â†’ ${oemFallback.sku}`);
                return oemFallback;
            }
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Regla 3: NO HD ni LD, pero sin metadata OEM (familia) para generar SKU',
                valid: false
            };
        }

        // ---------------------------------------------------------------------
        // PRE-CÃLCULO: FAMILIA Y SKU ESPERADO PARA VALIDAR CONTRA MASTER
        // ---------------------------------------------------------------------
        const codeForFamilyPre = String(scraperResult?.code || query || '').toUpperCase();
        let familyPre = null;
        // Preferir hint de familia si viene del prefijo
        if (!familyPre && hint.family) {
            familyPre = hint.family;
        }
        // HeurÃ­sticas por prefijo FRAM
        if (/^CA/.test(codeForFamilyPre)) {
            familyPre = 'AIRE';
        } else if (/^(CF|CH)/.test(codeForFamilyPre)) {
            familyPre = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeForFamilyPre)) {
            familyPre = 'OIL';
        } else if (/^(G|PS)/.test(codeForFamilyPre)) {
            familyPre = 'FUEL';
        } else {
            // Usar familia derivada del scraper
            if (duty === 'HD') {
                familyPre = detectFamilyHD(scraperResult.family);
            } else {
                familyPre = detectFamilyLD(scraperResult.family);
            }
        }

        // Construir SKU esperado con prefijo oficial y Ãºltimos 4 homologados
        // EM9/ET9 hierarchical SKU generation
        const codeRawPre = String(scraperResult?.code || query || '').trim();
        const upPre = codeRawPre.toUpperCase();
        let expectedSkuPre;
        if (String(familyPre).toUpperCase() === 'TURBINE SERIES') {
            if (/^\d{3,5}(MA|FH)\b/.test(upPre)) {
                expectedSkuPre = generateET9SystemSKU(codeRawPre);
            } else if (/^(2010|2020|2040)/.test(upPre)) {
                expectedSkuPre = generateET9FElementSKU(codeRawPre);
            } else {
                expectedSkuPre = generateSKU(familyPre, duty, scraperResult.last4);
            }
        } else if (/^R(12|15|20|25|45|60|90|120)(T|S)$/i.test(codeRawPre)) {
            expectedSkuPre = generateEM9SSeparatorSKU(codeRawPre);
            familyPre = 'MARINE';
        } else if (String(familyPre).toUpperCase() === 'MARINE') {
            const famHintRaw = String(hint.family || scraperResult.family || '').toUpperCase();
            const baseFam = ['OIL','FUEL','AIRE'].includes(famHintRaw) ? famHintRaw : 'FUEL';
            const l4al = scraperResult.last4_alnum || extract4Alnum(codeRawPre) || scraperResult.last4;
            expectedSkuPre = generateEM9SubtypeSKU(baseFam, l4al);
        } else {
            expectedSkuPre = generateSKU(familyPre, duty, scraperResult.last4);
        }

        // ---------------------------------------------------------------------
        // PASO 2: BUSCAR SI YA EXISTE SKU EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`ðŸ“Š Step 2: Checking Google Sheet Master for existing SKU...`);
        
        try {
            const existingSKU = await searchInSheet(query);

            if (existingSKU && existingSKU.found) {
                if (force) {
                    console.log(`âš™ï¸  FORCE enabled: ignoring Master SKU (${existingSKU.sku}) and regenerating`);
                } else {
                    console.log(`âœ… SKU already exists in Master: ${query} â†’ ${existingSKU.sku}`);
                    // Validar contra la homologaciÃ³n actual: familia, duty y Ãºltimos 4
                    if (
                        existingSKU.sku === expectedSkuPre &&
                        String(existingSKU.family).toUpperCase() === String(familyPre).toUpperCase() &&
                        String(existingSKU.duty).toUpperCase() === String(duty).toUpperCase()
                    ) {
                        return {
                            status: 'OK',
                            found_in_master: true,
                            query_normalized: query,
                            code_input: query,
                            code_oem: existingSKU.code_oem,
                            oem_codes: existingSKU.oem_codes || [],
                            duty: existingSKU.duty,
                            family: existingSKU.family,
                            sku: existingSKU.sku,
                            media: existingSKU.media,
                            source: existingSKU.source,
                            cross_reference: existingSKU.cross_reference || [],
                            applications: existingSKU.applications || [],
                            attributes: existingSKU.attributes || {},
                            message: 'SKU encontrado en catÃ¡logo Master'
                        };
                    }
                    // Si no coincide, regenerar y corregir (no retornar aquÃ­)
                    console.log(
                        `â™»ï¸  Mismatch de SKU en Master. Esperado: ${expectedSkuPre} (family=${familyPre}, duty=${duty}, last4=${scraperResult.last4}) ` +
                        `pero existe: ${existingSKU.sku}. Se corregirÃ¡ y se harÃ¡ upsert.`
                    );
                }
            }
            
            console.log(`âš ï¸  SKU not found in Master - will generate new SKU`);
        } catch (sheetError) {
            console.log(`âš ï¸  Google Sheets lookup error: ${sheetError.message}`);
            // Continue to generate SKU anyway
        }

        // ---------------------------------------------------------------------
        // PASO 3: GENERAR SKU ELIMFILTERS
        // ---------------------------------------------------------------------
        console.log(`ðŸ”§ Step 3: Generating new SKU...`);

        // Determine family based on resolved code (prefer validated FRAM/DONALDSON code)
        const codeForFamily = String(scraperResult?.code || query || '').toUpperCase();
        let family = null;
        // Prefer prefix hint family when available
        if (!family && hint.family) {
            family = hint.family;
        }
        if (/^CA/.test(codeForFamily)) {
            family = 'AIRE';
        } else if (/^(CF|CH)/.test(codeForFamily)) {
            family = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeForFamily)) {
            family = 'OIL';
        } else if (/^(G|PS)/.test(codeForFamily)) {
            family = 'FUEL';
        } else {
            // Use scraper-derived family as hint
            if (duty === 'HD') {
                family = detectFamilyHD(scraperResult.family);
            } else {
                family = detectFamilyLD(scraperResult.family);
            }
        }

        if (!family) {
            console.log(`âŒ Family detection failed for ${scraperResult.code}`);
            if (force) {
                console.log('âš™ï¸  FORCE mode: applying fallback family heuristics');
                if (/^CA/i.test(codeForFamily)) {
                    family = 'AIRE';
                } else if (/^(CF|CH)/i.test(codeForFamily)) {
                    family = 'CABIN';
                } else if (/^(PH|TG|XG|HM)/i.test(codeForFamily)) {
                    family = 'OIL';
                } else if (/^(G|PS)/i.test(codeForFamily)) {
                    family = 'FUEL';
                } else {
                    family = 'OIL';
                }
                console.log(`âœ… FORCE fallback family: ${family}`);
            } else {
                return noEquivalentFound(query, lang);
            }
        }

        console.log(`âœ… Family: ${family}`);

        // Hierarchical generation for EM9/ET9
        const codeRaw = String(scraperResult?.code || query || '').trim();
        const upCode = codeRaw.toUpperCase();
        let sku;
        if (String(family).toUpperCase() === 'TURBINE SERIES') {
            if (/^\d{3,5}(MA|FH)\b/.test(upCode)) {
                sku = generateET9SystemSKU(codeRaw);
            } else if (/^(2010|2020|2040)/.test(upCode)) {
                sku = generateET9FElementSKU(codeRaw);
            } else {
                sku = generateSKU(family, duty, scraperResult.last4);
            }
        } else if (/^R(12|15|20|25|45|60|90|120)(T|S)$/i.test(codeRaw)) {
            sku = generateEM9SSeparatorSKU(codeRaw);
            family = 'MARINE';
        } else if (String(family).toUpperCase() === 'MARINE') {
            const famHintRaw = String(hint.family || scraperResult.family || '').toUpperCase();
            const baseFam = ['OIL','FUEL','AIRE'].includes(famHintRaw) ? famHintRaw : 'FUEL';
            const l4al = scraperResult.last4_alnum || extract4Alnum(codeRaw) || scraperResult.last4;
            sku = generateEM9SubtypeSKU(baseFam, l4al);
        } else {
            sku = generateSKU(family, duty, scraperResult.last4);
        }

        if (!sku || sku.error) {
            console.log(`âŒ SKU generation failed: ${sku?.error}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`âœ… SKU Generated: ${sku}`);

        // ---------------------------------------------------------------------
        // PASO 4: ENRIQUECER ESPECIFICACIONES (Engines/Equipment) Y GUARDAR EN MASTER
        // ---------------------------------------------------------------------
        console.log(`ðŸ’¾ Step 4: Enriching specs and saving to Google Sheet Master...`);
        let specs;
        try {
            if (sourceUp === 'DONALDSON') {
                specs = await extractDonaldsonSpecs(scraperResult.code);
            } else if (sourceUp === 'FRAM') {
                specs = await extractFramSpecs(scraperResult.code);
            } else if (sourceUp === 'PARKER') {
                specs = await extractParkerSpecs(scraperResult.code);
            } else if (sourceUp === 'MERCRUISER') {
                specs = await extractMercurySpecs(scraperResult.code);
            } else if (sourceUp === 'SIERRA') {
                specs = await extractSierraSpecs(scraperResult.code);
            } else {
                specs = getDefaultSpecs(scraperResult.code, scraperResult.source || (duty === 'HD' ? 'DONALDSON' : 'FRAM'));
            }
        } catch (e) {
            specs = getDefaultSpecs(scraperResult.code, scraperResult.source || (duty === 'HD' ? 'DONALDSON' : 'FRAM'));
        }
        
        const rawOEMList = [
            ...(Array.isArray(scraperResult.attributes?.oem_numbers) ? scraperResult.attributes.oem_numbers : (scraperResult.oem || [])),
            ...((specs?.technical_details?.oem_codes) || (specs?.oem_codes) || [])
        ];
        const rawCross = [
            ...(scraperResult.cross || []),
            ...((specs?.technical_details?.cross_reference) || (specs?.cross_reference) || [])
        ];
        const rawEquipApps = specs?.equipment_applications || scraperResult.applications || [];
        const rawEngineApps = specs?.engine_applications || [];
        const oemClean = cleanOEMList(rawOEMList, duty);
        const crossClean = cleanCrossList(rawCross, duty, scraperResult.code, scraperResult.source);
        const equipClean = cleanAppsList(rawEquipApps, duty);
        const engineClean = cleanAppsList(rawEngineApps, duty);
const engineCons = consolidateApps(engineClean);
const equipCons = consolidateApps(equipClean);
// Aplicar preferencia de visualizaciÃ³n "Fabricante + Modelo" cuando haya marca detectable
const engineFmt = preferBrandModelFormat(engineCons);
const equipFmt = preferBrandModelFormat(equipCons);
const engineFinal = ensureMinApps(engineFmt, duty, 'engine');
const equipFinal = ensureMinApps(equipFmt, duty, 'equipment');

        let masterData = {
            query_normalized: query,
            code_input: query,
            code_oem: scraperResult.code,
            oem_codes: oemClean,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            filter_type: family,
            source: scraperResult.source,
            cross_reference: crossClean,
            applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: {
                // Basic attributes from scraper
                ...scraperResult.attributes,
                // Specs from extractor (selected fields)
                height_mm: specs?.dimensions?.height_mm,
                outer_diameter_mm: specs?.dimensions?.outer_diameter_mm,
                inner_diameter_mm: specs?.dimensions?.inner_diameter_mm,
                thread_size: specs?.dimensions?.thread_size,
                gasket_od_mm: specs?.dimensions?.gasket_od_mm,
                iso_main_efficiency_percent: specs?.performance?.iso_main_efficiency_percent,
                iso_test_method: specs?.performance?.iso_test_method,
                micron_rating: specs?.performance?.micron_rating,
                flow_gph: specs?.performance?.flow_gph,
                flow_lph: specs?.performance?.flow_lph,
                manufacturing_standards: specs?.technical_details?.manufacturing_standards,
                certification_standards: specs?.technical_details?.certification_standards,
                operating_temperature_min_c: specs?.technical_details?.operating_temperature_min_c,
                operating_temperature_max_c: specs?.technical_details?.operating_temperature_max_c,
                fluid_compatibility: specs?.technical_details?.fluid_compatibility,
                service_life_hours: specs?.technical_details?.service_life_hours,
                
                // Description
                description: scraperResult.family || family,
                type: scraperResult.family,
                style: scraperResult.attributes?.style || 'Standard',
                
                // Default standards
                manufacturing_standards: duty === 'HD' ? 'ISO 9001, ISO/TS 16949' : 'ISO 9001',
                certification_standards: duty === 'HD' ? 'ISO 5011, ISO 4548-12' : 'SAE J806',
                iso_test_method: duty === 'HD' ? 'ISO 5011' : 'SAE J806',
                
                // Operating parameters
                service_life_hours: '500',
                manufactured_by: 'ELIMFILTERS'
            },
            last4: scraperResult.last4,
            oem_equivalent: scraperResult.code
        };

        // LD Legal Protection & Enrichment (FRAM)
        if (duty === 'LD' && String(scraperResult.source || '').toUpperCase() === 'FRAM') {
            // Move cross codes into oem_codes and set cross_reference label
            try {
                const mergedOEM = Array.from(new Set([...(masterData.oem_codes || []), ...(Array.isArray(crossClean) ? crossClean : [])]));
                masterData.oem_codes = mergedOEM;
                masterData.cross_reference = mergedOEM.length ? 'Multi-Referencia OEM' : 'N/A';
            } catch (_) {
                masterData.cross_reference = 'N/A';
            }

            // Scrape FRAM page and merge mapped attributes
            try {
                const enrichment = await enrichFramLD(scraperResult.code, { family });
                if (enrichment && enrichment.attributes) {
                    masterData.attributes = { ...masterData.attributes, ...enrichment.attributes };
                }
                if (enrichment && enrichment.oem_codes_from_cross && enrichment.oem_codes_from_cross.length) {
                    const mergedOEM2 = Array.from(new Set([...(masterData.oem_codes || []), ...enrichment.oem_codes_from_cross]));
                    masterData.oem_codes = mergedOEM2;
                    masterData.cross_reference = 'Multi-Referencia OEM';
                }
                if (enrichment && enrichment.tecnologia_aplicada) {
                    masterData.attributes.tecnologia_aplicada = enrichment.tecnologia_aplicada;
                }
            } catch (framErr) {
                console.log(`⚠️  FRAM enrichment skipped: ${framErr.message}`);
            }
        }

        // HD Fleetguard enrichment (Phase 2 & 3): only for DONALDSON-based HD flows
        try {
            const srcUp2 = String(scraperResult.source || '').toUpperCase();
            if (duty === 'HD' && srcUp2 === 'DONALDSON' && scraperResult.code && sku) {
                const { masterData: mdEnriched, mongoDoc } = await enrichHDWithFleetguard(masterData, {
                    codeDonaldson: scraperResult.code,
                    skuInterno: sku,
                });
                if (mdEnriched) {
                    // Replace masterData with enriched fields prior to upsert
                    Object.assign(masterData, mdEnriched);
                }
                if (mongoDoc) {
                    // Save enriched document to MongoDB cache (arrays preserved)
                    try { await saveToCache(mongoDoc); } catch (e) { console.log(`⚠️  Mongo save failed: ${e.message}`); }
                }
            }
        } catch (enrichErr) {
            console.log(`⚠️  Fleetguard enrichment skipped: ${enrichErr.message}`);
        }

        try {
            if (/^(EM9|ET9)/.test(String(sku))) {
                await upsertMarinosBySku(masterData);
                console.log(`âœ… Upserted to Google Sheet 'Marinos': ${sku}`);
            } else {
                await upsertBySku(masterData, { deleteDuplicates: true });
                console.log(`âœ… Upserted to Google Sheet Master: ${sku}`);
            }
        } catch (saveError) {
            console.error(`âŒ Failed to upsert to Google Sheet: ${saveError.message}`);
            // Continue anyway - SKU is generated
        }

        // -----------------------------------------------------------------
        // Optional: generate SKUs for all associated homologated codes
        // -----------------------------------------------------------------
        let generatedAllSummary = [];
        if (generateAll) {
            console.log(`ðŸ§© generate_all enabled: attempting homologated SKUs for associated codes...`);
            const candidates = new Set([...(Array.isArray(oemClean) ? oemClean : []), ...(Array.isArray(crossClean) ? crossClean : [])]);
            // Remove primary OEM and the input query to avoid duplicates
            candidates.delete(scraperResult.code);
            candidates.delete(query);

            for (const cand of candidates) {
                const cQuery = normalize.code(cand);
                if (!cQuery || cQuery.length < 3) continue;
                try {
                    const sr = await scraperBridge(cQuery, duty);
                    if (!sr || !sr.last4) {
                        console.log(`â†ªï¸  Skipping ${cQuery}: not validated by scrapers`);
                        continue;
                    }
                    const srcUp = String(sr.source || '').toUpperCase();
                    const homologOk = (duty === 'HD' && srcUp === 'DONALDSON') || (duty === 'LD' && srcUp === 'FRAM');
                    if (!homologOk) {
                        console.log(`â†ªï¸  Skipping ${cQuery}: source ${srcUp} not homologated for duty ${duty}`);
                        continue;
                    }

                    // Determine family for the candidate; fallback to primary family
                    let famCand = null;
                    const cUpper = cQuery.toUpperCase();
                    if (/^CA/.test(cUpper)) {
                        famCand = 'AIRE';
                    } else if (/^(CF|CH)/.test(cUpper)) {
                        famCand = 'CABIN';
                    } else if (/^(PH|TG|XG|HM)/.test(cUpper)) {
                        famCand = 'OIL';
                    } else if (/^(G|PS)/.test(cUpper)) {
                        famCand = 'FUEL';
                    } else {
                        famCand = duty === 'HD' ? detectFamilyHD(sr.family) : detectFamilyLD(sr.family);
                    }
                    if (!famCand) famCand = family;

                    let skuCand;
                    const upCand = cUpper;
                    if (String(famCand).toUpperCase() === 'TURBINE SERIES') {
                        if (/^\d{3,5}(MA|FH)\b/.test(upCand)) {
                            skuCand = generateET9SystemSKU(sr.code);
                        } else if (/^(2010|2020|2040)/.test(upCand)) {
                            skuCand = generateET9FElementSKU(sr.code);
                        } else {
                            skuCand = generateSKU(famCand, duty, sr.last4);
                        }
                    } else if (/^R(12|15|20|25|45|60|90|120)(T|S)$/i.test(sr.code || '')) {
                        skuCand = generateEM9SSeparatorSKU(sr.code);
                        famCand = 'MARINE';
                    } else if (String(famCand).toUpperCase() === 'MARINE') {
                        const baseFamCand = ['OIL','FUEL','AIRE'].includes(String(sr.family || '').toUpperCase()) ? String(sr.family || '').toUpperCase() : 'FUEL';
                        const l4alCand = sr.last4_alnum || extract4Alnum(sr.code || '') || sr.last4;
                        skuCand = generateEM9SubtypeSKU(baseFamCand, l4alCand);
                    } else {
                        skuCand = generateSKU(famCand, duty, sr.last4);
                    }
                    if (!skuCand || skuCand.error) {
                        console.log(`â†ªï¸  Skipping ${cQuery}: SKU generation error`);
                        continue;
                    }

                    let specsCand;
                    try {
                        const srcUp = String(sr.source || '').toUpperCase();
                        if (srcUp === 'DONALDSON') {
                            specsCand = await extractDonaldsonSpecs(sr.code);
                        } else if (srcUp === 'FRAM') {
                            specsCand = await extractFramSpecs(sr.code);
                        } else if (srcUp === 'PARKER') {
                            specsCand = await extractParkerSpecs(sr.code);
                        } else if (srcUp === 'MERCRUISER') {
                            specsCand = await extractMercurySpecs(sr.code);
                        } else if (srcUp === 'SIERRA') {
                            specsCand = await extractSierraSpecs(sr.code);
                        } else {
                            specsCand = getDefaultSpecs(sr.code, sr.source);
                        }
                    } catch (_) {
                        specsCand = getDefaultSpecs(sr.code, sr.source);
                    }
                    const oemCand = cleanOEMList(sr.attributes?.oem_numbers || sr.oem || [], duty);
                    const crossCand = cleanCrossList(sr.cross || [], duty, sr.code, sr.source);

                    const masterDataCand = {
                        query_normalized: cQuery,
                        code_input: cQuery,
                        code_oem: sr.code,
                        oem_codes: oemCand,
                        duty,
                        family: famCand,
                        sku: skuCand,
                        media: getMedia(famCand, duty),
                        filter_type: famCand,
                        source: sr.source,
                        cross_reference: crossCand,
                        applications: ensureMinApps(preferBrandModelFormat(consolidateApps(cleanAppsList(specsCand?.engine_applications || [], duty))), duty, 'engine'),
                        equipment_applications: ensureMinApps(preferBrandModelFormat(consolidateApps(cleanAppsList(specsCand?.equipment_applications || [], duty))), duty, 'equipment'),
                        attributes: {
                            ...sr.attributes,
                            height_mm: specsCand?.dimensions?.height_mm,
                            outer_diameter_mm: specsCand?.dimensions?.outer_diameter_mm,
                            thread_size: specsCand?.dimensions?.thread_size,
                            gasket_od_mm: specsCand?.dimensions?.gasket_od_mm,
                            iso_main_efficiency_percent: specsCand?.performance?.iso_main_efficiency_percent,
                            iso_test_method: specsCand?.performance?.iso_test_method,
                            micron_rating: specsCand?.performance?.micron_rating,
                            flow_gph: specsCand?.performance?.flow_gph,
                            flow_lph: specsCand?.performance?.flow_lph,
                            manufacturing_standards: duty === 'HD' ? 'ISO 9001, ISO/TS 16949' : 'ISO 9001',
                            certification_standards: duty === 'HD' ? 'ISO 5011, ISO 4548-12' : 'SAE J806',
                            service_life_hours: '500',
                            manufactured_by: 'ELIMFILTERS'
                        },
                        last4: sr.last4,
                        oem_equivalent: sr.code
                    };

                    try {
                        await upsertBySku(masterDataCand, { deleteDuplicates: true });
                        console.log(`âœ… Upserted associated homologated SKU: ${skuCand} for ${cQuery}`);
                        generatedAllSummary.push({ code: cQuery, sku: skuCand, source: sr.source, forced: false, upsert_status: 'SAVED' });
                    } catch (errUp) {
                        console.log(`âš ï¸  Failed upsert for ${cQuery}: ${errUp.message}`);
                        generatedAllSummary.push({ code: cQuery, sku: skuCand, source: sr.source, forced: false, upsert_status: 'UPSERT_FAILED', error: errUp.message });
                    }
                } catch (err) {
                    console.log(`âš ï¸  Error processing ${cQuery}: ${err.message}`);
                }
            }
        }

        // ---------------------------------------------------------------------
        // PASO 5: RETORNAR INFORMACIÃ“N COMPLETA A WORDPRESS
        // ---------------------------------------------------------------------
        console.log(`âœ… Step 5: Returning complete information to WordPress`);
        
        const oemList = oemClean;
        const primaryOEM = Array.isArray(oemList) && oemList.length ? oemList[0] : '';
        const attributesClean = { ...(scraperResult.attributes || {}) };
        if (attributesClean.media_type) delete attributesClean.media_type;
        // Mezclar especificaciones seleccionadas dentro de attributes para la respuesta
        const specAttrs = {
            height_mm: specs?.dimensions?.height_mm,
            outer_diameter_mm: specs?.dimensions?.outer_diameter_mm,
            inner_diameter_mm: specs?.dimensions?.inner_diameter_mm,
            thread_size: specs?.dimensions?.thread_size,
            gasket_od_mm: specs?.dimensions?.gasket_od_mm,
            iso_main_efficiency_percent: specs?.performance?.iso_main_efficiency_percent,
            iso_test_method: specs?.performance?.iso_test_method,
            micron_rating: specs?.performance?.micron_rating,
            flow_gph: specs?.performance?.flow_gph,
            flow_lph: specs?.performance?.flow_lph,
            manufacturing_standards: specs?.technical_details?.manufacturing_standards,
            certification_standards: specs?.technical_details?.certification_standards,
            operating_temperature_min_c: specs?.technical_details?.operating_temperature_min_c,
            operating_temperature_max_c: specs?.technical_details?.operating_temperature_max_c,
            fluid_compatibility: specs?.technical_details?.fluid_compatibility,
            disposal_method: specs?.technical_details?.disposal_method,
            service_life_hours: specs?.technical_details?.service_life_hours,
            pleat_count: specs?.technical_details?.pleat_count,
            seal_material: specs?.technical_details?.seal_material,
            housing_material: specs?.technical_details?.housing_material,
            manufactured_by: 'ELIMFILTERS'
        };
        const attributesMerged = { ...(scraperResult.attributes || {}), ...specAttrs };

        // Ocultar campos funcionales no primarios en visualización del cliente
        try {
            const hideNonPrimary = String(process.env.HIDE_NONPRIMARY_FIELDS || 'true').toLowerCase() === 'true';
            if (hideNonPrimary) {
                const famUp = String(family || '').toUpperCase();
                const typeUp = String(specs?.type || scraperResult?.type || '').toUpperCase();
                const isAir = famUp === 'AIRE' || /AIR/.test(typeUp);
                const isCabin = famUp === 'CABIN' || /CABIN/.test(typeUp);
                const isFuel = famUp === 'FUEL' || /FUEL/.test(typeUp);
                // Regla: WSE solo aplica si FUEL; ocultar en otras familias
                if (!isFuel) {
                    delete attributesMerged.water_separation_efficiency_percent;
                }
                // Regla: ISO efficiency/method no aplican a Air/Cabin
                if (isAir || isCabin) {
                    delete attributesMerged.iso_main_efficiency_percent;
                    delete attributesMerged.iso_test_method;
                    // Ocultar flujos no aplicables en Air/Cabin
                    delete attributesMerged.flow_gph;
                    delete attributesMerged.flow_lph;
                }
            }
        } catch (_) {}

        const response = {
            status: 'OK',
            forced: false,
            found_in_master: false,
            newly_generated: true,
            query_normalized: query,
            code_input: query,
            code_oem: primaryOEM,
            oem_codes: oemList,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            source: scraperResult.source,
            // Ocultar marcas: exponer solo el cÃ³digo homologado (OEM cuando disponible)
            oem_homologated: {
                code: primaryOEM || ''
            },
            cross_reference: crossClean,
            applications: engineFinal,
            engine_applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: attributesMerged,
            message: 'SKU ELIMFILTERS generado y guardado en catÃ¡logo Master',
            generated_all: generatedAllSummary
        };

        console.log(`ðŸŽ‰ Detection complete: ${sku}`);
        return response;

    } catch (error) {
        console.error('âŒ Detection service error:', error);
        throw error;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    detectFilter
};

