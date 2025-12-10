"""
Smart ATM System - Initial Setup Wizard
Run this script after downloading the project to configure your system
"""
import os
import secrets
from getpass import getpass

def generate_secret_key():
    """Generate a secure random key"""
    return secrets.token_urlsafe(32)

def create_env_file():
    """Create .env file with user configuration"""
    print("=" * 70)
    print("SMART ATM SYSTEM - INITIAL SETUP")
    print("=" * 70)
    print("\nThis wizard will help you configure the system.\n")
    
    # Check if .env already exists
    if os.path.exists('.env'):
        overwrite = input(".env file already exists. Overwrite? (yes/no): ").lower()
        if overwrite != 'yes':
            print("Setup cancelled.")
            return
    
    # Generate secure keys
    print("Generating secure keys...")
    secret_key = generate_secret_key()
    jwt_secret_key = generate_secret_key()
    print("✓ Secure keys generated\n")
    
    # Get root user details
    print("ROOT USER CONFIGURATION:")
    print("-" * 70)
    root_name = input("Enter root user name (default: Admin): ").strip() or "Admin"
    root_email = input("Enter root user email: ").strip()
    
    while not root_email:
        print("❌ Email is required!")
        root_email = input("Enter root user email: ").strip()
    
    root_password = getpass("Enter root user password: ")
    while len(root_password) < 6:
        print("❌ Password must be at least 6 characters!")
        root_password = getpass("Enter root user password: ")
    
    root_password_confirm = getpass("Confirm root user password: ")
    while root_password != root_password_confirm:
        print("❌ Passwords do not match!")
        root_password = getpass("Enter root user password: ")
        root_password_confirm = getpass("Confirm root user password: ")
    
    print("\n✓ Root user configured\n")
    
    # Email configuration (optional)
    print("EMAIL CONFIGURATION (Optional - press Enter to skip):")
    print("-" * 70)
    configure_email = input("Configure email for notifications? (yes/no): ").lower()
    
    if configure_email == 'yes':
        mail_server = input("SMTP Server (default: smtp.gmail.com): ").strip() or "smtp.gmail.com"
        mail_port = input("SMTP Port (default: 587): ").strip() or "587"
        mail_username = input("Email username: ").strip()
        mail_password = getpass("Email password (App Password): ")
        mail_sender = input("Default sender email (default: same as username): ").strip() or mail_username
    else:
        mail_server = "smtp.gmail.com"
        mail_port = "587"
        mail_username = "your-email@gmail.com"
        mail_password = "your-app-password"
        mail_sender = "your-email@gmail.com"
    
    # Create .env file
    env_content = f"""# Smart ATM System Configuration
# Generated on: {os.popen('date /t').read().strip()}

# Flask Security Keys
SECRET_KEY={secret_key}
JWT_SECRET_KEY={jwt_secret_key}

# Root User Configuration
ROOT_USER_NAME={root_name}
ROOT_USER_EMAIL={root_email}
ROOT_USER_PASSWORD={root_password}

# Email Configuration
MAIL_SERVER={mail_server}
MAIL_PORT={mail_port}
MAIL_USE_TLS=True
MAIL_USERNAME={mail_username}
MAIL_PASSWORD={mail_password}
MAIL_DEFAULT_SENDER={mail_sender}

# Database Configuration
DATABASE_URI=sqlite:///smart_atm.db
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("\n" + "=" * 70)
    print("✓ Configuration saved to .env file")
    print("=" * 70)
    print("\n📝 IMPORTANT NOTES:")
    print("1. Your .env file contains sensitive information")
    print("2. Never commit .env to Git (it's in .gitignore)")
    print("3. Keep your root user credentials safe")
    print("\n🚀 NEXT STEPS:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Initialize database: python setup_database.py")
    print("3. Start backend: python app.py")
    print("4. Start frontend: cd ../frontend/smart-atm-frontend && npm install && npm start")
    print("\n" + "=" * 70)

if __name__ == '__main__':
    try:
        create_env_file()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
