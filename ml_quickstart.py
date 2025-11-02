"""
Quick Start Script for ML Forecasting System
Generates data and provides instructions for next steps
"""

import os
import sys

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f" {text}")
    print("=" * 70 + "\n")

def check_dependencies():
    """Check if required packages are installed"""
    print_header("STEP 1: Checking Dependencies")
    
    required_packages = {
        'pandas': 'pandas',
        'numpy': 'numpy',
        'sklearn': 'scikit-learn',
        'statsmodels': 'statsmodels'
    }
    
    optional_packages = {
        'tensorflow': 'tensorflow (for LSTM)',
        'prophet': 'prophet (Facebook Prophet)'
    }
    
    missing_required = []
    missing_optional = []
    
    print("Required packages:")
    for package, name in required_packages.items():
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} - MISSING")
            missing_required.append(name)
    
    print("\nOptional packages (recommended):")
    for package, name in optional_packages.items():
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ⚠ {name} - Not installed (some features will be unavailable)")
            missing_optional.append(name)
    
    if missing_required:
        print("\n❌ ERROR: Missing required packages!")
        print("\nInstall missing packages:")
        print("  pip install -r requirements.txt")
        return False
    
    if missing_optional:
        print("\n⚠ WARNING: Optional packages missing. Install for full functionality:")
        print("  pip install tensorflow prophet")
    
    print("\n✓ All required dependencies installed!")
    return True

def generate_data():
    """Generate synthetic ATM data"""
    print_header("STEP 2: Generating Synthetic Data")
    
    try:
        from ml_models.data_generator import ATMDataGenerator
        
        print("Generating 12 months of ATM transaction data...")
        print("  - 4 ATMs with different characteristics")
        print("  - Realistic patterns (weekends, holidays, seasonality)")
        print("  - ~1,460 data points (365 days × 4 ATMs)\n")
        
        generator = ATMDataGenerator(num_atms=4, months=12, seed=42)
        df = generator.save_to_csv()
        
        print("\n✓ Data generation complete!")
        print(f"  Location: ml_models/data/atm_demand_data.csv")
        print(f"  Records: {len(df):,}")
        print(f"  Date range: {df['date'].min()} to {df['date'].max()}")
        
        return True
    except Exception as e:
        print(f"\n❌ ERROR generating data: {e}")
        return False

def print_next_steps():
    """Print instructions for next steps"""
    print_header("NEXT STEPS")
    
    print("Your ML forecasting environment is ready! Follow these steps:\n")
    
    print("📊 STEP 3: Explore the Data (Week 1)")
    print("  1. Open Jupyter Notebook:")
    print("     jupyter notebook")
    print()
    print("  2. Open: notebooks/01_data_generation_and_EDA.ipynb")
    print("  3. Run all cells to perform exploratory data analysis")
    print("     - View data distributions")
    print("     - Identify patterns and seasonality")
    print("     - Generate visualizations")
    print()
    
    print("🤖 STEP 4: Train ML Models (Week 2-3)")
    print("  1. Open: notebooks/02_model_training.ipynb")
    print("  2. Run all cells to:")
    print("     - Train ARIMA model (baseline)")
    print("     - Train LSTM model (deep learning)")
    print("     - Train Prophet model (seasonality)")
    print("     - Create ensemble model")
    print("     - Compare performance")
    print("     - Save trained models")
    print()
    
    print("🚀 STEP 5: Use the API (Week 4)")
    print("  1. Integrate ML API with Flask backend:")
    print("     - Open backend/app.py")
    print("     - Add before 'if __name__ == \"__main__\":'")
    print()
    print("       from ml_api import register_ml_routes")
    print("       register_ml_routes(app)")
    print()
    print("  2. Start the server:")
    print("     cd backend")
    print("     python app.py")
    print()
    print("  3. Test API endpoints:")
    print("     POST http://localhost:5000/api/ml/forecast/1")
    print()
    
    print("📖 Documentation")
    print("  - Full guide: ML_FORECASTING_README.md")
    print("  - API examples included in README")
    print("  - Troubleshooting section available")
    print()
    
    print("✨ Features You'll Get:")
    print("  • 3 ML models + ensemble")
    print("  • 7-30 day forecasts")
    print("  • Model performance metrics (MAPE, RMSE, etc.)")
    print("  • Batch predictions for multiple ATMs")
    print("  • REST API for integration")
    print()

def main():
    """Main setup function"""
    print("\n" + "=" * 70)
    print(" " * 15 + "ML FORECASTING QUICK START")
    print("=" * 70)
    
    print("\nThis script will:")
    print("  1. Check dependencies")
    print("  2. Generate synthetic data")
    print("  3. Provide next steps for model training")
    
    input("\nPress Enter to continue...")
    
    # Step 1: Check dependencies
    if not check_dependencies():
        print("\nPlease install dependencies and run this script again.")
        return
    
    # Step 2: Generate data
    if not generate_data():
        print("\nData generation failed. Please check the error and try again.")
        return
    
    # Step 3: Show next steps
    print_next_steps()
    
    print("=" * 70)
    print("✓ Setup complete! Follow the next steps above to continue.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
