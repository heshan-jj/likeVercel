import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '.env');
const backendEnv = path.resolve(process.cwd(), 'backend/.env');

if (fs.existsSync(rootEnv)) {
  let content = fs.readFileSync(rootEnv, 'utf-8');
  content = content.replace(/DATABASE_URL=.*/, 'DATABASE_URL=file:./backend/prisma/dev.db');
  fs.writeFileSync(rootEnv, content);
}

if (fs.existsSync(backendEnv)) {
  let content = fs.readFileSync(backendEnv, 'utf-8');
  content = content.replace(/DATABASE_URL=.*/, 'DATABASE_URL=file:./dev.db');
  fs.writeFileSync(backendEnv, content);
}
