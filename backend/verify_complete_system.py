"""
Comprehensive verification that ATMs and Vaults are updated everywhere
"""
import sys
sys.path.append(r'C:\Users\bdevr\Project\smart-atm-system\backend')

import requests
from app import app, db, ATM, Vault

print("=" * 80)
print("🔍 SMART ATM SYSTEM - COMPLETE VERIFICATION")
print("=" * 80)

# 1. Check Database
print("\n📊 1. DATABASE CHECK")
print("-" * 80)
with app.app_context():
    atms = ATM.query.all()
    vaults = Vault.query.all()
    
    print(f"✅ ATMs in Database: {len(atms)}")
    for atm in atms:
        print(f"   {atm.id}. {atm.name} - {atm.location}")
        print(f"      Balance: ${atm.current_balance:,.0f}, Capacity: ${atm.capacity:,.0f}")
    
    print(f"\n✅ Vaults in Database: {len(vaults)}")
    for vault in vaults:
        print(f"   {vault.id}. {vault.name} - {vault.location}")
        print(f"      Balance: ${vault.current_balance:,.0f}, Capacity: ${vault.capacity:,.0f}")

# 2. Check Backend API
print("\n🌐 2. BACKEND API CHECK (http://localhost:5000)")
print("-" * 80)

try:
    # ATMs endpoint
    r_atms = requests.get('http://localhost:5000/api/atms', timeout=5)
    if r_atms.status_code == 200:
        api_atms = r_atms.json()
        print(f"✅ /api/atms endpoint: {len(api_atms)} ATMs")
        for atm in api_atms:
            print(f"   {atm['id']}. {atm['name']} - {atm['location']}")
    else:
        print(f"❌ /api/atms returned status {r_atms.status_code}")
    
    # Vaults endpoint
    r_vaults = requests.get('http://localhost:5000/api/vaults', timeout=5)
    if r_vaults.status_code == 200:
        api_vaults = r_vaults.json()
        print(f"\n✅ /api/vaults endpoint: {len(api_vaults)} Vaults")
        for vault in api_vaults:
            print(f"   {vault['id']}. {vault['name']} - {vault['location']}")
    else:
        print(f"❌ /api/vaults returned status {r_vaults.status_code}")
    
    # ML Models endpoint
    print(f"\n✅ Checking ML models availability:")
    for atm_id in range(1, 7):
        r_ml = requests.get(f'http://localhost:5000/api/ml/models/status', timeout=5)
        if r_ml.status_code == 200:
            break
    if r_ml.status_code == 200:
        print(f"   ML API is available")
    
except requests.exceptions.ConnectionError:
    print("❌ Backend server not running at http://localhost:5000")
    print("   Please start: python C:\\Users\\bdevr\\Project\\smart-atm-system\\backend\\app.py")
except Exception as e:
    print(f"❌ Error: {e}")

# 3. Check ML Models
print("\n🤖 3. ML MODELS CHECK")
print("-" * 80)

import os
models_dir = r'C:\Users\bdevr\Project\smart-atm-system\ml_models\saved_models'

if os.path.exists(models_dir):
    files = os.listdir(models_dir)
    atm_ids = set()
    
    for f in files:
        if 'atm_' in f:
            atm_num = f.split('atm_')[1].split('.')[0]
            atm_ids.add(int(atm_num))
    
    print(f"✅ ML Models exist for ATMs: {sorted(atm_ids)}")
    
    for atm_id in sorted(atm_ids):
        arima = f'arima_atm_{atm_id}.pkl' in files
        lstm = f'lstm_atm_{atm_id}.pkl' in files
        ensemble = f'ensemble_atm_{atm_id}.pkl' in files
        metrics = f'model_metrics_atm_{atm_id}.csv' in files
        
        status = "✓" if all([arima, lstm, ensemble, metrics]) else "✗"
        print(f"   ATM {atm_id}: {status} ARIMA={arima}, LSTM={lstm}, Ensemble={ensemble}, Metrics={metrics}")
else:
    print(f"❌ Models directory not found: {models_dir}")

# 4. Frontend Status
print("\n💻 4. FRONTEND STATUS")
print("-" * 80)

try:
    r_frontend = requests.get('http://localhost:3000', timeout=5)
    if r_frontend.status_code == 200:
        print("✅ Frontend is running at http://localhost:3000")
        print("   Note: You need to HARD REFRESH (Ctrl+Shift+R) to see updates")
    else:
        print(f"❌ Frontend returned status {r_frontend.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ Frontend not running at http://localhost:3000")
    print("   Please start: cd frontend/smart-atm-frontend && npm start")
except Exception as e:
    print(f"❌ Error: {e}")

# Summary
print("\n" + "=" * 80)
print("📋 SUMMARY")
print("=" * 80)

with app.app_context():
    db_atms = ATM.query.count()
    db_vaults = Vault.query.count()

try:
    api_atms_count = len(requests.get('http://localhost:5000/api/atms').json())
    api_vaults_count = len(requests.get('http://localhost:5000/api/vaults').json())
    api_ok = True
except:
    api_ok = False

if db_atms == 6 and db_vaults == 2:
    print("✅ Database: 6 ATMs, 2 Vaults - CORRECT")
else:
    print(f"⚠️  Database: {db_atms} ATMs, {db_vaults} Vaults")

if api_ok and api_atms_count == 6 and api_vaults_count == 2:
    print("✅ Backend API: 6 ATMs, 2 Vaults - CORRECT")
else:
    print("⚠️  Backend API: Not accessible or incorrect data")

ml_atms = len(atm_ids) if os.path.exists(models_dir) else 0
if ml_atms == 6:
    print("✅ ML Models: 6 ATMs trained - CORRECT")
else:
    print(f"⚠️  ML Models: {ml_atms} ATMs trained")

print("\n💡 NEXT STEP:")
print("   Open http://localhost:3000 and press Ctrl+Shift+R (Hard Refresh)")
print("   The webpage will show all 6 ATMs and 2 Vaults!")

print("\n" + "=" * 80)
