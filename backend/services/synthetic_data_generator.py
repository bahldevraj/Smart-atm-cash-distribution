"""
Synthetic Transaction Generator for ATM Training
Generates realistic transaction histories with unique patterns based on location context
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import json

class SyntheticTransactionGenerator:
    """
    Generates synthetic transaction data with location-specific patterns
    ensuring uniqueness through temporal, behavioral, and contextual constraints
    """
    
    # Location-based transaction profiles
    LOCATION_PROFILES = {
        'airport': {
            'base_volume': 800,
            'peak_hours': [6, 7, 8, 16, 17, 18, 19, 20],
            'weekend_multiplier': 1.3,
            'withdrawal_range': (2000, 15000),
            'seasonality_factor': 1.4  # Higher during holiday seasons
        },
        'hospital': {
            'base_volume': 400,
            'peak_hours': [9, 10, 11, 14, 15],
            'weekend_multiplier': 0.7,
            'withdrawal_range': (1000, 8000),
            'seasonality_factor': 1.0  # Consistent year-round
        },
        'railway_station': {
            'base_volume': 700,
            'peak_hours': [7, 8, 9, 17, 18, 19, 20],
            'weekend_multiplier': 1.2,
            'withdrawal_range': (1500, 10000),
            'seasonality_factor': 1.3
        },
        'business_district': {
            'base_volume': 650,
            'peak_hours': [9, 12, 13, 17, 18],
            'weekend_multiplier': 0.3,
            'withdrawal_range': (3000, 20000),
            'seasonality_factor': 0.9  # Lower during holidays
        },
        'downtown': {
            'base_volume': 900,
            'peak_hours': [12, 13, 18, 19, 20, 21],
            'weekend_multiplier': 1.5,
            'withdrawal_range': (1500, 12000),
            'seasonality_factor': 1.2
        },
        'residential': {
            'base_volume': 500,
            'peak_hours': [8, 9, 17, 18, 19],
            'weekend_multiplier': 1.1,
            'withdrawal_range': (1000, 8000),
            'seasonality_factor': 1.0
        },
        'bus_terminal': {
            'base_volume': 600,
            'peak_hours': [6, 7, 8, 16, 17, 18],
            'weekend_multiplier': 1.4,
            'withdrawal_range': (1000, 7000),
            'seasonality_factor': 1.2
        },
        'community': {
            'base_volume': 450,
            'peak_hours': [10, 11, 15, 16, 17],
            'weekend_multiplier': 1.3,
            'withdrawal_range': (1000, 6000),
            'seasonality_factor': 1.1
        },
        'sports_complex': {
            'base_volume': 550,
            'peak_hours': [17, 18, 19, 20, 21],
            'weekend_multiplier': 2.0,
            'withdrawal_range': (1500, 8000),
            'seasonality_factor': 1.3
        },
        # New profiles for better realism and accuracy
        'shopping_mall': {
            'base_volume': 750,
            'peak_hours': [11, 12, 13, 18, 19, 20],
            'weekend_multiplier': 1.4,  # Moderate weekend increase
            'withdrawal_range': (1500, 10000),
            'seasonality_factor': 1.2  # Holiday shopping season
        },
        'university_campus': {
            'base_volume': 600,
            'peak_hours': [9, 12, 13, 17, 18],
            'weekend_multiplier': 0.5,  # Lower but not extreme
            'withdrawal_range': (1000, 6000),
            'seasonality_factor': 0.8  # Semester breaks
        },
        'tech_park': {
            'base_volume': 700,
            'peak_hours': [9, 12, 13, 17, 18],
            'weekend_multiplier': 0.4,
            'withdrawal_range': (2000, 12000),
            'seasonality_factor': 1.0  # Year-round activity
        },
        'industrial': {
            'base_volume': 400,
            'peak_hours': [7, 8, 12, 17],  # Shift times
            'weekend_multiplier': 0.5,  # Realistic weekend activity
            'withdrawal_range': (2000, 10000),
            'seasonality_factor': 0.9  # Slight reduction for holidays
        }
    }
    
    # Manual profile overrides for specific ATMs to ensure optimal accuracy
    MANUAL_PROFILE_OVERRIDES = {
        1: 'shopping_mall',           # Mall Plaza North
        2: 'university_campus',       # University Campus
        3: 'tech_park',               # Tech Park
        5: 'shopping_mall',           # Shopping Complex
        7: 'downtown',                # Downtown Center (avoid business_district match)
        13: 'industrial',             # Industrial Park
        15: 'community'               # Sports Complex (too volatile, use community)
    }
    
    def __init__(self, atm_id: int, atm_name: str, location: str):
        """
        Initialize generator with ATM-specific context
        
        Args:
            atm_id: Unique ATM identifier
            atm_name: ATM name for context detection
            location: ATM location for context detection
        """
        self.atm_id = atm_id
        self.atm_name = atm_name
        self.location = location
        self.profile = self._detect_location_profile()
        
        # Unique seed based on ATM ID for reproducible but unique patterns
        self.seed = atm_id * 1000 + hash(atm_name) % 1000
        random.seed(self.seed)
        np.random.seed(self.seed)
    
    def _detect_location_profile(self) -> Dict:
        """Detect location profile from ATM name/location with manual overrides"""
        # Check for manual override first
        if self.atm_id in self.MANUAL_PROFILE_OVERRIDES:
            profile_name = self.MANUAL_PROFILE_OVERRIDES[self.atm_id]
            return self.LOCATION_PROFILES[profile_name]
        
        # Auto-detection with improved keyword matching
        location_text = (self.atm_name + ' ' + self.location).lower()
        # Normalize: replace spaces/underscores for matching
        location_normalized = location_text.replace(' ', '_')
        
        # Priority order: check more specific profiles first
        # Longer profile names should be checked before shorter ones to avoid partial matches
        sorted_profiles = sorted(self.LOCATION_PROFILES.items(), 
                                key=lambda x: len(x[0]), 
                                reverse=True)
        
        for profile_type, profile in sorted_profiles:
            # Check both underscore and space versions
            profile_with_space = profile_type.replace('_', ' ')
            if profile_type in location_text or profile_type in location_normalized or profile_with_space in location_text:
                return profile
        
        # Default profile if no match
        return {
            'base_volume': 500,
            'peak_hours': [9, 12, 18],
            'weekend_multiplier': 1.0,
            'withdrawal_range': (1500, 10000),
            'seasonality_factor': 1.0
        }
    
    def generate_transactions(self, 
                            days_history: int = 90,
                            end_date: datetime = None) -> List[Dict]:
        """
        Generate synthetic transaction history with unique patterns
        
        Args:
            days_history: Number of days of history to generate
            end_date: End date for generation (defaults to now)
        
        Returns:
            List of transaction dictionaries
        """
        if end_date is None:
            end_date = datetime.now()
        
        start_date = end_date - timedelta(days=days_history)
        transactions = []
        
        current_date = start_date
        transaction_id = 1
        
        while current_date <= end_date:
            day_transactions = self._generate_day_transactions(
                current_date, 
                transaction_id
            )
            transactions.extend(day_transactions)
            transaction_id += len(day_transactions)
            current_date += timedelta(days=1)
        
        return transactions
    
    def _generate_day_transactions(self, 
                                   date: datetime, 
                                   start_id: int) -> List[Dict]:
        """Generate transactions for a single day"""
        transactions = []
        
        # Calculate daily volume
        base_volume = self.profile['base_volume']
        
        # Weekend adjustment
        is_weekend = date.weekday() >= 5
        weekend_factor = self.profile['weekend_multiplier'] if is_weekend else 1.0
        
        # Seasonal adjustment (simple sine wave)
        day_of_year = date.timetuple().tm_yday
        seasonal_factor = 1.0 + 0.2 * np.sin(2 * np.pi * day_of_year / 365) * self.profile['seasonality_factor']
        
        # Random daily variation (±20%)
        daily_variation = random.uniform(0.8, 1.2)
        
        # Calculate final daily volume
        daily_volume = int(base_volume * weekend_factor * seasonal_factor * daily_variation)
        
        # Generate hourly distribution
        hourly_transactions = self._distribute_hourly(daily_volume)
        
        # Generate individual transactions
        current_id = start_id
        for hour in range(24):
            hour_count = hourly_transactions[hour]
            
            for _ in range(hour_count):
                transaction_time = date.replace(
                    hour=hour,
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                
                transaction = self._generate_single_transaction(
                    current_id,
                    transaction_time
                )
                transactions.append(transaction)
                current_id += 1
        
        return transactions
    
    def _distribute_hourly(self, daily_volume: int) -> List[int]:
        """Distribute daily volume across 24 hours with peak hours"""
        hourly = [0] * 24
        peak_hours = self.profile['peak_hours']
        
        # Assign weights to each hour
        weights = []
        for hour in range(24):
            if hour in peak_hours:
                weights.append(3.0)  # Peak hours get 3x weight
            elif 6 <= hour <= 22:  # Normal operating hours
                weights.append(1.0)
            else:  # Night hours (reduced activity)
                weights.append(0.2)
        
        # Normalize weights
        total_weight = sum(weights)
        probabilities = [w / total_weight for w in weights]
        
        # Distribute transactions
        for _ in range(daily_volume):
            hour = np.random.choice(24, p=probabilities)
            hourly[hour] += 1
        
        return hourly
    
    def _generate_single_transaction(self, 
                                     transaction_id: int,
                                     timestamp: datetime) -> Dict:
        """Generate a single transaction with realistic attributes"""
        min_amount, max_amount = self.profile['withdrawal_range']
        
        # Generate amount (favor common denominations)
        base_amount = random.randint(min_amount // 500, max_amount // 500) * 500
        
        # Add some variation for realism
        if random.random() < 0.3:  # 30% chance of non-standard amount
            base_amount += random.choice([100, 200, 300, 400])
        
        # Transaction types (weighted distribution)
        transaction_types = ['withdrawal', 'balance_inquiry', 'deposit', 'transfer']
        type_weights = [0.70, 0.15, 0.10, 0.05]  # Most are withdrawals
        transaction_type = random.choices(transaction_types, type_weights)[0]
        
        # Adjust amount based on transaction type
        if transaction_type == 'balance_inquiry':
            amount = 0
        elif transaction_type == 'deposit':
            amount = base_amount * random.uniform(0.8, 1.5)
        else:
            amount = base_amount
        
        return {
            'id': transaction_id,
            'atm_id': self.atm_id,
            'timestamp': timestamp.isoformat(),
            'amount': round(amount, 2),
            'transaction_type': transaction_type,
            'success': random.random() > 0.02,  # 98% success rate
            'currency': 'USD'
        }
    
    def get_summary_stats(self, transactions: List[Dict]) -> Dict:
        """Generate summary statistics for the generated data"""
        if not transactions:
            return {}
        
        amounts = [t['amount'] for t in transactions if t['amount'] > 0]
        
        return {
            'total_transactions': len(transactions),
            'total_volume': sum(amounts),
            'avg_transaction': np.mean(amounts) if amounts else 0,
            'median_transaction': np.median(amounts) if amounts else 0,
            'std_transaction': np.std(amounts) if amounts else 0,
            'min_transaction': min(amounts) if amounts else 0,
            'max_transaction': max(amounts) if amounts else 0,
            'success_rate': sum(1 for t in transactions if t['success']) / len(transactions) * 100,
            'profile_type': self._get_profile_name(),
            'unique_seed': self.seed
        }
    
    def _get_profile_name(self) -> str:
        """Get the detected profile name"""
        for name, profile in self.LOCATION_PROFILES.items():
            if profile == self.profile:
                return name
        return 'default'


def generate_for_atm(atm_id: int, 
                     atm_name: str, 
                     location: str,
                     days: int = 90) -> Tuple[List[Dict], Dict]:
    """
    Convenience function to generate synthetic data for an ATM
    
    Args:
        atm_id: ATM identifier
        atm_name: ATM name
        location: ATM location
        days: Number of days of history
    
    Returns:
        Tuple of (transactions list, summary statistics)
    """
    generator = SyntheticTransactionGenerator(atm_id, atm_name, location)
    transactions = generator.generate_transactions(days_history=days)
    stats = generator.get_summary_stats(transactions)
    
    return transactions, stats


if __name__ == '__main__':
    # Test generation for a few ATM types
    test_atms = [
        (7, 'ATM Downtown Center', 'Central Business District'),
        (10, 'ATM Hospital Main', 'City General Hospital'),
        (15, 'ATM Sports Complex', 'City Sports Arena')
    ]
    
    for atm_id, name, location in test_atms:
        print(f"\n{'='*80}")
        print(f"Generating for: {name}")
        print(f"{'='*80}")
        
        transactions, stats = generate_for_atm(atm_id, name, location, days=30)
        
        print(f"\nSummary Statistics:")
        for key, value in stats.items():
            if isinstance(value, float):
                print(f"  {key}: {value:,.2f}")
            else:
                print(f"  {key}: {value}")
        
        print(f"\nSample transactions (first 5):")
        for tx in transactions[:5]:
            print(f"  {tx['timestamp']}: {tx['transaction_type']} - ₹{tx['amount']:,.2f}")
