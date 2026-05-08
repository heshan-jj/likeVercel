import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'backend/prisma/dev.db').replace(/\\/g, '/');
const rootEnv = path.resolve(process.cwd(), '.env');
const backendEnv = path.resolve(process.cwd(), 'backend/.env');

if (fs.existsSync(rootEnv)) {
  let content = fs.readFileSync(rootEnv, 'utf-8');
  content = content.replace(/DATABASE_URL=.*/, `DATABASE_URL="file:${dbPath}"`);
  fs.writeFileSync(rootEnv, content);
  console.log('Updated root .env with absolute path');
}

if (fs.existsSync(backendEnv)) {
  let content = fs.readFileSync(backendEnv, 'utf-8');
  content = content.replace(/DATABASE_URL=.*/, `DATABASE_URL="file:${dbPath}"`);
  fs.writeFileSync(backendEnv, content);
  console.log('Updated backend .env with absolute path');
}
