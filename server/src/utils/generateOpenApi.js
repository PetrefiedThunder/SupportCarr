const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../../openapi.yaml');
const targetDir = path.join(__dirname, '../../../docs');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
}

fs.copyFileSync(source, path.join(targetDir, 'openapi.yaml'));
console.log('OpenAPI spec copied to docs/openapi.yaml');
