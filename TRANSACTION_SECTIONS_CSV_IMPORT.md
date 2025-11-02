# 📁 Transaction Sections & CSV Import Feature

## ✅ What's New?

### 1. **Transaction Sections** - Organize Your Data
Keep different types of transactions organized separately:
- **Training Data** section for ML model training
- **Test Data** section for model validation
- **Production** section for live transactions
- **Historical** section for archived data
- **Custom sections** for any purpose you need

### 2. **CSV Import** - Bulk Load Transactions
Import hundreds or thousands of transactions at once:
- Load historical data for analysis
- Import training datasets
- Bulk test data creation
- Migration from other systems

---

## 🎯 Use Cases

### Use Case 1: Machine Learning Training
```
1. Create section: "ML Training Data - Oct 2025"
2. Import CSV with 1000+ historical transactions
3. Filter by section when training models
4. Export section data for ML pipeline
```

### Use Case 2: Testing & Validation
```
1. Create section: "Test Scenarios"
2. Import synthetic test data
3. Run optimization algorithms
4. Compare with production data
```

### Use Case 3: Data Migration
```
1. Create section: "Migrated from Legacy System"
2. Import old system data via CSV
3. Keep separate from new transactions
4. Gradual integration and validation
```

---

## 📋 Features Implemented

### Backend (app.py)

#### 1. New Database Model: `TransactionSection`
```python
- id (Integer, Primary Key)
- name (String, required)
- description (String, optional)
- color (String, for UI)
- created_at (DateTime)
- is_default (Boolean)
- transaction_count (computed)
```

#### 2. Updated `Transaction` Model
```python
- Added: section_id (Foreign Key to TransactionSection)
- Added: notes (String, for imported data)
```

#### 3. New API Endpoints

**GET /api/transaction-sections**
- Returns all sections with transaction counts
- No authentication (add if needed)

**POST /api/transaction-sections**
- Create new section
- Body: { name, description, color, is_default }
- Validates name uniqueness

**PUT /api/transaction-sections/{id}**
- Update existing section
- Body: { name, description, color, is_default }

**DELETE /api/transaction-sections/{id}**
- Delete section (only if no transactions)
- Returns error if section has transactions

**POST /api/transactions/import-csv**
- Import transactions from CSV file
- Multipart form data:
  - file: CSV file
  - section_id: (optional) assign to section
- Returns: { imported_count, total_rows, errors }

#### 4. Enhanced Filtering
- `/api/transactions/history` now supports `filter_section_id`
- Filter transactions by section
- Export CSV includes section filter

---

## 📤 CSV Import Format

### Required Columns:
```csv
atm_id,vault_id,amount,transaction_type,timestamp
1,1,500.00,withdrawal,2025-11-03 14:30:00
2,1,1000.00,deposit,2025-11-03 15:00:00
```

### Optional Columns:
```csv
notes
Sample withdrawal transaction
```

### Full Example:
```csv
atm_id,vault_id,amount,transaction_type,timestamp,notes
1,1,500.00,withdrawal,2025-11-03 14:30:00,Sample withdrawal
1,1,1000.00,deposit,2025-11-03 15:00:00,Sample deposit
2,1,20000.00,allocation,2025-11-03 16:00:00,Vault allocation
3,2,250.00,withdrawal,2025-11-03 17:00:00,Evening withdrawal
```

### Transaction Types:
- `withdrawal`
- `deposit`
- `allocation`
- `balance_check`

### Timestamp Format:
- `YYYY-MM-DD HH:MM:SS` (e.g., `2025-11-03 14:30:00`)
- ISO format also supported

---

## 🎨 Frontend Features

### 1. New Buttons in Header:
- **📁 Manage Sections** (Purple) - Opens section management modal
- **📤 Import CSV** (Indigo) - Opens CSV import modal
- **📥 Export CSV** (Green) - Existing, now exports with section filter
- **🔄 Refresh** (Blue) - Existing

### 2. Section Filter Dropdown
- Located in filter row (6 columns now)
- Shows section name and transaction count
- Filter by section: "Training Data (1,234)"

### 3. Section Management Modal
**Create New Section:**
- Name input (required)
- Description textarea (optional)
- Color selector (🔵🟢🔴🟡🟣🟠)
- Create button

**Existing Sections List:**
- Shows all sections
- Transaction count per section
- Created date
- Delete button (disabled if has transactions)

### 4. CSV Import Modal
**Features:**
- File upload input
- Section assignment dropdown (optional)
- Format instructions
- Sample format display
- Import result display
  - Success count
  - Total rows
  - First 10 errors (if any)

---

## 🧪 Testing Instructions

### Step 1: Database Migration Required

Since we added new models, you need to:

**Option A: Reset Database (DEVELOPMENT ONLY)**
```python
# In backend directory, run Python console:
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
```

**Option B: Keep Existing Data**
```python
# In backend directory, run Python console:
from app import app, db, TransactionSection
with app.app_context():
    db.create_all()  # Only creates missing tables
```

### Step 2: Test Section Management

1. Open Transaction History tab
2. Click **"📁 Manage Sections"**
3. Create sections:
   - Name: "Training Data"
   - Description: "Data for ML model training"
   - Color: Blue
4. Create another:
   - Name: "Test Data"
   - Description: "Testing and validation"
   - Color: Green
5. Verify sections appear in list
6. Try to delete (should work if no transactions)

### Step 3: Test CSV Import

1. Use the sample file: `backend/sample_transactions_template.csv`
2. Click **"📤 Import CSV"**
3. Select section: "Training Data"
4. Choose the sample CSV file
5. Click **"📤 Import"**
6. Verify:
   - Success message shows imported count
   - Transactions appear in table
   - Section shows transaction count

### Step 4: Test Section Filtering

1. In filter row, select Section: "Training Data"
2. Verify only transactions from that section appear
3. Summary cards update
4. Try exporting - should include section filter

### Step 5: Test with Larger Dataset

Create a CSV with 100+ rows:
```python
import csv
from datetime import datetime, timedelta
import random

with open('test_data_100.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['atm_id', 'vault_id', 'amount', 'transaction_type', 'timestamp', 'notes'])
    
    base_date = datetime(2025, 10, 1)
    for i in range(100):
        atm_id = random.randint(1, 6)
        vault_id = 1 if atm_id <= 3 else 2
        amount = random.randint(50, 1000)
        txn_type = random.choice(['withdrawal', 'deposit'])
        timestamp = base_date + timedelta(hours=i*2)
        notes = f'Test transaction {i+1}'
        
        writer.writerow([atm_id, vault_id, amount, txn_type, timestamp, notes])
```

Import this file and verify performance.

---

## 🎯 Advanced Use Cases

### ML Training Workflow

```
1. Create Sections:
   - "Training Set (80%)"
   - "Validation Set (10%)"
   - "Test Set (10%)"

2. Import Data:
   - Prepare 3 CSV files (split your dataset)
   - Import each to respective section
   - Verify counts: 80/10/10 split

3. Export for ML:
   - Filter by "Training Set"
   - Export CSV
   - Feed to ML pipeline

4. Model Validation:
   - Filter by "Test Set"
   - Compare predictions vs actual
   - Calculate accuracy metrics
```

### A/B Testing Scenarios

```
1. Create Sections:
   - "Scenario A - Aggressive"
   - "Scenario B - Conservative"

2. Import Simulations:
   - Run optimization with different parameters
   - Import results to sections
   - Compare performance

3. Analysis:
   - Filter by section
   - View summary statistics
   - Export for detailed analysis
```

---

## 📊 Database Schema Changes

### Before:
```
Transaction
├── id
├── vault_id
├── atm_id
├── amount
├── transaction_type
└── timestamp
```

### After:
```
TransactionSection (NEW)
├── id
├── name
├── description
├── color
├── created_at
└── is_default

Transaction (UPDATED)
├── id
├── vault_id
├── atm_id
├── amount
├── transaction_type
├── timestamp
├── section_id ← NEW (Foreign Key)
└── notes ← NEW
```

---

## 🚨 Important Notes

### 1. CSV Import Validation
- ATM ID must exist in database
- Vault ID must exist in database
- Timestamp must be valid format
- Amount must be numeric
- Transaction type must be valid

### 2. Error Handling
- Import continues on row errors
- Returns first 10 errors only
- Shows successful import count
- Failed rows are skipped

### 3. Section Deletion
- Cannot delete section with transactions
- Button disabled if section has data
- Must manually move/delete transactions first

### 4. Performance
- Large CSV imports (>1000 rows) may take time
- Progress indication in browser
- Database commit at end (all-or-nothing for errors)

---

## 🔜 Future Enhancements (Not Implemented)

### Potential Improvements:
1. **Bulk Section Assignment**
   - Select multiple transactions
   - Assign to section in batch

2. **Section Analytics**
   - Dedicated section view
   - Performance metrics per section
   - Charts and visualizations

3. **CSV Export Templates**
   - Download template with headers
   - Pre-filled examples

4. **Import History**
   - Track import operations
   - Undo imports
   - Import logs

5. **Section Access Control**
   - User permissions per section
   - Read-only sections
   - Admin-only sections

---

## ✅ Files Modified

### Backend:
- ✅ `backend/app.py` - Added models, endpoints
- ✅ `backend/sample_transactions_template.csv` - Sample file

### Frontend:
- ✅ `frontend/smart-atm-frontend/src/App.js` - Added UI components

### New Database Tables:
- ✅ `transaction_section` - Section storage
- ✅ `transaction.section_id` - FK column
- ✅ `transaction.notes` - Notes column

---

## 🎊 Ready to Use!

**To activate these features:**

1. ✅ **Restart backend server** with database migration
2. ✅ **Hard refresh frontend** (Ctrl+Shift+R)
3. ✅ **Create your first section**
4. ✅ **Import sample CSV**
5. ✅ **Start organizing your data!**

**Everything is implemented and ready for testing!** 🚀
