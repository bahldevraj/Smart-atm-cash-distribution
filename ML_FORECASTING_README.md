# ML-Based Cash Demand Forecasting

## Overview
Advanced machine learning system for predicting ATM cash demand using multiple forecasting models (ARIMA, LSTM, Prophet) with ensemble capability.

## 📋 Project Structure

```
smart-atm-system/
├── ml_models/
│   ├── data/
│   │   └── atm_demand_data.csv          # Generated synthetic data
│   ├── saved_models/
│   │   ├── arima_atm_*.pkl              # Trained ARIMA models
│   │   ├── lstm_atm_*.pkl               # Trained LSTM models
│   │   ├── prophet_atm_*.pkl            # Trained Prophet models
│   │   ├── ensemble_atm_*.pkl           # Ensemble models
│   │   └── model_metrics_atm_*.csv      # Performance metrics
│   ├── data_generator.py                # Synthetic data generation
│   └── forecasting_models.py            # ML model implementations
├── notebooks/
│   ├── 01_data_generation_and_EDA.ipynb # Week 1: Data & EDA
│   └── 02_model_training.ipynb          # Week 2-3: Model training
├── backend/
│   ├── app.py                           # Main Flask app
│   └── ml_api.py                        # ML forecasting API endpoints
└── requirements.txt                      # Python dependencies
```

## 🎯 Features

### Week 1: Data Collection & Preprocessing
- ✅ Synthetic data generator with realistic patterns
- ✅ 12 months of historical data (4 ATMs)
- ✅ Features: timestamp, ATM_id, amount, day_of_week, is_holiday, etc.
- ✅ Comprehensive EDA in Jupyter notebook

### Week 2-3: ML Model Development
- ✅ **ARIMA** - Classical statistical baseline model
- ✅ **LSTM** - Deep learning time series model
- ✅ **Facebook Prophet** - Handles seasonality well
- ✅ **Ensemble Model** - Combines all three models
- ✅ Train-test split (80-20)
- ✅ Hyperparameter tuning

### Week 4: Model Evaluation & API
- ✅ Metrics: MAPE, RMSE, MAE, R²
- ✅ REST API endpoints for predictions
- ✅ Model comparison dashboard
- ✅ Batch prediction support

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd smart-atm-system
pip install -r requirements.txt
```

**Note:** Prophet may require additional dependencies:
```bash
# Windows
pip install prophet

# Mac/Linux
pip install prophet

# If issues occur, install via conda:
conda install -c conda-forge prophet
```

### 2. Generate Data & Run EDA

Open Jupyter Notebook:
```bash
jupyter notebook
```

Navigate to `notebooks/01_data_generation_and_EDA.ipynb` and run all cells to:
- Generate 12 months of synthetic ATM transaction data
- Perform exploratory data analysis
- Identify patterns and seasonality

### 3. Train ML Models

Open `notebooks/02_model_training.ipynb` and run all cells to:
- Train ARIMA, LSTM, and Prophet models
- Create ensemble model
- Evaluate and compare performance
- Save trained models to `ml_models/saved_models/`

### 4. Start the API Server

Integrate ML API with Flask backend:

```python
# In backend/app.py, add at the end before if __name__ == '__main__':

from ml_api import register_ml_routes
register_ml_routes(app)
```

Start the server:
```bash
cd backend
python app.py
```

## 📡 API Endpoints

### Base URL: `http://localhost:5000/api/ml`

### 1. Single ATM Forecast
```http
POST /api/ml/forecast/<atm_id>
Content-Type: application/json

{
  "days_ahead": 7,
  "model_type": "ensemble"  # or "arima", "lstm", "prophet"
}
```

**Response:**
```json
{
  "atm_id": 1,
  "model_type": "ensemble",
  "forecast": [
    {
      "date": "2025-11-04",
      "predicted_demand": 87500.50,
      "day_of_week": "Monday"
    },
    ...
  ],
  "total_predicted_demand": 612503.50,
  "avg_daily_demand": 87500.50
}
```

### 2. Compare All Models
```http
POST /api/ml/forecast/compare/<atm_id>
Content-Type: application/json

{
  "days_ahead": 7
}
```

### 3. Batch Forecast (Multiple ATMs)
```http
POST /api/ml/forecast/batch
Content-Type: application/json

{
  "atm_ids": [1, 2, 3, 4],
  "days_ahead": 7,
  "model_type": "ensemble"
}
```

### 4. Model Status
```http
GET /api/ml/models/status
```

**Response:**
```json
{
  "available_models": ["arima_atm_1.pkl", "lstm_atm_1.pkl", ...],
  "total_models": 12,
  "loaded_models": ["ensemble_atm_1", ...]
}
```

### 5. Model Metrics
```http
GET /api/ml/models/metrics/<atm_id>
```

**Response:**
```json
{
  "atm_id": 1,
  "metrics": {
    "ARIMA": {"MAE": 5234.12, "RMSE": 6789.45, "MAPE": 6.15, "R2": 0.8945},
    "LSTM": {"MAE": 4891.23, "RMSE": 6234.67, "MAPE": 5.72, "R2": 0.9124},
    "Prophet": {"MAE": 5012.34, "RMSE": 6456.78, "MAPE": 5.89, "R2": 0.9023}
  },
  "best_model": "LSTM",
  "best_mape": 5.72
}
```

### 6. Health Check
```http
GET /api/ml/health
```

## 📊 Model Performance

### Evaluation Metrics Explained

- **MAE (Mean Absolute Error)** - Average prediction error in dollars
- **RMSE (Root Mean Squared Error)** - Penalizes large errors more heavily
- **MAPE (Mean Absolute Percentage Error)** - Percentage prediction error
- **R² (R-squared)** - How well the model explains variance (0-1, higher is better)

### Typical Performance (Example)

| Model    | MAE ($) | RMSE ($) | MAPE (%) | R²    | Training Time |
|----------|---------|----------|----------|-------|---------------|
| ARIMA    | 5,234   | 6,789    | 6.15     | 0.895 | ~2 min        |
| LSTM     | 4,891   | 6,235    | 5.72     | 0.912 | ~5 min        |
| Prophet  | 5,012   | 6,457    | 5.89     | 0.902 | ~3 min        |
| Ensemble | 4,756   | 6,123    | 5.61     | 0.918 | Instant*      |

*Ensemble predictions use pre-trained models

### When to Use Each Model

- **ARIMA**: Fast, interpretable, good for stable patterns
- **LSTM**: Best for complex patterns, longer-term dependencies
- **Prophet**: Excellent for strong seasonality and holidays
- **Ensemble**: Most robust, combines strengths of all models

## 🔬 Data Features

The synthetic data includes realistic patterns:

- **Temporal Features**: day_of_week, month, week_of_year
- **Binary Flags**: is_weekend, is_holiday, is_month_end, is_payday
- **Transaction Metrics**: total_demand, num_transactions, avg_transaction
- **Location Context**: ATM type (retail, education, transport, healthcare)

### Pattern Examples

- **Weekend Effect**: Retail ATMs see 40% higher demand
- **Holiday Boost**: Airport ATMs see 80% increase
- **Payday Spikes**: 25% increase on 1st, 15th, and month-end
- **Seasonal Trends**: 20% higher in Nov-Dec (holiday season)

## 🎓 Usage Examples

### Example 1: Get 7-Day Forecast with Ensemble Model

```python
import requests

response = requests.post(
    'http://localhost:5000/api/ml/forecast/1',
    json={'days_ahead': 7, 'model_type': 'ensemble'}
)

forecast = response.json()
print(f"Total predicted demand: ${forecast['total_predicted_demand']:,.2f}")

for day in forecast['forecast']:
    print(f"{day['date']} ({day['day_of_week']}): ${day['predicted_demand']:,.2f}")
```

### Example 2: Compare All Models

```python
response = requests.post(
    'http://localhost:5000/api/ml/forecast/compare/1',
    json={'days_ahead': 7}
)

comparison = response.json()

for model_name, results in comparison['models'].items():
    if 'error' not in results:
        print(f"{model_name}: Total = ${results['total']:,.2f}")
```

### Example 3: Batch Forecast for Multiple ATMs

```python
response = requests.post(
    'http://localhost:5000/api/ml/forecast/batch',
    json={
        'atm_ids': [1, 2, 3, 4],
        'days_ahead': 7,
        'model_type': 'ensemble'
    }
)

batch_results = response.json()

for atm_id, forecast in batch_results['forecasts'].items():
    if 'error' not in forecast:
        print(f"ATM {atm_id}: ${forecast['total_predicted']:,.2f}")
```

## 🛠️ Troubleshooting

### Issue: "Model not found for ATM X"
**Solution**: Train models using `notebooks/02_model_training.ipynb` first.

### Issue: "TensorFlow not available"
**Solution**: 
```bash
pip install tensorflow==2.13.0
# Or use CPU-only version:
pip install tensorflow-cpu==2.13.0
```

### Issue: "Prophet installation fails"
**Solution**: Use conda instead:
```bash
conda install -c conda-forge prophet
```

### Issue: "CUDA errors with TensorFlow"
**Solution**: Install CPU-only version or ensure GPU drivers are updated.

## 📈 Future Enhancements

- [ ] Real-time model retraining pipeline
- [ ] Automated hyperparameter optimization
- [ ] Anomaly detection for unusual demand patterns
- [ ] Weather data integration
- [ ] Multi-step ahead uncertainty quantification
- [ ] Model interpretability dashboard (SHAP values)
- [ ] A/B testing framework for model deployment

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional forecasting models (XGBoost, Neural Prophet)
- Feature engineering enhancements
- Model serving optimization
- Frontend dashboard for visualizations

## 📝 License

This project is part of the Smart ATM Cash Optimizer system.

## 📧 Support

For questions or issues:
1. Check troubleshooting section
2. Review Jupyter notebooks for examples
3. Test API endpoints with provided examples

---

**Built with:** Python, TensorFlow, Prophet, ARIMA, Flask, Scikit-learn
