#!/usr/bin/env python3
"""
Script to populate the demand_history table from transaction data.
"""

import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from app import DemandHistory, Transaction, ATM

def populate_demand_history():
    print("Starting demand history population...")

    # Create database engine
    engine = create_engine('sqlite:///instance/smart_atm.db')
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get all ATMs
        atms = session.query(ATM).all()
        print(f"Found {len(atms)} ATMs")

        total_records_created = 0

        for atm in atms:
            print(f"Processing ATM {atm.id}: {atm.name}")

            # Check if demand_history already exists
            existing_count = session.query(DemandHistory).filter_by(atm_id=atm.id).count()
            if existing_count > 0:
                print(f"  Skipping - already has {existing_count} records")
                continue

            # Get transactions
            transactions = session.query(Transaction).filter_by(atm_id=atm.id).order_by(Transaction.timestamp).all()

            if not transactions:
                print(f"  No transactions found")
                continue

            print(f"  Found {len(transactions)} transactions")

            # Group by date
            daily_demand = {}
            for tx in transactions:
                tx_date = tx.timestamp.date()
                daily_demand[tx_date] = daily_demand.get(tx_date, 0) + tx.amount

            # Create records
            demand_records = []
            for demand_date, demand_amount in sorted(daily_demand.items()):
                demand_record = DemandHistory(
                    atm_id=atm.id,
                    date=demand_date,
                    demand=demand_amount
                )
                demand_records.append(demand_record)

            # Insert
            if demand_records:
                session.add_all(demand_records)
                session.commit()
                print(f"  Created {len(demand_records)} records")
                total_records_created += len(demand_records)

        print(f"Total records created: {total_records_created}")

        # Verify
        total_demand_records = session.query(DemandHistory).count()
        print(f"Total demand history records: {total_demand_records}")

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    populate_demand_history()