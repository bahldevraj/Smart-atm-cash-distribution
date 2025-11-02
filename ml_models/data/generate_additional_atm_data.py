"""Generate synthetic data for ATMs 5 and 6"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
data_file = os.path.join(script_dir, 'atm_demand_data.csv')

# Load existing data to understand the pattern
df_existing = pd.read_csv(data_file)
print(f"Existing data shape: {df_existing.shape}")
print(f"Existing ATMs: {sorted(df_existing['atm_id'].unique())}")

# Get date range from existing data
start_date = pd.to_datetime(df_existing['date'].min())
end_date = pd.to_datetime(df_existing['date'].max())
date_range = pd.date_range(start=start_date, end=end_date, freq='D')

print(f"\nDate range: {start_date.date()} to {end_date.date()}")
print(f"Total days: {len(date_range)}")

# ATM configurations
atm_configs = [
    {
        'atm_id': 5,
        'atm_name': 'ATM Railway',
        'location': 'Railway Junction',
        'base_demand': 70000,  # High traffic, railway station
        'weekday_multiplier': 1.3,  # Higher on weekdays (commuters)
        'weekend_multiplier': 0.7,  # Lower on weekends
        'seasonality_amplitude': 15000,
        'noise_std': 8000
    },
    {
        'atm_id': 6,
        'atm_name': 'ATM DownTOwn',
        'location': 'DownTown City',
        'base_demand': 85000,  # Business district, high demand
        'weekday_multiplier': 1.4,  # Much higher on weekdays (business)
        'weekend_multiplier': 0.5,  # Much lower on weekends
        'seasonality_amplitude': 18000,
        'noise_std': 10000
    }
]

def generate_atm_data(config, date_range):
    """Generate synthetic demand data for an ATM"""
    data = []
    
    for i, date in enumerate(date_range):
        # Base demand
        demand = config['base_demand']
        
        # Day of week effect
        day_of_week = date.dayofweek
        is_weekend = day_of_week >= 5
        
        if is_weekend:
            demand *= config['weekend_multiplier']
        else:
            demand *= config['weekday_multiplier']
        
        # Seasonal trend (annual cycle)
        day_of_year = date.dayofyear
        seasonal = config['seasonality_amplitude'] * np.sin(2 * np.pi * day_of_year / 365)
        demand += seasonal
        
        # Monthly pattern (end of month spike)
        day_of_month = date.day
        if day_of_month >= 25:  # End of month
            demand *= 1.15
        elif day_of_month <= 5:  # Beginning of month
            demand *= 1.1
        
        # Add random noise
        noise = np.random.normal(0, config['noise_std'])
        demand += noise
        
        # Ensure positive values
        demand = max(demand, 10000)
        
        # Create record
        record = {
            'date': date.strftime('%Y-%m-%d'),
            'atm_id': config['atm_id'],
            'atm_name': config['atm_name'],
            'location': config['location'],
            'total_demand': round(demand, 2),
            'day_of_week': day_of_week,
            'is_weekend': int(is_weekend),
            'is_holiday': 0,  # Simplified - no holidays
            'month': date.month,
            'quarter': (date.month - 1) // 3 + 1,
            'year': date.year,
            'day_of_month': date.day,
            'week_of_year': date.isocalendar()[1],
            # Additional features
            'transactions': int(demand / 150),  # Avg transaction ~$150
            'withdrawals': round(demand * 0.85, 2),  # 85% withdrawals
            'deposits': round(demand * 0.15, 2),  # 15% deposits
            'avg_transaction': round(demand / (demand / 150), 2),
            'peak_hour_demand': round(demand * 0.35, 2)  # 35% in peak hours
        }
        
        data.append(record)
    
    return pd.DataFrame(data)

# Generate data for both ATMs
print("\nGenerating data for ATM 5 (Railway)...")
df_atm5 = generate_atm_data(atm_configs[0], date_range)
print(f"✓ Generated {len(df_atm5)} records for ATM Railway")
print(f"  Demand range: ${df_atm5['total_demand'].min():,.0f} - ${df_atm5['total_demand'].max():,.0f}")
print(f"  Mean demand: ${df_atm5['total_demand'].mean():,.0f}")

print("\nGenerating data for ATM 6 (DownTown)...")
df_atm6 = generate_atm_data(atm_configs[1], date_range)
print(f"✓ Generated {len(df_atm6)} records for ATM DownTown")
print(f"  Demand range: ${df_atm6['total_demand'].min():,.0f} - ${df_atm6['total_demand'].max():,.0f}")
print(f"  Mean demand: ${df_atm6['total_demand'].mean():,.0f}")

# Combine with existing data
df_new = pd.concat([df_atm5, df_atm6], ignore_index=True)
df_combined = pd.concat([df_existing, df_new], ignore_index=True)

# Sort by date and ATM ID
df_combined = df_combined.sort_values(['date', 'atm_id']).reset_index(drop=True)

print("\n" + "="*60)
print("Combined dataset:")
print(f"Total records: {len(df_combined)}")
print(f"ATMs: {sorted(df_combined['atm_id'].unique())}")
print(f"Records per ATM: {df_combined.groupby('atm_id').size().to_dict()}")

# Save the combined dataset
output_file = os.path.join(script_dir, 'atm_demand_data.csv')
df_combined.to_csv(output_file, index=False)
print(f"\n✓ Saved to {output_file}")

# Verify
print("\nVerification:")
for atm_id in sorted(df_combined['atm_id'].unique()):
    atm_data = df_combined[df_combined['atm_id'] == atm_id]
    atm_name = atm_data['atm_name'].iloc[0]
    print(f"  ATM {atm_id} ({atm_name}): {len(atm_data)} records, "
          f"Avg demand: ${atm_data['total_demand'].mean():,.0f}")

print("\n✓ Data generation complete!")
print(f"File saved at: {os.path.abspath(output_file)}")
