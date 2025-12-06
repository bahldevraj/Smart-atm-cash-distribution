"""
Generate Sample CSV Data for Import Testing

This script generates realistic transaction data in CSV format
for testing the import functionality.
"""

import csv
import random
from datetime import datetime, timedelta

def generate_test_transactions(filename, num_transactions=100, start_date=None):
    """
    Generate test transaction data
    
    Args:
        filename: Output CSV filename
        num_transactions: Number of transactions to generate
        start_date: Starting date (default: 30 days ago)
    """
    
    if start_date is None:
        start_date = datetime.now() - timedelta(days=30)
    
    # ATM and Vault mappings
    atms = [
        (1, 1, 'Mall Plaza'),
        (2, 1, 'University'),
        (3, 2, 'Airport'),
        (4, 2, 'Hospital'),
        (5, 1, 'Railway'),
        (6, 2, 'DownTown')
    ]
    
    transaction_types = [
        ('withdrawal', 0.60, 20, 1000),     # 60% withdrawals, $20-$1000
        ('deposit', 0.20, 50, 2000),        # 20% deposits, $50-$2000
        ('allocation', 0.15, 10000, 50000), # 15% allocations, $10K-$50K
        ('balance_check', 0.05, 0, 0)       # 5% balance checks, $0
    ]
    
    notes_templates = {
        'withdrawal': [
            'Customer withdrawal',
            'Cash dispensed successfully',
            'ATM withdrawal',
            'Standard withdrawal'
        ],
        'deposit': [
            'Cash deposit',
            'Customer deposit',
            'Deposit transaction',
            'Cash received'
        ],
        'allocation': [
            'Vault replenishment',
            'Cash allocation from vault',
            'Scheduled refill',
            'Emergency cash transfer'
        ],
        'balance_check': [
            'Balance inquiry',
            'Account balance check',
            'Balance request',
            'Status check'
        ]
    }
    
    print(f"Generating {num_transactions} test transactions...")
    print(f"Start date: {start_date.strftime('%Y-%m-%d')}")
    print(f"Output file: {filename}")
    print("=" * 60)
    
    transactions = []
    
    for i in range(num_transactions):
        # Select transaction type based on distribution
        rand = random.random()
        cumulative = 0
        selected_type = None
        
        for txn_type, probability, min_amt, max_amt in transaction_types:
            cumulative += probability
            if rand <= cumulative:
                selected_type = (txn_type, min_amt, max_amt)
                break
        
        txn_type, min_amt, max_amt = selected_type
        
        # Select random ATM
        atm_id, vault_id, atm_name = random.choice(atms)
        
        # Generate amount
        if txn_type == 'balance_check':
            amount = 0.0
        else:
            amount = round(random.uniform(min_amt, max_amt), 2)
        
        # Generate timestamp (spread over the time period)
        hours_offset = (i * 24 * 30 / num_transactions)  # Spread evenly
        timestamp = start_date + timedelta(hours=hours_offset)
        # Round to nearest hour
        timestamp = timestamp.replace(minute=random.randint(0, 59), second=0, microsecond=0)
        
        # Generate note
        note = random.choice(notes_templates[txn_type])
        if txn_type != 'balance_check':
            note += f' - ${amount:,.2f}'
        
        transactions.append({
            'atm_id': atm_id,
            'vault_id': vault_id,
            'amount': amount,
            'transaction_type': txn_type,
            'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'notes': note
        })
    
    # Write to CSV
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['atm_id', 'vault_id', 'amount', 'transaction_type', 'timestamp', 'notes'])
        writer.writeheader()
        writer.writerows(transactions)
    
    # Print statistics
    print(f"\n✅ Generated {num_transactions} transactions")
    print(f"\nBreakdown by type:")
    for txn_type, _, _, _ in transaction_types:
        count = sum(1 for t in transactions if t['transaction_type'] == txn_type)
        pct = (count / num_transactions) * 100
        print(f"  {txn_type:15s}: {count:4d} ({pct:5.1f}%)")
    
    print(f"\nBreakdown by ATM:")
    for atm_id, _, atm_name in atms:
        count = sum(1 for t in transactions if t['atm_id'] == atm_id)
        print(f"  ATM {atm_id} ({atm_name:15s}): {count:4d}")
    
    total_amount = sum(t['amount'] for t in transactions)
    print(f"\nTotal Amount: ${total_amount:,.2f}")
    print(f"Average Transaction: ${total_amount / num_transactions:,.2f}")
    
    print(f"\n✅ File saved: {filename}")

if __name__ == '__main__':
    # Generate different datasets
    
    # 1. Training data (100 transactions)
    print("\n📊 Generating Training Data...")
    generate_test_transactions(
        'training_data_100.csv',
        num_transactions=100,
        start_date=datetime(2025, 9, 1)
    )
    
    # 2. Validation data (50 transactions)
    print("\n" + "=" * 60)
    print("\n📊 Generating Validation Data...")
    generate_test_transactions(
        'validation_data_50.csv',
        num_transactions=50,
        start_date=datetime(2025, 10, 1)
    )
    
    # 3. Test data (30 transactions)
    print("\n" + "=" * 60)
    print("\n📊 Generating Test Data...")
    generate_test_transactions(
        'test_data_30.csv',
        num_transactions=30,
        start_date=datetime(2025, 10, 15)
    )
    
    # 4. Large dataset (500 transactions)
    print("\n" + "=" * 60)
    print("\n📊 Generating Large Dataset...")
    generate_test_transactions(
        'large_dataset_500.csv',
        num_transactions=500,
        start_date=datetime(2025, 8, 1)
    )
    
    print("\n" + "=" * 60)
    print("\n🎉 All test files generated successfully!")
    print("\nFiles created:")
    print("  1. training_data_100.csv    (100 rows, Sept 2025)")
    print("  2. validation_data_50.csv   (50 rows, Oct 2025)")
    print("  3. test_data_30.csv         (30 rows, Mid-Oct 2025)")
    print("  4. large_dataset_500.csv    (500 rows, Aug-Oct 2025)")
    print("\nYou can now import these files via the UI!")
