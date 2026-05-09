import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '.env');
const backendEnv = path.resolve(process.cwd(), 'backend/.env');

const updateEnv = (filePath: string, key: string, value: string | null) => {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp(`${key}=.*`);
  
  if (value === null) {
    content = content.replace(regex, `# ${key} commented out`);
  } else {
    if (content.match(regex)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${path.relative(process.cwd(), filePath)}: ${key}`);
};

const command = process.argv[2];

switch (command) {
  case 'fix-relative':
    updateEnv(rootEnv, 'DATABASE_URL', '"file:./backend/prisma/dev.db"');
    updateEnv(backendEnv, 'DATABASE_URL', '"file:./prisma/dev.db"');
    break;
  case 'fix-absolute':
    const dbPath = path.resolve(process.cwd(), 'backend/prisma/dev.db').replace(/\\/g, '/');
    updateEnv(rootEnv, 'DATABASE_URL', `"file:${dbPath}"`);
    updateEnv(backendEnv, 'DATABASE_URL', `"file:${dbPath}"`);
    break;
  case 'fix-no-quotes':
    updateEnv(rootEnv, 'DATABASE_URL', 'file:./backend/prisma/dev.db');
    updateEnv(backendEnv, 'DATABASE_URL', 'file:./dev.db');
    break;
  case 'comment-root':
    updateEnv(rootEnv, 'DATABASE_URL', null);
    break;
  default:
    console.log('Usage: ts-node scripts/env-manager.ts [fix-relative|fix-absolute|fix-no-quotes|comment-root]');
    process.exit(1);
}
