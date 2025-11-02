"""Generate realistic transactions for the training period"""
import sys
sys.path.append(r'C:\Users\bdevr\Project\smart-atm-system\backend')

from app import app, db, Transaction, ATM
from datetime import datetime, timedelta
import random

print("=" * 80)
print("GENERATING REALISTIC TRANSACTIONS")
print("=" * 80)

with app.app_context():
    # Clear existing test transactions
    print("\nClearing old test transactions...")
    Transaction.query.delete()
    db.session.commit()
    
    # Get all ATMs
    atms = ATM.query.all()
    print(f"Found {len(atms)} ATMs")
    
    # Generate transactions for the past 30 days (recent activity)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    print(f"\nGenerating transactions from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    transaction_types = ['withdrawal', 'deposit', 'balance_check', 'allocation']
    transaction_weights = [60, 20, 15, 5]  # Withdrawals most common
    
    transactions_created = 0
    
    # Generate transactions for each day
    current_date = start_date
    while current_date <= end_date:
        # Each ATM gets 5-15 transactions per day
        for atm in atms:
            num_txns = random.randint(5, 15)
            
            for _ in range(num_txns):
                # Random time during the day (8 AM - 8 PM)
                hour = random.randint(8, 20)
                minute = random.randint(0, 59)
                timestamp = current_date.replace(hour=hour, minute=minute, second=0)
                
                # Transaction type
                txn_type = random.choices(transaction_types, weights=transaction_weights)[0]
                
                # Amount based on transaction type
                if txn_type == 'withdrawal':
                    amount = random.choice([20, 50, 100, 200, 300, 500, 1000])
                elif txn_type == 'deposit':
                    amount = random.choice([50, 100, 200, 500, 1000, 2000])
                elif txn_type == 'allocation':
                    amount = random.randint(10000, 50000)
                else:  # balance_check
                    amount = 0
                
                # Vault ID - required field, assign based on ATM location
                # ATMs 1-3 use Vault 1, ATMs 4-6 use Vault 2
                vault_id = 1 if atm.id <= 3 else 2
                
                # Create transaction
                transaction = Transaction(
                    atm_id=atm.id,
                    vault_id=vault_id,
                    transaction_type=txn_type,
                    amount=amount,
                    timestamp=timestamp
                )
                db.session.add(transaction)
                transactions_created += 1
        
        current_date += timedelta(days=1)
    
    # Commit all transactions
    db.session.commit()
    
    print(f"\n✅ Created {transactions_created} transactions")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY BY ATM")
    print("=" * 80)
    
    for atm in atms:
        txn_count = Transaction.query.filter_by(atm_id=atm.id).count()
        withdrawals = Transaction.query.filter_by(atm_id=atm.id, transaction_type='withdrawal').count()
        deposits = Transaction.query.filter_by(atm_id=atm.id, transaction_type='deposit').count()
        allocations = Transaction.query.filter_by(atm_id=atm.id, transaction_type='allocation').count()
        
        print(f"\n{atm.name}:")
        print(f"  Total: {txn_count} transactions")
        print(f"  Withdrawals: {withdrawals}, Deposits: {deposits}, Allocations: {allocations}")
    
    # Overall stats
    print("\n" + "=" * 80)
    print("OVERALL STATISTICS")
    print("=" * 80)
    
    total = Transaction.query.count()
    by_type = {}
    for txn_type in transaction_types:
        count = Transaction.query.filter_by(transaction_type=txn_type).count()
        by_type[txn_type] = count
    
    print(f"\nTotal transactions: {total}")
    print(f"By type:")
    for txn_type, count in by_type.items():
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {txn_type}: {count} ({pct:.1f}%)")
    
    print("\n✅ Transactions generated successfully!")
    print("   The dashboard will now show realistic recent activity.")
