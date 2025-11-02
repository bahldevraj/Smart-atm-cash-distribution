"""
Database Migration Script - Add Transaction Sections Support

This script adds the new TransactionSection table and updates the Transaction table
with section_id and notes columns.

IMPORTANT: This will NOT delete existing data.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, TransactionSection, Transaction

def migrate_database():
    """Add new tables and columns to existing database"""
    print("=" * 60)
    print("Database Migration - Transaction Sections & CSV Import")
    print("=" * 60)
    
    with app.app_context():
        try:
            # First, manually add columns to transaction table if they don't exist
            from sqlalchemy import text
            
            print("\n📊 Checking/adding columns to transaction table...")
            
            with db.engine.connect() as conn:
                # Check if columns exist (quote table name as it's a reserved word)
                result = conn.execute(text('PRAGMA table_info("transaction")'))
                columns = [row[1] for row in result]
                
                if 'section_id' not in columns:
                    print("   Adding section_id column...")
                    conn.execute(text('ALTER TABLE "transaction" ADD COLUMN section_id INTEGER'))
                    conn.commit()
                    print("   ✅ section_id column added!")
                else:
                    print("   ℹ️  section_id column already exists")
                
                if 'notes' not in columns:
                    print("   Adding notes column...")
                    conn.execute(text('ALTER TABLE "transaction" ADD COLUMN notes VARCHAR(500)'))
                    conn.commit()
                    print("   ✅ notes column added!")
                else:
                    print("   ℹ️  notes column already exists")
            
            # Now create new tables (will skip if already exists)
            print("\n📊 Creating new database tables...")
            db.create_all()
            print("✅ Tables created/verified successfully!")
            
            # Verify TransactionSection table exists
            sections_count = TransactionSection.query.count()
            print(f"\n📁 Transaction Sections: {sections_count}")
            
            # Verify Transaction table has new columns
            transactions_count = Transaction.query.count()
            print(f"💳 Transactions: {transactions_count}")
            
            # Create default section if none exist
            if sections_count == 0:
                print("\n🎨 Creating default section...")
                default_section = TransactionSection(
                    name="General",
                    description="Default section for uncategorized transactions",
                    color="blue",
                    is_default=True
                )
                db.session.add(default_section)
                db.session.commit()
                print("✅ Default section 'General' created!")
            
            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("=" * 60)
            print("\nYou can now:")
            print("  1. Create custom sections via the UI")
            print("  2. Import transactions from CSV")
            print("  3. Filter by section")
            print("\nSample sections to create:")
            print("  - Training Data (for ML)")
            print("  - Test Data (for validation)")
            print("  - Production (live transactions)")
            print("  - Historical (archived data)")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate_database()
