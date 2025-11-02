"""Verify all model files for all 6 ATMs"""
import os

path = r'C:\Users\bdevr\Project\smart-atm-system\ml_models\saved_models'
files = os.listdir(path)

atms = set()
for f in files:
    if 'atm_' in f:
        atm_num = f.split('atm_')[1].split('.')[0]
        atms.add(int(atm_num))

print(f'ATMs with models: {sorted(atms)}')
print(f'\nTotal files: {len(files)}')
print("\nModel files status:")
print("=" * 70)

for atm in sorted(atms):
    arima = f'arima_atm_{atm}.pkl' in files
    lstm = f'lstm_atm_{atm}.pkl' in files
    ensemble = f'ensemble_atm_{atm}.pkl' in files
    metrics = f'model_metrics_atm_{atm}.csv' in files
    
    status = "✓ COMPLETE" if all([arima, lstm, ensemble, metrics]) else "✗ INCOMPLETE"
    print(f'ATM {atm}: ARIMA={arima}, LSTM={lstm}, Ensemble={ensemble}, Metrics={metrics} - {status}')
