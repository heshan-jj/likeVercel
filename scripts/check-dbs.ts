import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const dbFiles = [
  'backend/prisma/dev.db',
  'backend/prisma/backend/prisma/dev.db',
  'backend/prisma/prisma/dev.db'
];

dbFiles.forEach(db => {
  const absolutePath = path.resolve(process.cwd(), db);
  if (fs.existsSync(absolutePath)) {
    console.log(`--- Checking ${db} ---`);
    try {
      // Use prisma to query the PRAGMA table_info
      const output = execSync(`npx prisma sqlite query "PRAGMA table_info(User)"`, { 
        env: { ...process.env, DATABASE_URL: `file:${absolutePath}` }
      }).toString();
      console.log(output);
    } catch (err: any) {
      console.log(`Failed to query ${db}: ${err.message}`);
    }
  } else {
    console.log(`${db} does not exist.`);
  }
});
