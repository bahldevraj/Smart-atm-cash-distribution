"""
Data Generator for ATM Cash Demand Forecasting
Generates synthetic but realistic ATM transaction data with seasonal patterns
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json

class ATMDataGenerator:
    """Generate realistic synthetic ATM transaction data"""
    
    def __init__(self, num_atms=4, months=12, seed=42):
        """
        Initialize data generator
        
        Args:
            num_atms: Number of ATMs to generate data for
            months: Number of months of historical data
            seed: Random seed for reproducibility
        """
        self.num_atms = num_atms
        self.months = months
        self.seed = seed
        np.random.seed(seed)
        random.seed(seed)
        
        # ATM profiles with different characteristics
        self.atm_profiles = [
            {
                'id': 1,
                'name': 'ATM Mall Plaza',
                'location': 'Shopping Mall',
                'base_demand': 85000,
                'weekend_boost': 1.4,
                'holiday_boost': 1.6,
                'location_type': 'retail'
            },
            {
                'id': 2,
                'name': 'ATM University',
                'location': 'University Campus',
                'base_demand': 65000,
                'weekend_boost': 0.7,  # Lower on weekends
                'holiday_boost': 0.5,   # Very low on holidays
                'location_type': 'education'
            },
            {
                'id': 3,
                'name': 'ATM Airport',
                'location': 'International Airport',
                'base_demand': 150000,
                'weekend_boost': 1.3,
                'holiday_boost': 1.8,
                'location_type': 'transport'
            },
            {
                'id': 4,
                'name': 'ATM Hospital',
                'location': 'General Hospital',
                'base_demand': 45000,
                'weekend_boost': 1.0,  # Constant demand
                'holiday_boost': 1.0,
                'location_type': 'healthcare'
            }
        ]
    
    def _is_holiday(self, date):
        """Check if date is a holiday (simplified)"""
        # US Federal Holidays (simplified for demonstration)
        holidays = [
            (1, 1),   # New Year
            (7, 4),   # Independence Day
            (12, 25), # Christmas
            (11, 24), # Thanksgiving (approximate)
        ]
        return (date.month, date.day) in holidays
    
    def _is_month_end(self, date):
        """Check if date is near month end (last 3 days)"""
        next_day = date + timedelta(days=1)
        return next_day.month != date.month or date.day >= 28
    
    def _is_payday(self, date):
        """Check if date is typical payday (1st, 15th, last day of month)"""
        return date.day in [1, 15] or self._is_month_end(date)
    
    def generate_atm_data(self, atm_profile, start_date, end_date):
        """Generate transaction data for a single ATM"""
        
        data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Base demand with some random variation
            base = atm_profile['base_demand']
            random_factor = np.random.normal(1.0, 0.12)
            
            # Day of week patterns
            weekday = current_date.weekday()
            is_weekend = weekday >= 5
            weekend_factor = atm_profile['weekend_boost'] if is_weekend else 1.0
            
            # Holiday patterns
            is_holiday = self._is_holiday(current_date)
            holiday_factor = atm_profile['holiday_boost'] if is_holiday else 1.0
            
            # Month-end and payday boost
            month_end_factor = 1.3 if self._is_month_end(current_date) else 1.0
            payday_factor = 1.25 if self._is_payday(current_date) else 1.0
            
            # Seasonal trends (higher demand in November-December)
            month = current_date.month
            seasonal_factor = 1.2 if month in [11, 12] else (0.9 if month in [1, 2] else 1.0)
            
            # Long-term trend (slight increase over time)
            days_from_start = (current_date - start_date).days
            trend_factor = 1 + (days_from_start / 365) * 0.05  # 5% annual growth
            
            # Calculate final demand
            demand = (base * random_factor * weekend_factor * holiday_factor * 
                     month_end_factor * payday_factor * seasonal_factor * trend_factor)
            
            # Add some noise and ensure non-negative
            demand = max(0, demand + np.random.normal(0, base * 0.05))
            
            # Generate number of transactions (demand / avg transaction size)
            avg_transaction = np.random.normal(250, 50)
            num_transactions = int(demand / max(avg_transaction, 50))
            
            data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'atm_id': atm_profile['id'],
                'atm_name': atm_profile['name'],
                'location': atm_profile['location'],
                'location_type': atm_profile['location_type'],
                'total_demand': round(demand, 2),
                'num_transactions': num_transactions,
                'avg_transaction': round(demand / max(num_transactions, 1), 2),
                'day_of_week': weekday,
                'day_name': current_date.strftime('%A'),
                'is_weekend': int(is_weekend),
                'is_holiday': int(is_holiday),
                'is_month_end': int(self._is_month_end(current_date)),
                'is_payday': int(self._is_payday(current_date)),
                'month': month,
                'year': current_date.year,
                'day_of_month': current_date.day,
                'week_of_year': current_date.isocalendar()[1]
            })
            
            current_date += timedelta(days=1)
        
        return data
    
    def generate_all_atms(self):
        """Generate data for all ATMs"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30 * self.months)
        
        all_data = []
        
        for atm_profile in self.atm_profiles[:self.num_atms]:
            print(f"Generating data for {atm_profile['name']}...")
            atm_data = self.generate_atm_data(atm_profile, start_date, end_date)
            all_data.extend(atm_data)
        
        df = pd.DataFrame(all_data)
        return df
    
    def save_to_csv(self, filename='atm_demand_data.csv'):
        """Generate and save data to CSV"""
        df = self.generate_all_atms()
        filepath = f'ml_models/data/{filename}'
        df.to_csv(filepath, index=False)
        print(f"\n✓ Data saved to {filepath}")
        print(f"✓ Total records: {len(df)}")
        print(f"✓ Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"✓ ATMs: {df['atm_id'].nunique()}")
        return df
    
    def generate_summary_stats(self, df):
        """Generate summary statistics"""
        print("\n=== DATA SUMMARY ===")
        print(f"\nDataset shape: {df.shape}")
        print(f"\nDate range: {df['date'].min()} to {df['date'].max()}")
        print(f"\nATMs included:")
        for atm_id in df['atm_id'].unique():
            atm_name = df[df['atm_id'] == atm_id]['atm_name'].iloc[0]
            avg_demand = df[df['atm_id'] == atm_id]['total_demand'].mean()
            print(f"  - {atm_name}: Avg daily demand ${avg_demand:,.0f}")
        
        print(f"\nWeekday vs Weekend demand:")
        print(df.groupby('is_weekend')['total_demand'].mean())
        
        print(f"\nHoliday impact:")
        print(df.groupby('is_holiday')['total_demand'].mean())
        
        return df.describe()


if __name__ == "__main__":
    print("=== ATM Cash Demand Data Generator ===\n")
    
    # Generate 12 months of data for 4 ATMs
    generator = ATMDataGenerator(num_atms=4, months=12, seed=42)
    
    # Generate and save data
    df = generator.save_to_csv()
    
    # Show summary statistics
    stats = generator.generate_summary_stats(df)
    print("\n" + "="*50)
    print("Data generation complete!")
    print("="*50)
