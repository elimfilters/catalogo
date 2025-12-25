async connect() {
  if (!this.enabled || this.connected) return;

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.warn('⚠️ MongoDB URI not defined. Repository disabled.');
    this.enabled = false;
    return;
  }

  try {
    this.client = new MongoClient(uri);
    await this.client.connect();
    
    // Extraer nombre de BD de la URI o usar default
    const dbName = uri.match(/\.net\/([^?]+)/)?.[1] || 'elimfilters';
    this.db = this.client.db(dbName);
