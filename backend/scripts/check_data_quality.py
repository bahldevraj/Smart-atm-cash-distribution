"""Check training data size"""
import pandas as pd
import sys
sys.path.append(r'C:\Users\bdevr\Project\smart-atm-system\backend')

# Check ML training data
print("=" * 70)
print("ML TRAINING DATA")
print("=" * 70)

df = pd.read_csv(r'C:\Users\bdevr\Project\smart-atm-system\ml_models\data\atm_demand_data.csv')

print(f"\n📊 Dataset Overview:")
print(f"  Total records: {len(df):,}")
print(f"  Number of ATMs: {df['atm_id'].nunique()}")
print(f"  Date range: {df['date'].min()} to {df['date'].max()}")
print(f"  Total days: {df['date'].nunique()}")
print(f"  Columns: {df.shape[1]}")

print(f"\n📍 Records per ATM:")
for atm_id in sorted(df['atm_id'].unique()):
    count = len(df[df['atm_id'] == atm_id])
    atm_name = df[df['atm_id'] == atm_id]['atm_name'].iloc[0]
    print(f"  ATM {atm_id} - {atm_name}: {count} records")

# Check database for vaults
print("\n" + "=" * 70)
print("DATABASE INFORMATION")
print("=" * 70)

try:
    from app import app, db, ATM, Vault
    
    with app.app_context():
        atms = ATM.query.all()
        vaults = Vault.query.all()
        
        print(f"\n🏦 ATMs in Database:")
        print(f"  Total ATMs: {len(atms)}")
        for atm in atms:
            print(f"  {atm.id}. {atm.name} - {atm.location}")
        
        print(f"\n🏛️ Vaults in Database:")
        print(f"  Total Vaults: {len(vaults)}")
        for vault in vaults:
            print(f"  {vault.id}. {vault.name} - {vault.location} (Capacity: ${vault.capacity:,})")
        
        # Check assignments
        print(f"\n🔗 ATM-Vault Assignments:")
        for atm in atms:
            vault = Vault.query.get(atm.vault_id) if atm.vault_id else None
            vault_name = vault.name if vault else "Not assigned"
            print(f"  {atm.name} → {vault_name}")

except Exception as e:
    print(f"\n⚠️ Could not access database: {e}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"✓ ML Training Data: {df['atm_id'].nunique()} ATMs × {df['date'].nunique()} days = {len(df):,} records")
try:
    with app.app_context():
        print(f"✓ Database: {len(ATM.query.all())} ATMs, {len(Vault.query.all())} Vaults")
except:
    pass
print("=" * 70)
