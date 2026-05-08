import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnv)) {
  let content = fs.readFileSync(rootEnv, 'utf-8');
  content = content.replace(/DATABASE_URL=.*/, '# DATABASE_URL commented out');
  fs.writeFileSync(rootEnv, content);
  console.log('Commented out DATABASE_URL in root .env');
}
