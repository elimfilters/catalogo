// ============================================
// ELIMFILTERS API v6.0.4 GEMINI EDITION
// Direct HTTP to Gemini v1beta (gemini-1.5-flash-latest)
// ============================================

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// CONFIGURACIÓN
// ============================================

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
const DB_NAME = 'elimfilters';
const COLLECTION_NAME = 'filters';

// Google Sheets Configuration
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1LpP3y8cn85CQl7I23QL6m-V70kn0WRy6_ld0IG1g6oY';
const SHEET_NAME = 'Master50';

// Gemini AI Configuration (Direct API v1beta with HTTP control)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
let geminiConfigured = false;
