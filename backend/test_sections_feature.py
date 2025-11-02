"""
Automated Test Script for Transaction Sections & CSV Import

This script tests all functionality automatically.
Run after migration and backend restart.
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = 'http://localhost:5000/api'

def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_info(text):
    print(f"ℹ️  {text}")

def test_backend_health():
    """Test if backend is running"""
    print_header("Test 1: Backend Health Check")
    try:
        response = requests.get(f"{BASE_URL}/atms")
        if response.status_code == 200:
            print_success("Backend is running")
            print_info(f"Found {len(response.json())} ATMs")
            return True
        else:
            print_error(f"Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend. Is it running on http://localhost:5000?")
        return False

def test_list_sections():
    """Test listing sections"""
    print_header("Test 2: List Transaction Sections")
    try:
        response = requests.get(f"{BASE_URL}/transaction-sections")
        if response.status_code == 200:
            sections = response.json()
            print_success(f"Found {len(sections)} section(s)")
            for section in sections:
                print_info(f"  - {section['name']}: {section['transaction_count']} transactions")
            return sections
        else:
            print_error(f"Failed to list sections: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return []

def test_create_section():
    """Test creating a section"""
    print_header("Test 3: Create New Section")
    
    section_name = f"Test Section {datetime.now().strftime('%H%M%S')}"
    
    data = {
        "name": section_name,
        "description": "Automated test section",
        "color": "#10B981"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/transaction-sections",
            json=data
        )
        
        if response.status_code == 201:
            section = response.json()
            print_success(f"Created section: {section['name']} (ID: {section['id']})")
            return section
        else:
            print_error(f"Failed to create section: {response.status_code}")
            print_info(response.text)
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

def test_import_csv(section_id=None):
    """Test CSV import"""
    print_header("Test 4: Import CSV File")
    
    # Create test CSV content
    csv_content = """atm_id,vault_id,amount,transaction_type,timestamp,notes
1,1,100.00,withdrawal,2025-01-15 10:00:00,Test withdrawal 1
2,1,200.00,deposit,2025-01-15 11:00:00,Test deposit 1
3,2,150.00,withdrawal,2025-01-15 12:00:00,Test withdrawal 2
4,2,0.00,balance_check,2025-01-15 13:00:00,Test balance check
5,1,300.00,withdrawal,2025-01-15 14:00:00,Test withdrawal 3
"""
    
    # Save to file
    filename = 'test_import_temp.csv'
    with open(filename, 'w') as f:
        f.write(csv_content)
    
    print_info(f"Created test file: {filename}")
    
    # Prepare form data
    files = {'file': open(filename, 'rb')}
    data = {}
    if section_id:
        data['section_id'] = section_id
        print_info(f"Importing to section ID: {section_id}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/transactions/import-csv",
            files=files,
            data=data
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success(f"Import completed!")
            print_info(f"  Imported: {result.get('imported_count', 0)} transactions")
            print_info(f"  Total rows: {result.get('total_rows', 0)}")
            
            if result.get('errors'):
                print_error(f"  Errors: {len(result['errors'])}")
                for error in result['errors'][:3]:
                    print_info(f"    - {error}")
            
            return result
        else:
            print_error(f"Failed to import CSV: {response.status_code}")
            print_info(response.text)
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

def test_filter_by_section(section_id):
    """Test filtering transactions by section"""
    print_header("Test 5: Filter Transactions by Section")
    
    params = {
        'filter_section_id': section_id,
        'page': 1,
        'per_page': 50
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/transactions/history",
            params=params
        )
        
        if response.status_code == 200:
            result = response.json()
            transactions = result.get('transactions', [])
            print_success(f"Found {len(transactions)} transaction(s) in section")
            
            if transactions:
                print_info("Sample transactions:")
                for txn in transactions[:3]:
                    print_info(f"  - {txn['transaction_type']}: ${txn['amount']} at {txn['timestamp']}")
            
            return result
        else:
            print_error(f"Failed to filter: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

def test_update_section(section_id):
    """Test updating a section"""
    print_header("Test 6: Update Section")
    
    data = {
        "description": f"Updated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "color": "#EF4444"
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/transaction-sections/{section_id}",
            json=data
        )
        
        if response.status_code == 200:
            section = response.json()
            print_success(f"Updated section: {section['name']}")
            print_info(f"  New description: {section['description']}")
            print_info(f"  New color: {section['color']}")
            return section
        else:
            print_error(f"Failed to update section: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

def test_delete_section(section_id):
    """Test deleting a section"""
    print_header("Test 7: Delete Section")
    
    try:
        response = requests.delete(f"{BASE_URL}/transaction-sections/{section_id}")
        
        if response.status_code == 200:
            print_success(f"Deleted section ID: {section_id}")
            return True
        elif response.status_code == 400:
            print_info("Cannot delete section - it has transactions (this is expected)")
            return True
        else:
            print_error(f"Failed to delete section: {response.status_code}")
            print_info(response.text)
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_invalid_csv():
    """Test CSV import with invalid data"""
    print_header("Test 8: Import Invalid CSV (Error Handling)")
    
    # CSV with invalid ATM ID and invalid transaction type
    csv_content = """atm_id,vault_id,amount,transaction_type,timestamp,notes
99,1,100.00,withdrawal,2025-01-15 10:00:00,Invalid ATM ID
1,99,200.00,deposit,2025-01-15 11:00:00,Invalid Vault ID
1,1,150.00,invalid_type,2025-01-15 12:00:00,Invalid transaction type
"""
    
    filename = 'test_invalid_import.csv'
    with open(filename, 'w') as f:
        f.write(csv_content)
    
    files = {'file': open(filename, 'rb')}
    
    try:
        response = requests.post(
            f"{BASE_URL}/transactions/import-csv",
            files=files
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Import completed (with expected errors)")
            print_info(f"  Imported: {result.get('imported_count', 0)} transactions")
            print_info(f"  Errors: {len(result.get('errors', []))}")
            
            if result.get('errors'):
                print_info("Expected errors found:")
                for error in result['errors']:
                    print_info(f"  - {error}")
            
            return result
        else:
            print_error(f"Unexpected status: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

def run_all_tests():
    """Run all tests"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "TRANSACTION SECTIONS TEST SUITE" + " " * 16 + "║")
    print("╚" + "=" * 58 + "╝")
    
    results = {
        'passed': 0,
        'failed': 0,
        'total': 8
    }
    
    # Test 1: Backend health
    if not test_backend_health():
        print_error("\n⚠️  Cannot continue - backend is not running!")
        print_info("Please start the backend server: python backend/app.py")
        return
    results['passed'] += 1
    time.sleep(0.5)
    
    # Test 2: List sections
    sections = test_list_sections()
    if sections is not None:
        results['passed'] += 1
    else:
        results['failed'] += 1
    time.sleep(0.5)
    
    # Test 3: Create section
    new_section = test_create_section()
    if new_section:
        results['passed'] += 1
    else:
        results['failed'] += 1
        print_error("\n⚠️  Cannot continue - section creation failed!")
        return
    time.sleep(0.5)
    
    # Test 4: Import CSV
    import_result = test_import_csv(new_section['id'])
    if import_result and import_result.get('imported_count', 0) > 0:
        results['passed'] += 1
    else:
        results['failed'] += 1
    time.sleep(0.5)
    
    # Test 5: Filter by section
    filter_result = test_filter_by_section(new_section['id'])
    if filter_result:
        results['passed'] += 1
    else:
        results['failed'] += 1
    time.sleep(0.5)
    
    # Test 6: Update section
    update_result = test_update_section(new_section['id'])
    if update_result:
        results['passed'] += 1
    else:
        results['failed'] += 1
    time.sleep(0.5)
    
    # Test 7: Delete section (should fail because it has transactions)
    delete_result = test_delete_section(new_section['id'])
    if delete_result:
        results['passed'] += 1
    else:
        results['failed'] += 1
    time.sleep(0.5)
    
    # Test 8: Invalid CSV
    invalid_result = test_invalid_csv()
    if invalid_result:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # Print summary
    print_header("TEST SUMMARY")
    print(f"\n📊 Results:")
    print(f"  Total Tests:  {results['total']}")
    print(f"  ✅ Passed:     {results['passed']}")
    print(f"  ❌ Failed:     {results['failed']}")
    
    if results['failed'] == 0:
        print("\n🎉 All tests passed! Transaction Sections feature is working correctly!")
    else:
        print(f"\n⚠️  {results['failed']} test(s) failed. Please check the output above.")
    
    print("\n" + "=" * 60)
    print("\n💡 Next Steps:")
    print("  1. Open http://localhost:3000 in your browser")
    print("  2. Navigate to Transaction History tab")
    print("  3. Click '📁 Manage Sections' to see your test section")
    print("  4. Try importing more data with '📤 Import CSV'")
    print("\n" + "=" * 60)

if __name__ == '__main__':
    run_all_tests()
