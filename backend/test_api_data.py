"""Test if API returns all 6 ATMs and 2 Vaults"""
import requests

print("Testing API endpoints...")
print("=" * 60)

# Test ATMs
print("\n📍 ATMs Endpoint:")
try:
    r = requests.get('http://localhost:5000/api/atms')
    atms = r.json()
    print(f"Total ATMs: {len(atms)}")
    for atm in atms:
        print(f"  {atm['id']}. {atm['name']} - {atm['location']}")
except Exception as e:
    print(f"Error: {e}")

# Test Vaults
print("\n🏛️ Vaults Endpoint:")
try:
    r = requests.get('http://localhost:5000/api/vaults')
    vaults = r.json()
    print(f"Total Vaults: {len(vaults)}")
    for vault in vaults:
        print(f"  {vault['id']}. {vault['name']} - {vault['location']}")
        print(f"     Capacity: ${vault['capacity']:,.0f}, Balance: ${vault['current_balance']:,.0f}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
