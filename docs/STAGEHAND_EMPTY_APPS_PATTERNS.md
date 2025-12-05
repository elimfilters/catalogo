# Patrones observados: equipment_applications vacío (Stagehand)

Este documento recoge casos y patrones donde `equipment_applications` queda vacío durante detección en modo relajado (Stagehand), para orientar mejoras del scraper y estrategias de fallback.

## Resumen actual
- Fuentes LD (FRAM) suelen validar códigos y familia/duty pero no siempre aportan aplicaciones de equipo.
- En OIL PH-series (ej. `PH3614`), FRAM confirma el código pero sin listas de aplicaciones; el fallback Donaldson para specs puede fallar (HTTP 500) y no rellena aplicaciones.
- Política inviolable y filtro "Cero Invención" evitan padding genérico; por diseño, columnas J/K quedan vacías si no hay datos confiables.

## Casos ejemplares
- `PH3614` → `duty=LD` `family=OIL` `source=FRAM` `equipment_applications=[]` (vacío).
  - Donaldson specs fallback: errores 500.
  - Resultado: respuesta 200 con `?stagehand=1` y columnas J/K vacías.

## Causas comunes
1. Fuente principal no provee aplicaciones (FRAM LD).
2. Fallback técnico falla o no incluye aplicaciones específicas.
3. Filtrado por política (Zero Invención) descarta genéricos y contradicciones.

## Telemetría y monitoreo
- Archivo JSONL: `reports/empty_equipment_applications.jsonl`.
- Script de agregación: `node repo/scripts/aggregate_empty_apps.js`.
  - Muestra top códigos, desglose por fuente y duty.

## Próximos pasos propuestos
1. Ampliar el scraper FRAM/LD para intentar fuentes secundarias confiables (FRAM publicaciones públicas, catálogos OEM vinculados) y mapear a aplicaciones.
2. Añadir fallback basado en datos reales (p. ej., `fram_oem_map.json`) sólo cuando exista una relación verificable (marca+modelo) y sin inventar años.
3. Registrar errores de fallbacks (HTTP 5xx) para priorizar correcciones por dominio/fuente.

## Criterios de aceptación
- Mantener `equipment_applications` vacío si no hay datos verificables.
- Rellenar sólo con equivalencias reales verificadas; nunca con padding genérico en Stagehand.