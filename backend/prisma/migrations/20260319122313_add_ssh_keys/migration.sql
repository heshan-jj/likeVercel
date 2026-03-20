/*
  Warnings:

  - You are about to drop the column `cpuCores` on the `VpsProfile` table. All the data in the column will be lost.
  - You are about to drop the column `diskString` on the `VpsProfile` table. All the data in the column will be lost.
  - You are about to drop the column `osVersion` on the `VpsProfile` table. All the data in the column will be lost.
  - You are about to drop the column `ramString` on the `VpsProfile` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "SshKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SshKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VpsProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL,
    "authType" TEXT NOT NULL DEFAULT 'password',
    "encryptedCredentials" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "lastConnectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VpsProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VpsProfile" ("authTag", "authType", "createdAt", "encryptedCredentials", "host", "id", "iv", "lastConnectedAt", "name", "port", "updatedAt", "userId", "username") SELECT "authTag", "authType", "createdAt", "encryptedCredentials", "host", "id", "iv", "lastConnectedAt", "name", "port", "updatedAt", "userId", "username" FROM "VpsProfile";
DROP TABLE "VpsProfile";
ALTER TABLE "new_VpsProfile" RENAME TO "VpsProfile";
CREATE INDEX "VpsProfile_userId_idx" ON "VpsProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SshKey_userId_idx" ON "SshKey"("userId");
