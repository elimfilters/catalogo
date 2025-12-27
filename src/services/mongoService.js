// ============================================================================
// MONGODB SERVICE v9.1 - CACHE BUFFER PARA 1000+ BÚSQUEDAS CONCURRENTES
// ============================================================================

const mongoose = require('mongoose');

// ============================================================================
// SCHEMA CON VALIDACIÓN ESTRICTA v7.0.0
// ============================================================================
const filterSchema = new mongoose.Schema({
  // Columna A: SKU ELIMFILTERS
  A_SKU: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        // Validar que el prefijo coincida con F_type
        const prefix = v.substring(0, 3);
        const validPrefixes = {
          'OIL': ['EL8'],
          'FUEL': ['EF9'],
          'AIR': ['EA1'],
          'SEPARATOR': ['ES9'],
          'HYDRAULIC': ['EH6'],
          'AIR_DRYER': ['ED4'],
          'CABIN': ['EC1'],
          'COOLANT': ['EW7'],
          'MARINE': ['EM9'],
          'TURBINE': ['ET9'],
          'AIR_HOUSING': ['EA2'],
          'KIT': ['EK5', 'EK3']
        };
        
        if (!this.F_type) return false;
        const allowedPrefixes = validPrefixes[this.F_type] || [];
        return allowedPrefixes.includes(prefix);
      },
      message: 'SKU prefix must match F_type according to v7.0.0 decision table'
    }
  },
  
  // Columna B: Código solicitado (query original)
  B_codigo_solicitado: {
    type: String,
    required: true,
    index: true
  },
  
  // Columna C: Norma (Donaldson o FRAM)
  C_norm: {
    type: String,
    required: true,
    index: true
  },
  
  // Columna D: Duty Type
  D_duty_type: {
    type: String,
    required: true,
    enum: ['HD', 'LD'],
    index: true
  },
  
  // Columna E: Subtype
  E_subtype: {
    type: String,
    default: 'STANDARD',
    enum: ['STANDARD', 'SYNTHETIC', 'PREMIUM']
  },
  
  // Columna F: Type (categoría técnica)
  F_type: {
    type: String,
    required: true,
    enum: ['OIL', 'FUEL', 'AIR', 'CABIN', 'HYDRAULIC', 'TRANSMISSION', 
           'COOLANT', 'SEPARATOR', 'AIR_DRYER', 'MARINE', 'TURBINE', 'AIR_HOUSING', 'KIT'],
    index: true
  },
  
  // Columna G: Descripción ELIMFILTERS
  G_description: {
    type: String,
    required: true
  },
  
  // Columnas H-Z: Especificaciones técnicas
  H_oem_codes: String,
  I_cross_reference: [String],
  J_media_type: String,
  K_equipment_applications: String,
  L_engine_applications: String,
  M_height_mm: Number,
  N_outer_diameter_mm: Number,
  O_inner_diameter_mm: Number,
  P_thread_size: String,
  Q_micron_rating: String,
  R_product_url: String,
  S_imagen_url: String,
  T_breadcrumb: String,
  U_manufacturer: {
    type: String,
    enum: ['DONALDSON', 'FRAM', 'FLEETGUARD', 'RACOR', 'PARKER']
  },
  V_source: {
    type: String,
    enum: ['DONALDSON_STAGEHAND_AI', 'FRAM_STAGEHAND_AI', 'FLEETGUARD_STAGEHAND_AI']
  },
  
  // Metadata
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  cache_hits: {
    type: Number,
    default: 0
  }
}, {
  collection: 'elimfilters_catalog',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices compuestos para búsquedas rápidas
filterSchema.index({ B_codigo_solicitado: 1, D_duty_type: 1 });
filterSchema.index({ C_norm: 1 });
filterSchema.index({ F_type: 1, D_duty_type: 1 });

const FilterModel = mongoose.model('Filter', filterSchema);

// ============================================================================
// CONEXIÓN A MONGODB
// ============================================================================
let isConnected = false;

async function connectMongo() {
  if (isConnected) {
    console.log('[MONGO] ✅ Ya conectado');
    return;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      console.log('[MONGO] ⚠️ MONGODB_URI no configurada - cache deshabilitado');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('[MONGO] ✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('[MONGO] ❌ Error de conexión:', error.message);
  }
}

// ============================================================================
// FUNCIONES DE CACHE (v9.1)
// ============================================================================

async function findByCode(code) {
  if (!isConnected) {
    console.log('[MONGO] ⚠️ No conectado - skip cache');
    return null;
  }
  
  try {
    const normalized = String(code).trim().toUpperCase();
    console.log(`[MONGO] 🔍 Buscando: ${normalized}`);
    
    const filter = await FilterModel.findOneAndUpdate(
      {
        $or: [
          { B_codigo_solicitado: normalized },
          { C_norm: normalized }
        ]
      },
      { 
        $inc: { cache_hits: 1 },
        $set: { updated_at: new Date() }
      },
      { new: true }
    ).lean();
    
    if (filter) {
      console.log(`[MONGO] ✅ Cache HIT: ${filter.A_SKU} (hits: ${filter.cache_hits})`);
      return filter;
    }
    
    console.log(`[MONGO] ℹ️ Cache MISS: ${normalized}`);
    return null;
    
  } catch (error) {
    console.error('[MONGO] ❌ Error en findByCode:', error.message);
    return null;
  }
}

async function saveFilter(filterData) {
  if (!isConnected) {
    console.log('[MONGO] ⚠️ No conectado - skip save');
    return null;
  }
  
  try {
    console.log(`[MONGO] 💾 Guardando: ${filterData.A_SKU || filterData.sku}`);
    
    if (!filterData.A_SKU && !filterData.sku) {
      console.error('[MONGO] ❌ Falta SKU');
      return null;
    }
    
    if (!filterData.F_type && !filterData.type) {
      console.error('[MONGO] ❌ Falta Type');
      return null;
    }
    
    // Mapear datos a schema MongoDB
    const mongoData = {
      A_SKU: filterData.A_SKU || filterData.sku,
      B_codigo_solicitado: filterData.B_codigo_solicitado || filterData.query,
      C_norm: filterData.C_norm || filterData.norm,
      D_duty_type: filterData.D_duty_type || filterData.duty_type,
      E_subtype: filterData.E_subtype || filterData.subtype || 'STANDARD',
      F_type: filterData.F_type || filterData.type,
      G_description: filterData.G_description || filterData.description,
      H_oem_codes: filterData.H_oem_codes || filterData.oem_codes,
      I_cross_reference: filterData.I_cross_reference || filterData.cross_reference,
      J_media_type: filterData.J_media_type || filterData.media_type,
      K_equipment_applications: filterData.K_equipment_applications || filterData.equipment_applications,
      L_engine_applications: filterData.L_engine_applications || filterData.engine_applications,
      M_height_mm: filterData.M_height_mm || filterData.height_mm,
      N_outer_diameter_mm: filterData.N_outer_diameter_mm || filterData.outer_diameter_mm,
      O_inner_diameter_mm: filterData.O_inner_diameter_mm || filterData.inner_diameter_mm,
      P_thread_size: filterData.P_thread_size || filterData.thread_size,
      Q_micron_rating: filterData.Q_micron_rating || filterData.micron_rating,
      R_product_url: filterData.R_product_url || filterData.product_url,
      S_imagen_url: filterData.S_imagen_url || filterData.imagen_url,
      T_breadcrumb: filterData.T_breadcrumb || filterData.breadcrumb,
      U_manufacturer: filterData.U_manufacturer || filterData.manufacturer,
      V_source: filterData.V_source || filterData.source
    };
    
    const filter = await FilterModel.findOneAndUpdate(
      { A_SKU: mongoData.A_SKU },
      mongoData,
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );
    
    console.log(`[MONGO] ✅ Guardado: ${filter.A_SKU}`);
    return filter;
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('[MONGO] ❌ Error de validación:', error.message);
    } else {
      console.error('[MONGO] ❌ Error en saveFilter:', error.message);
    }
    return null;
  }
}

async function findBySKU(sku) {
  if (!isConnected) return null;
  
  try {
    const filter = await FilterModel.findOneAndUpdate(
      { A_SKU: sku },
      { 
        $inc: { cache_hits: 1 },
        $set: { updated_at: new Date() }
      },
      { new: true }
    ).lean();
    
    if (filter) {
      console.log(`[MONGO] ✅ Cache HIT por SKU: ${sku}`);
    }
    
    return filter;
  } catch (error) {
    console.error('[MONGO] ❌ Error en findBySKU:', error.message);
    return null;
  }
}

async function getCacheStats() {
  if (!isConnected) return null;
  
  try {
    const stats = await FilterModel.aggregate([
      {
        $group: {
          _id: null,
          total_filters: { $sum: 1 },
          total_hits: { $sum: '$cache_hits' },
          avg_hits: { $avg: '$cache_hits' }
        }
      }
    ]);
    
    return stats[0] || { total_filters: 0, total_hits: 0, avg_hits: 0 };
  } catch (error) {
    console.error('[MONGO] ❌ Error en getCacheStats:', error.message);
    return null;
  }
}

module.exports = {
  connectMongo,
  findByCode,
  saveFilter,
  findBySKU,
  getCacheStats,
  FilterModel
};
