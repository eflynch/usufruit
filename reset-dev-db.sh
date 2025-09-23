#!/bin/bash

# Reset local development database
# This is for when you want to reset your local dev database
# without affecting the production migration history

echo "🔄 Resetting local development database..."

# Check if using SQLite or PostgreSQL
if grep -q "file:" .env; then
    echo "📁 Detected SQLite setup"
    # Remove SQLite database files
    rm -f prisma/dev.db
    rm -f prisma/dev.db-journal
    echo "✅ SQLite database files removed"
    
    # Use db push for SQLite (simpler than migrations)
    echo "📝 Pushing schema to fresh SQLite database..."
    npx prisma db push --force-reset
else
    echo "� Detected PostgreSQL setup"
    # Reset PostgreSQL database
    echo "📝 Resetting PostgreSQL database..."
    npx prisma migrate reset --force
fi

echo "🎉 Local database reset complete!"
echo "Your local database is now fresh and ready to use."
