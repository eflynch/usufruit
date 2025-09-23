-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_librarians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "secretKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "libraryId" TEXT NOT NULL,
    CONSTRAINT "librarians_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_librarians" ("contactInfo", "createdAt", "id", "libraryId", "name", "updatedAt") SELECT "contactInfo", "createdAt", "id", "libraryId", "name", "updatedAt" FROM "librarians";
DROP TABLE "librarians";
ALTER TABLE "new_librarians" RENAME TO "librarians";
CREATE UNIQUE INDEX "librarians_secretKey_key" ON "librarians"("secretKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
