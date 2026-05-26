const fs = require('fs');

['frontend/src/services/devicesApi.ts', 'frontend/src/services/referencesApi.ts', 'frontend/src/services/statsApi.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ buildApiUrl \} from '\.\.\/config\/api'/g, "import { buildApiUrl, apiFetch } from '../config/api'");
  content = content.replace(/await fetch\(/g, "await apiFetch(");
  fs.writeFileSync(file, content);
});
