// Single source of every filesystem path the server uses (so the working directory never matters).
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC = path.join(APP_ROOT, 'public');
const DOCS = path.join(APP_ROOT, '..', 'docs');
const SHARED = path.join(APP_ROOT, 'src', 'shared');

module.exports = { APP_ROOT, PUBLIC, DOCS, SHARED };
