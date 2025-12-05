# Estrategia de fallback basada en datos reales (Stagehand)

Objetivo: definir cómo poblar `equipment_applications` cuando la fuente principal (p. ej., FRAM LD) no provee aplicaciones, sin inventar datos.

## Principios
- "Cero Invención": no añadir aplicaciones sin correspondencia verificable (marca+modelo o motor concreto).
- Origen trazable: indicar `source` de cada aplicación (p. ej., FRAM catálogos, OEM catálogos, public datasets).
- Granularidad mínima: marca+modelo o familia de motor, sin años si no están confirmados.

## Fuentes candidatas
- `repo/data/fram_oem_map.json`: relaciones FRAM↔OEM (validar y enriquecer a marca/modelo).
- Catálogos OEM públicos (Caterpillar, Cummins, etc.) con referencias cruzadas.
- Documentación Donaldson (cuando disponible) para aplicaciones genéricas HD/LD.

## Implementación progresiva
1. Resolver FRAM↔OEM y mapear a aplicaciones por marca/modelo cuando exista relación directa documentada.
2. Añadir scraper secundario para páginas públicas FRAM que enumeren aplicaciones (cuando existan).
3. Registrar errores y tasas de éxito por código (telemetría JSONL) y ajustar prioridades.

## Validación
- Comparar contra muestras auditadas (scripts en `repo/scripts`) y revisar `VOL_LOW`.
- Mantener modo relajado sin padding; fallback sólo añade entradas verificables.

## Plan de decisión
- Monitorear durante 1–2 semanas con `aggregate_empty_apps.js`.
- Identificar top 50 códigos vacíos por fuente FRAM.
- Implementar fallback FRAM↔OEM para esos códigos primero.