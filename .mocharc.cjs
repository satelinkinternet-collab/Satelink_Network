'use strict';
// Load .env before any test modules are imported
// This ensures JWT_SECRET etc. are available when auth.js validates at module load time
require('dotenv').config();

module.exports = {
  timeout: 15000,
  file: [],
};
