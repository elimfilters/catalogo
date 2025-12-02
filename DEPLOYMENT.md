╔══════════════════════════════════════════════════════════════╗
║  ELIMFILTERS API v5.0.0 - DEPLOYMENT INSTRUCTIONS            ║
╚══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
📋 PRE-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════

[ ] Node.js 18+ installed locally
[ ] Railway account created
[ ] GitHub repository created
[ ] Environment variables prepared
[ ] Si el PR modifica datos (`src/data/oem_xref.json`), ejecutar `npm run validate:oem:candidate` y asegurar cero errores (OBLIGATORIO)
[ ] Google Sheets credentials (optional)

═══════════════════════════════════════════════════════════════
🚀 OPTION 1: DEPLOY TO RAILWAY (RECOMMENDED)
═══════════════════════════════════════════════════════════════

STEP 1: Push to GitHub
─────────────────────────

cd elimfilters-api
git init
git add .
git commit -m "Initial commit - v5.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/elimfilters-api.git
git push -u origin main

STEP 2: Connect Railway
─────────────────────────

1. Go to https://railway.app/
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose "elimfilters-api" repository
5. Railway will auto-detect Dockerfile

STEP 3: Configure Environment Variables
─────────────────────────────────────────

In Railway Dashboard → Variables, add:

Required:
PORT=8080
NODE_ENV=production

Optional (if using Google Sheets):
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_CREDENTIALS={"type":"service_account",...}

STEP 4: Deploy
──────────────

Railway auto-deploys on git push.
First deployment takes 2-3 minutes.

STEP 5: Verify Deployment
──────────────────────────

curl https://your-app.railway.app/health

Expected response:
{
  "status": "OK",
  "version": "5.0.0",
  "uptime": 123.45,
  "timestamp": "2024-11-27T..."
}

STEP 6: Test API
────────────────

# Test filter detection
curl https://your-app.railway.app/api/detect/P552100

# Test search
curl https://your-app.railway.app/api/detect/search?q=P552100

═══════════════════════════════════════════════════════════════
🐳 OPTION 2: LOCAL DOCKER DEPLOYMENT
═══════════════════════════════════════════════════════════════

STEP 1: Build Docker Image
───────────────────────────

docker build -t elimfilters-api:5.0.0 .

STEP 2: Run Container
─────────────────────

docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  --name elimfilters-api \
  elimfilters-api:5.0.0

STEP 3: Check Logs
──────────────────

docker logs -f elimfilters-api

STEP 4: Test
────────────

curl http://localhost:8080/health

═══════════════════════════════════════════════════════════════
💻 OPTION 3: LOCAL DEVELOPMENT
═══════════════════════════════════════════════════════════════

STEP 1: Install Dependencies
─────────────────────────────

npm install

STEP 2: Create Environment File
────────────────────────────────

cp .env.example .env
# Edit .env with your configuration

STEP 3: Start Development Server
─────────────────────────────────

npm run dev

Server runs on http://localhost:8080

═══════════════════════════════════════════════════════════════
🔧 POST-DEPLOYMENT CONFIGURATION
═══════════════════════════════════════════════════════════════

WordPress Integration
─────────────────────

1. Update WordPress plugin API URL:
   Settings → ELIMFILTERS Search → API URL
   https://your-app.railway.app

2. Test connection in WordPress admin panel

Google Sheets Integration
─────────────────────────

1. Create service account in Google Cloud Console
2. Share Google Sheet with service account email
3. Add credentials to Railway environment variables

Custom Domain (Optional)
────────────────────────

1. Railway Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

═══════════════════════════════════════════════════════════════
📊 MONITORING & MAINTENANCE
═══════════════════════════════════════════════════════════════

Health Check
────────────
GET https://your-app.railway.app/health
Status: 200 OK

Logs
────
Railway Dashboard → Deployments → View Logs

Metrics
───────
Railway Dashboard → Metrics
- CPU usage
- Memory usage
- Response times

Updates
───────
git add .
git commit -m "Description of changes"
git push origin main
# Railway auto-deploys

Rollback
────────
Railway Dashboard → Deployments → Redeploy previous version

═══════════════════════════════════════════════════════════════
🩹 SELF‑HEALING CRON (Railway)
═══════════════════════════════════════════════════════════════

Overview
────────
- The self‑healing job processes `src/data/errorLog.json`, groups failures by `family_inference_signals` (prefix), and injects deterministic rules into `src/config/skuRules.json` when a pattern exceeds a threshold.
- Script entrypoint: `node src/services/self_heal_rules.js` (also available as `npm run self-heal:rules`).

Setup (Recommended: separate service)
─────────────────────────────────────
1. In your Railway project, create a new Service named `self-heal-cron`.
2. Set Start Command to `node src/services/self_heal_rules.js`.
3. In Service → Settings → Cron Schedule, set a schedule (UTC): `0 */6 * * *` (every 6 hours, 4×/day).
4. In Variables, set `SELF_HEAL_THRESHOLD=3` durante la fase de aceleración inicial.
4. Ensure the service exits after completion; the script terminates on its own.

Environment
───────────
- Optional: `SELF_HEAL_THRESHOLD` to control minimum repeated failures before injecting a rule (default: `5`).
- Optional: `SELF_HEAL_WEBHOOK_URL` para notificaciones automáticas en Slack/Teams.
- Optional: `SELF_HEAL_STABILIZATION_HOURS` (default: `48`) ventana reciente para monitoreo.
- Optional: `SELF_HEAL_REDUCTION_TARGET` (default: `0.8`) reducción objetivo (80%).
- Optional: `SELF_HEAL_MIN_PREV_COUNT` (default: `30`) volumen mínimo de la ventana previa para evaluar estabilización.

Logs & Safety
─────────────
- Check deployment logs to see lines like `↪️` for under‑threshold and `➕` when a rule is learned.
- The script writes to `src/config/skuRules.json` only when confidence ≥ 0.8 and count ≥ threshold.
- Learned rules are placed under `learnedPrefixes` and are consulted by OEM prefix resolution.

Monitoring & Notification (Threshold Transition)
────────────────────────────────────────────────
- El cron evalúa la densidad de fallos comparando dos ventanas adyacentes: `t-96h → t-48h` vs `t-48h → t`.
- Si la ventana reciente muestra una reducción ≥80% respecto a la previa y la previa tiene al menos `SELF_HEAL_MIN_PREV_COUNT` fallos, se envía un POST a `SELF_HEAL_WEBHOOK_URL`.
- Payload: `{ text, lastWindow, prevWindow }`, compatible con Slack Incoming Webhooks y Teams Connectors.
- Mensaje: "🚨 AVISO DE ESTABILIZACIÓN DEL CATÁLOGO. La densidad de fallos ha caído. ACCIÓN REQUERIDA: Favor de establecer SELF_HEAL_THRESHOLD de 3 a 5 para asegurar la precisión y robustez a largo plazo."

═══════════════════════════════════════════════════════════════
🆘 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

Issue: Health check fails
Solution: Check Railway logs for errors
         Verify PORT environment variable is 8080

Issue: Scrapers timeout
Solution: Increase SCRAPER_TIMEOUT env variable
         Check internet connectivity from Railway

Issue: SKU generation fails
Solution: Verify src/config/skuRules.json is present
         Check logs for specific error messages

Issue: Build fails on Railway
Solution: Verify Dockerfile is in root directory
         Check package.json dependencies are correct
         Review Railway build logs

═══════════════════════════════════════════════════════════════
🛡️ BACKUPS EN RAILWAY
═══════════════════════════════════════════════════════════════

1) PostgreSQL (Servicio con Volumen Persistente)
- Railway ofrece pestaña de "Backups" en el servicio de base de datos.
- Configura Frecuencia y Retención:
  - Diaria: guarda 6 días
  - Semanal: guarda 1 mes
  - Mensual: guarda 3 meses
- Restauración: desde la misma pestaña, selecciona por timestamp y pulsa "Restore".
  - Crea un nuevo volumen con el estado anterior (el volumen original queda sin montar).

2) MongoDB (Servicio externo o sin volumen)
- Añade un servicio Cron en Railway que ejecute el script de backup del repo:
  - Comando: `node scripts/backup_mongo_to_s3.js`
  - Variables de entorno necesarias:
    - `MONGODB_URI`
    - `S3_BUCKET`, `S3_REGION`
    - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
    - Opcional: `S3_PREFIX`, `BACKUP_DB_NAME`
  - Programa el Cron con `RAILWAY_CRON_SCHEDULE`, por ejemplo: `0 3 * * *` (03:00 UTC diario).

Salida del backup
- El script crea `tmp_backup/<db>_<timestamp>/` con JSONL por colección y un archivo `tar.gz` subido a S3.
- Los directorios `tmp_backup/` y `backups/` están ignorados en `.gitignore`.

Verificación
- Revisa S3 para el objeto: `s3://<bucket>/<prefix>/<db>/<db>_<timestamp>.tar.gz`.
- Activa alertas en S3/lifecycle si deseas retención automática.

Restore desde S3 (MongoDB)
- Variables de entorno:
  - `MONGODB_URI`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  - Opcional: `S3_PREFIX`, `BACKUP_DB_NAME`, `S3_OBJECT_KEY`, `CLEAR_BEFORE_RESTORE`
- Ejecutar localmente:
  - `npm run restore:mongo`
- En Railway (servicio Cron de restore bajo demanda):
  - Start Command: `node scripts/restore_mongo_from_s3.js`
  - Opcional: definir `S3_OBJECT_KEY` para un archivo específico; si no, se tomará el último.
  - Para entorno productivo, recomiendo no automatizar el restore; úsalo manualmente con aprobaciones.


═══════════════════════════════════════════════════════════════
📞 SUPPORT
═══════════════════════════════════════════════════════════════

Technical Issues:
- Check logs first
- Review error messages
- Contact ELIMFILTERS support

Railway Support:
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app

═══════════════════════════════════════════════════════════════

Version: 5.0.0
Date: 2024-11-27
Architecture: Modular, Production-Ready
Status: ✅ Ready for Deployment
Automatic Webhook Self‑Test (No Manual Steps)
────────────────────────────────────────────
Para eliminar la necesidad de ejecutar comandos manuales, el sistema puede realizar una auto‑prueba del webhook inmediatamente al arrancar el servicio.

Configurar en variables de entorno:
- `DAILY_REPORT_WEBHOOK_URL` → URL completa del webhook (Slack/Teams).
- `AUTO_SELF_TEST_ON_START=true` → habilita la auto‑prueba al inicio.
- `REPORT_HOURS=24` → ventana del informe inicial.
- Opcional: `SELF_TEST_START_DELAY_MS=3000` para retrasar la auto‑prueba 3s tras el arranque.

Qué esperar en logs y canal:
- Log del contenedor: `⏱️ Auto‑prueba del webhook programada...` y luego `🔔 Reporte diario enviado al webhook. HTTP 200` (o 204).
- Canal Slack/Teams: encabezado inicial `📣 Reporte Diario de Auto‑Curación` con campos `prevWindow` y `lastWindow` visibles.
- Cuando el sistema sea elegible para estabilización, el encabezado cambia a `🚨 ACCIÓN REQUERIDA: ESTABILIZACIÓN DEL APRENDIZAJE CRON 📈` y el mensaje sugiere `Cambiar SELF_HEAL_THRESHOLD a 5`.

Troubleshooting rápido:
- `400/403`: verifique que `DAILY_REPORT_WEBHOOK_URL` esté completo y sin espacios, y que el payload no haya sido bloqueado por políticas del canal.
- Sin mensaje en el canal pero HTTP 200/204: revise que el conector acepte `blocks` (Slack) o texto plano; el script detecta Slack automáticamente.
- Sin log de auto‑prueba: confirme `AUTO_SELF_TEST_ON_START=true` y que el servicio arrancó correctamente.
