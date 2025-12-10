"""
Database Setup Script
Initializes the database and creates root user from .env configuration
"""
import os
from app import app, db, User
from dotenv import load_dotenv

def setup_database():
    """Initialize database and create root user"""
    
    # Load environment variables
    load_dotenv()
    
    with app.app_context():
        print("\n" + "="*70)
        print("DATABASE INITIALIZATION")
        print("="*70)
        
        # Create all tables
        print("\n1. Creating database tables...")
        db.create_all()
        print("   ✓ Tables created")
        
        # Check if root user already exists
        root_email = os.getenv('ROOT_USER_EMAIL')
        existing_root = User.query.filter_by(email=root_email).first()
        
        if existing_root:
            print(f"\n⚠ Root user already exists: {root_email}")
            update = input("Update root user details? (yes/no): ").lower()
            
            if update == 'yes':
                existing_root.name = os.getenv('ROOT_USER_NAME')
                existing_root.set_password(os.getenv('ROOT_USER_PASSWORD'))
                existing_root.is_root = True
                existing_root.is_approved = True
                existing_root.is_verified = True
                db.session.commit()
                print("   ✓ Root user updated")
            else:
                print("   Skipping root user update")
        else:
            # Create root user
            print("\n2. Creating root user...")
            root_user = User(
                name=os.getenv('ROOT_USER_NAME'),
                email=root_email,
                is_root=True,
                is_approved=True,
                is_verified=True
            )
            root_user.set_password(os.getenv('ROOT_USER_PASSWORD'))
            
            db.session.add(root_user)
            db.session.commit()
            print("   ✓ Root user created")
        
        # Display summary
        print("\n" + "="*70)
        print("DATABASE SETUP COMPLETE")
        print("="*70)
        
        all_users = User.query.all()
        print(f"\nTotal users in database: {len(all_users)}")
        print("\nUsers:")
        for user in all_users:
            role = "ROOT ADMIN" if user.is_root else "User"
            status = "Approved" if user.is_approved else "Pending"
            print(f"  - {user.email} [{role}] [{status}]")
        
        print("\n" + "="*70)
        print("✓ System ready to use!")
        print("="*70)
        print("\n🚀 Start the backend: python app.py")
        print("📧 Root user email:", os.getenv('ROOT_USER_EMAIL'))
        print("\n")

if __name__ == '__main__':
    try:
        setup_database()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure you have:")
        print("1. Run setup_wizard.py first")
        print("2. Created .env file with proper configuration")
