/*
  Warnings:

  - Added the required column `borrowDurationDays` to the `books` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "borrowDurationDays" INTEGER NOT NULL,
    "organizingRules" TEXT,
    "checkInInstructions" TEXT,
    "checkOutInstructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "libraryId" TEXT NOT NULL,
    "librarianId" TEXT NOT NULL,
    CONSTRAINT "books_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "books_librarianId_fkey" FOREIGN KEY ("librarianId") REFERENCES "librarians" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_books" ("author", "borrowDurationDays", "checkInInstructions", "checkOutInstructions", "createdAt", "description", "id", "librarianId", "libraryId", "organizingRules", "title", "updatedAt") SELECT "author", 14, "checkInInstructions", "checkOutInstructions", "createdAt", "description", "id", "librarianId", "libraryId", "organizingRules", "title", "updatedAt" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
