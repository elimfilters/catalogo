// src/config/stagehandConfig.js
const { google } = require('@ai-sdk/google');

module.exports = {
  llm: google('gemini-2.0-flash'),
  apiKey: process.env.GOOGLE_API_KEY
};
