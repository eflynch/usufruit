# Database Seeding Scripts

This directory contains utility scripts for managing test data in your Usufruit library system database.

## Scripts Overview

### 1. `find-ids.js` - Discovery Helper
Discovers existing library and librarian IDs in your database to use with other scripts.

**Usage:**
```bash
node scripts/find-ids.js
```

**Output Example:**
```
Available Library IDs:
- cmfx83n7i000049vn5agiffgq (Test Library)

Available Librarian IDs for cmfx83n7i000049vn5agiffgq:
- cmfx83n7j000149vn8h9k2lmn (John Doe)
- cmfx83n7j000249vn3p4q5rst (Jane Smith)

Example usage:
node scripts/seed-books.js cmfx83n7i000049vn5agiffgq cmfx83n7j000149vn8h9k2lmn
```

### 2. `seed-books.js` - Test Data Creation
Populates a library with realistic test books for testing search and pagination functionality.

**Usage:**
```bash
# Seed books for a specific library and librarian
node scripts/seed-books.js <LIBRARY_ID> <LIBRARIAN_ID>

# Example:
node scripts/seed-books.js cmfx83n7i000049vn5agiffgq cmfx83n7j000149vn8h9k2lmn
```

**Features:**
- Creates 30+ realistic books with diverse categories
- Includes repair guides, maker tools, camping equipment, programming books, etc.
- Validates library and librarian existence before seeding
- Prevents duplicate books based on title
- Provides detailed logging and progress updates
- Perfect for testing search fuzzy matching and pagination

**Book Categories Included:**
- Electronics & Repair Guides
- Programming & Technology  
- Maker Space & DIY Tools
- Outdoor & Camping Equipment
- Workshop & Craft Supplies
- Reference & Documentation

### 3. `cleanup-books.js` - Test Data Removal
Safely removes test books and associated data from the database.

**Usage:**
```bash
# Clean up books from a specific library
node scripts/cleanup-books.js <LIBRARY_ID>

# Example:
node scripts/cleanup-books.js cmfx83n7i000049vn5agiffgq
```

**Safety Features:**
- Validates library existence before cleanup
- Deletes associated loans before removing books
- Provides confirmation prompts for destructive operations
- Detailed logging of cleanup operations
- Transaction-safe operations

## Quick Start Workflow

1. **Discover IDs:**
   ```bash
   node scripts/find-ids.js
   ```

2. **Seed Test Data:**
   ```bash
   node scripts/seed-books.js <LIBRARY_ID> <LIBRARIAN_ID>
   ```

3. **Test Search & Pagination:**
   - Navigate to your library page
   - Try searching for "arduino", "camping", "javascript", etc.
   - Test pagination with 50+ books

4. **Clean Up When Done:**
   ```bash
   node scripts/cleanup-books.js <LIBRARY_ID>
   ```

## Database Requirements

- Prisma client configured and accessible
- Database connection established
- Existing library and librarian records
- Proper permissions for create/delete operations

## Search Testing Tips

With the seeded data, you can test:

- **Fuzzy Search:** Try partial matches like "repair", "guide", "camp"
- **Category Search:** Search for "arduino", "javascript", "woodworking"
- **Title Search:** Look for specific items like "multimeter", "tent", "soldering"
- **Pagination:** With 30+ books, test page navigation and limits
- **Empty Results:** Search for non-existent terms to test no-results states

## Production Warning

⚠️ **These scripts are for development and testing only!**

Do not run these scripts against production databases. They are designed for:
- Local development environments
- Testing search and pagination functionality
- Populating staging environments with sample data

Always backup your database before running cleanup operations.
