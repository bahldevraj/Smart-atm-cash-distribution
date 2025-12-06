"""
Create Clean Training Dataset with Only Required Parameters
Extracts only: date, atm_id, total_demand from existing data
"""

import pandas as pd
import os

# Paths
INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_models', 'data', 'atm_demand_data.csv')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_models', 'data', 'atm_demand_clean.csv')

print("=" * 80)
print("CREATING CLEAN TRAINING DATASET")
print("=" * 80)

# Read full dataset
df = pd.read_csv(INPUT_FILE)
print(f"\n✓ Loaded {len(df)} records from original dataset")
print(f"  Date range: {df['date'].min()} to {df['date'].max()}")
print(f"  Original columns: {df.shape[1]}")

# Extract only required parameters
clean_df = df[['date', 'atm_id', 'total_demand']].copy()

# Convert date to proper format
clean_df['date'] = pd.to_datetime(clean_df['date'])

# Sort by ATM and date
clean_df = clean_df.sort_values(['atm_id', 'date'])

# Statistics
print(f"\n✓ Created clean dataset:")
print(f"  Columns: {list(clean_df.columns)}")
print(f"  Total records: {len(clean_df)}")
print(f"  ATMs: {clean_df['atm_id'].nunique()}")
print(f"  Records per ATM: {len(clean_df) // clean_df['atm_id'].nunique()}")

# Show sample
print(f"\n📊 Sample data:")
print(clean_df.head(10))

# Save clean dataset
clean_df.to_csv(OUTPUT_FILE, index=False)
print(f"\n✓ Saved clean dataset to: {OUTPUT_FILE}")

# Show statistics per ATM
print(f"\n📈 Demand Statistics by ATM:")
stats = clean_df.groupby('atm_id')['total_demand'].agg(['count', 'mean', 'min', 'max'])
stats.columns = ['Records', 'Avg Demand', 'Min Demand', 'Max Demand']
print(stats)

print("\n" + "=" * 80)
print("✓ CLEAN DATASET CREATED SUCCESSFULLY")
print("=" * 80)
print(f"\nDataset ready for training at: {OUTPUT_FILE}")
print("This dataset contains only essential parameters:")
print("  1. date - Time series index")
print("  2. atm_id - ATM identifier")
print("  3. total_demand - Target variable for prediction")
