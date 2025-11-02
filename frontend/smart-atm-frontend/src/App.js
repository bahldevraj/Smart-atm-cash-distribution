import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Building, Banknote, TrendingUp, AlertTriangle, Play, Database, Settings, Brain, Calendar } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const SmartATMDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vaults, setVaults] = useState([]);
  const [atms, setAtms] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy');
  const [mlForecast, setMlForecast] = useState(null);
  const [mlMetrics, setMlMetrics] = useState(null);
  const [selectedATMForForecast, setSelectedATMForForecast] = useState(1);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [forecastDays, setForecastDays] = useState(7);

  // Fetch data
  const fetchData = async () => {
    try {
      const [vaultsRes, atmsRes, transactionsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/vaults`).then(r => r.json()),
        fetch(`${API_BASE}/atms`).then(r => r.json()),
        fetch(`${API_BASE}/transactions`).then(r => r.json()),
        fetch(`${API_BASE}/analytics/dashboard`).then(r => r.json())
      ]);
      
      console.log('✅ Data loaded:', {
        vaults: vaultsRes.length,
        atms: atmsRes.length,
        transactions: transactionsRes.transactions?.length || 0
      });
      console.log('ATMs:', atmsRes.map(a => `${a.id}. ${a.name}`).join(', '));
      
      setVaults(vaultsRes);
      setAtms(atmsRes);
      setTransactions(transactionsRes.transactions || []);
      setAnalytics(analyticsRes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Optimization
  const runOptimization = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: selectedAlgorithm })
      });
      const result = await response.json();
      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
    setLoading(false);
  };

  // Execute allocation
  const executeAllocation = async () => {
    if (!optimizationResult?.allocations) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/execute-allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: optimizationResult.allocations })
      });
      
      if (response.ok) {
        alert('Allocation executed successfully!');
        setOptimizationResult(null);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to execute allocation');
    }
    setLoading(false);
  };

  // ML Forecasting functions
  const fetchMLForecast = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ml/forecast/${selectedATMForForecast}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          days_ahead: forecastDays,
          model_type: selectedModel 
        })
      });
      const result = await response.json();
      if (response.ok) {
        setMlForecast(result);
      } else {
        alert(`ML Forecast Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('ML Forecast failed:', error);
      alert('ML API is not available. Please ensure the backend is running.');
    }
    setLoading(false);
  };

  const fetchMLMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/ml/models/metrics/${selectedATMForForecast}`);
      const result = await response.json();
      if (response.ok) {
        setMlMetrics(result);
      }
    } catch (error) {
      console.error('Failed to fetch ML metrics:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'ml-forecast') {
      fetchMLMetrics();
    }
  }, [activeTab, selectedATMForForecast]);

  // CRUD Operations
  const addVault = async (vaultData) => {
    try {
      const response = await fetch(`${API_BASE}/vaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultData)
      });
      if (response.ok) {
        fetchData();
        return true;
      }
    } catch (error) {
      console.error('Failed to add vault:', error);
    }
    return false;
  };

  const addATM = async (atmData) => {
    try {
      const response = await fetch(`${API_BASE}/atms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atmData)
      });
      if (response.ok) {
        fetchData();
        return true;
      }
    } catch (error) {
      console.error('Failed to add ATM:', error);
    }
    return false;
  };

  // Components
  const Dashboard = () => {
    if (!analytics) return <div className="p-8">Loading...</div>;

    const utilizationData = analytics.atm_utilization.map(atm => ({
      name: atm.name,
      utilization: atm.utilization,
      shortage: Math.max(0, atm.daily_demand - atm.current_balance)
    }));

    const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

    return (
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vaults</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_vaults}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total ATMs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_atms}</p>
              </div>
              <Database className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vault Balance</p>
                <p className="text-2xl font-bold text-gray-900">${(analytics.summary.total_vault_balance / 1000000).toFixed(1)}M</p>
              </div>
              <Banknote className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ATM Balance</p>
                <p className="text-2xl font-bold text-gray-900">${(analytics.summary.total_atm_balance / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">ATM Utilization & Shortages</h3>
            <BarChart width={400} height={300} data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilization" fill="#3B82F6" name="Utilization %" />
              <Bar dataKey="shortage" fill="#EF4444" name="Shortage ($)" />
            </BarChart>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {analytics.recent_transactions.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{tx.vault_name} → {tx.atm_name}</p>
                    <p className="text-sm text-gray-600">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="font-bold text-green-600">${tx.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OptimizationTab = () => (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Cash Allocation Optimizer</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Algorithm</label>
          <select 
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="greedy">Greedy Algorithm</option>
            <option value="linear_programming">Linear Programming</option>
          </select>
        </div>

        <button 
          onClick={runOptimization}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {loading ? 'Optimizing...' : 'Run Optimization'}
        </button>

        {optimizationResult && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">Optimization Results ({optimizationResult.algorithm})</h4>
              {optimizationResult.total_shortage > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Total Shortage: ${optimizationResult.total_shortage.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vault</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ATM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ATM Shortage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {optimizationResult.allocations.map((allocation, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{allocation.vault_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{allocation.atm_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">${allocation.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${allocation.shortage_before.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={executeAllocation}
              disabled={loading}
              className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
            >
              {loading ? 'Executing...' : 'Execute Allocation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const VaultManagement = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', location: '', capacity: '', current_balance: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const success = await addVault(formData);
      if (success) {
        setShowForm(false);
        setFormData({ name: '', location: '', capacity: '', current_balance: '' });
      }
    };

    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Vault Management</h3>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            {showForm ? 'Cancel' : 'Add Vault'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input
                placeholder="Vault Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Current Balance"
                value={formData.current_balance}
                onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <button type="submit" className="col-span-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
                Add Vault
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vaults.map((vault) => (
                <tr key={vault.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vault.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vault.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${vault.capacity.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${vault.current_balance.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{width: `${Math.min(100, (vault.current_balance / vault.capacity) * 100)}%`}}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{((vault.current_balance / vault.capacity) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const MLForecastTab = () => (
    <div className="p-6 space-y-6">
      {/* Header with ML icon */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8" />
          <h2 className="text-2xl font-bold">ML-Powered Cash Demand Forecasting</h2>
        </div>
        <p className="text-purple-100">Predict ATM cash demand using ARIMA, LSTM, and Ensemble models</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Forecast Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select ATM</label>
            <select 
              value={selectedATMForForecast}
              onChange={(e) => setSelectedATMForForecast(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {atms.map((atm) => (
                <option key={atm.id} value={atm.id}>
                  {atm.name} - {atm.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ML Model</label>
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="arima">ARIMA (Time Series)</option>
              <option value="lstm">LSTM (Deep Learning)</option>
              <option value="ensemble">Ensemble (Best of Both) 🏆</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forecast Days</label>
            <select 
              value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="3">3 Days</option>
              <option value="7">7 Days (Week)</option>
              <option value="14">14 Days (2 Weeks)</option>
              <option value="30">30 Days (Month)</option>
            </select>
          </div>
        </div>

        <button 
          onClick={fetchMLForecast}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md flex items-center gap-2 font-medium"
        >
          <Brain className="h-5 w-5" />
          {loading ? 'Generating Forecast...' : 'Generate ML Forecast'}
        </button>
      </div>

      {/* Model Performance Metrics */}
      {mlMetrics && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Model Performance Metrics (ATM {selectedATMForForecast})</h3>
          <p className="text-sm text-gray-600 mb-4">
            Best Model: <span className="font-bold text-purple-600">{mlMetrics.best_model}</span> 
            {' '}(MAPE: {mlMetrics.best_mape?.toFixed(2)}%)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(mlMetrics.metrics || {}).map(([modelName, metrics]) => (
              <div key={modelName} className={`p-4 rounded-lg border-2 ${
                modelName === mlMetrics.best_model 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900">{modelName.toUpperCase()}</h4>
                  {modelName === mlMetrics.best_model && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">BEST</span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">MAE:</span>
                    <span className="font-medium">{metrics.MAE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">RMSE:</span>
                    <span className="font-medium">{metrics.RMSE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MAPE:</span>
                    <span className="font-bold text-purple-600">{metrics.MAPE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">R²:</span>
                    <span className="font-medium">{metrics.R2}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Results */}
      {mlForecast && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
              <p className="text-sm font-medium text-gray-600">Model Used</p>
              <p className="text-xl font-bold text-gray-900">{mlForecast.model_type.toUpperCase()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-600">Total Demand</p>
              <p className="text-xl font-bold text-gray-900">{mlForecast.total_predicted_demand_formatted}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-600">Avg Daily</p>
              <p className="text-xl font-bold text-gray-900">{mlForecast.avg_daily_demand_formatted}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-600">Peak Demand</p>
              <p className="text-xl font-bold text-gray-900">${mlForecast.max_demand?.toLocaleString()}</p>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              {forecastDays}-Day Demand Forecast
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mlForecast.forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Predicted Demand']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="predicted_demand" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  name="Predicted Demand"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Forecast Table */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Daily Forecast Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Predicted Demand</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mlForecast.forecast.map((day, idx) => {
                    const isWeekend = day.day_of_week === 'Saturday' || day.day_of_week === 'Sunday';
                    const isHigh = day.predicted_demand > mlForecast.avg_daily_demand;
                    
                    return (
                      <tr key={idx} className={isWeekend ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {day.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {day.day_of_week}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">
                          {day.predicted_demand_formatted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isHigh 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isHigh ? 'High Demand' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ML Insights & Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  Total {forecastDays}-day demand: <strong>{mlForecast.total_predicted_demand_formatted}</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  Peak demand expected on: <strong>
                    {mlForecast.forecast.reduce((max, day) => 
                      day.predicted_demand > max.predicted_demand ? day : max
                    ).date}
                  </strong> ({mlForecast.forecast.reduce((max, day) => 
                    day.predicted_demand > max.predicted_demand ? day : max
                  ).day_of_week})
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  Recommended cash level: <strong>${(mlForecast.total_predicted_demand * 1.1).toLocaleString()}</strong> (with 10% safety buffer)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  Model accuracy (MAPE): <strong>{mlMetrics?.best_mape?.toFixed(2)}%</strong> - 
                  {mlMetrics?.best_mape < 20 ? ' Excellent accuracy!' : ' Good accuracy'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* No forecast message */}
      {!mlForecast && !loading && (
        <div className="bg-blue-50 border border-blue-200 p-8 rounded-lg text-center">
          <Brain className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Forecast Generated Yet
          </h3>
          <p className="text-gray-600">
            Select an ATM, choose a model, and click "Generate ML Forecast" to see predictions
          </p>
        </div>
      )}
    </div>
  );

  const TransactionHistoryTab = () => {
    const [historyData, setHistoryData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [loading, setLoading] = useState(false);
    
    // Filter states
    const [filterType, setFilterType] = useState('');
    const [filterATM, setFilterATM] = useState('');
    const [filterVault, setFilterVault] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [timePeriod, setTimePeriod] = useState('');
    
    // Sort states
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Section management states
    const [sections, setSections] = useState([]);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [newSection, setNewSection] = useState({ name: '', description: '', color: 'blue' });
    
    // CSV Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importSection, setImportSection] = useState('');
    const [importResult, setImportResult] = useState(null);
    
    const fetchTransactionHistory = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          per_page: perPage,
          sort_by: sortBy,
          sort_order: sortOrder
        });
        
        if (filterType) params.append('filter_type', filterType);
        if (filterATM) params.append('filter_atm_id', filterATM);
        if (filterVault) params.append('filter_vault_id', filterVault);
        if (filterSection) params.append('filter_section_id', filterSection);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (searchTerm) params.append('search', searchTerm);
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (timePeriod) params.append('time_period', timePeriod);
        
        const response = await fetch(`${API_BASE}/transactions/history?${params}`);
        const data = await response.json();
        
        setHistoryData(data.transactions);
        setSummary(data.summary);
        setTotalPages(data.pages);
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchSections = async () => {
      try {
        const response = await fetch(`${API_BASE}/transaction-sections`);
        const data = await response.json();
        setSections(data);
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      }
    };
    
    useEffect(() => {
      fetchTransactionHistory();
      fetchSections();
    }, [currentPage, perPage, sortBy, sortOrder, filterType, filterATM, filterVault, filterSection, dateFrom, dateTo, searchTerm, minAmount, maxAmount, timePeriod]);
    
    const handleClearFilters = () => {
      setFilterType('');
      setFilterATM('');
      setFilterVault('');
      setFilterSection('');
      setDateFrom('');
      setDateTo('');
      setSearchTerm('');
      setMinAmount('');
      setMaxAmount('');
      setTimePeriod('');
      setCurrentPage(1);
    };
    
    const handleCreateSection = async () => {
      if (!newSection.name) {
        alert('Section name is required');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/transaction-sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSection)
        });
        
        if (response.ok) {
          setShowSectionModal(false);
          setNewSection({ name: '', description: '', color: 'blue' });
          fetchSections();
          alert('Section created successfully!');
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to create section');
        }
      } catch (error) {
        console.error('Failed to create section:', error);
        alert('Failed to create section');
      }
    };
    
    const handleDeleteSection = async (sectionId) => {
      if (!window.confirm('Are you sure you want to delete this section?')) return;
      
      try {
        const response = await fetch(`${API_BASE}/transaction-sections/${sectionId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          fetchSections();
          alert('Section deleted successfully!');
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to delete section');
        }
      } catch (error) {
        console.error('Failed to delete section:', error);
        alert('Failed to delete section');
      }
    };
    
    const handleFileChange = (e) => {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
    };
    
    const handleImportCSV = async () => {
      if (!selectedFile) {
        alert('Please select a CSV file');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (importSection) {
        formData.append('section_id', importSection);
      }
      
      try {
        const response = await fetch(`${API_BASE}/transactions/import-csv`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setImportResult(data);
          setSelectedFile(null);
          fetchTransactionHistory();
          alert(`✅ Successfully imported ${data.imported_count} transactions!`);
        } else {
          alert(data.error || 'Failed to Import CSV');
        }
      } catch (error) {
        console.error('Failed to Import CSV:', error);
        alert('Failed to Import CSV');
      }
    };
    
    const handleExportCSV = () => {
      const params = new URLSearchParams();
      if (filterType) params.append('filter_type', filterType);
      if (filterATM) params.append('filter_atm_id', filterATM);
      if (filterVault) params.append('filter_vault_id', filterVault);
      if (filterSection) params.append('filter_section_id', filterSection);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (searchTerm) params.append('search', searchTerm);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      if (timePeriod) params.append('time_period', timePeriod);
      
      const url = `${API_BASE}/transactions/export-csv?${params}`;
      window.open(url, '_blank');
    };
    
    const handleSort = (column) => {
      if (sortBy === column) {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setSortBy(column);
        setSortOrder('desc');
      }
    };
    
    const getTypeColor = (type) => {
      switch(type) {
        case 'withdrawal': return 'bg-green-100 text-green-800';
        case 'deposit': return 'bg-blue-100 text-blue-800';
        case 'allocation': return 'bg-purple-100 text-purple-800';
        case 'balance_check': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    const getTypeIcon = (type) => {
      switch(type) {
        case 'withdrawal': return '🟢';
        case 'deposit': return '🔵';
        case 'allocation': return '🟣';
        case 'balance_check': return '⚪';
        default: return '⚪';
      }
    };
    
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">Transaction History</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSectionModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              📁 Manage Sections
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              � Import CSV
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              � Export CSV
            </button>
            <button 
              onClick={fetchTransactionHistory}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_transactions}</p>
              <p className="text-xs text-gray-500 mt-1">📊 All types</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">${summary.total_amount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">💰 Sum of all</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
              <p className="text-sm text-gray-600">🟢 Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_withdrawals}</p>
              <p className="text-sm text-green-700 font-semibold">${summary.withdrawal_amount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
              <p className="text-sm text-gray-600">🔵 Deposits</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_deposits}</p>
              <p className="text-sm text-blue-700 font-semibold">${summary.deposit_amount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
              <p className="text-sm text-gray-600">🟣 Allocations</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_allocations}</p>
              <p className="text-sm text-purple-700 font-semibold">${summary.allocation_amount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
              <p className="text-sm text-gray-600">Average Amount</p>
              <p className="text-2xl font-bold text-gray-900">${summary.avg_transaction.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">📈 Per transaction</p>
            </div>
          </div>
        )}
        
        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-lg font-semibold mb-4">🔍 Filters & Search</h4>
          
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by ATM name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Types</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="deposit">Deposit</option>
                <option value="allocation">Allocation</option>
                <option value="balance_check">Balance Check</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ATM</label>
              <select
                value={filterATM}
                onChange={(e) => setFilterATM(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All ATMs</option>
                {atms.map(atm => (
                  <option key={atm.id} value={atm.id}>{atm.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vault</label>
              <select
                value={filterVault}
                onChange={(e) => setFilterVault(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Vaults</option>
                {vaults.map(vault => (
                  <option key={vault.id} value={vault.id}>{vault.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📁 Section</label>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name} ({section.transaction_count})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          {/* Advanced Filters - Row 2 */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount ($)</label>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount ($)</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time of Day</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Times</option>
                <option value="morning">🌅 Morning (6 AM - 12 PM)</option>
                <option value="afternoon">☀️ Afternoon (12 PM - 6 PM)</option>
                <option value="evening">🌆 Evening (6 PM - 12 AM)</option>
                <option value="night">🌙 Night (12 AM - 6 AM)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick Amount Filters</label>
              <div className="flex gap-1">
                <button
                  onClick={() => { setMinAmount(''); setMaxAmount('100'); }}
                  className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                  title="Small transactions (< $100)"
                >
                  &lt; $100
                </button>
                <button
                  onClick={() => { setMinAmount('100'); setMaxAmount('1000'); }}
                  className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                  title="Medium transactions ($100-$1K)"
                >
                  $100-1K
                </button>
                <button
                  onClick={() => { setMinAmount('1000'); setMaxAmount(''); }}
                  className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                  title="Large transactions (> $1K)"
                >
                  &gt; $1K
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => { setDateFrom(new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]); setDateTo(new Date().toISOString().split('T')[0]); }}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => { setDateFrom(new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]); setDateTo(new Date().toISOString().split('T')[0]); }}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => { setFilterType('withdrawal'); }}
                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm"
              >
                🟢 Withdrawals
              </button>
              <button
                onClick={() => { setFilterType('allocation'); }}
                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md text-sm"
              >
                🟣 Allocations
              </button>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
        
        {/* Transaction Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('timestamp')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Date/Time {sortBy === 'timestamp' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    onClick={() => handleSort('atm_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    ATM {sortBy === 'atm_name' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vault
                  </th>
                  <th 
                    onClick={() => handleSort('type')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Type {sortBy === 'type' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    onClick={() => handleSort('amount')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : historyData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  historyData.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(txn.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {txn.atm_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {txn.vault_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(txn.transaction_type)}`}>
                          {getTypeIcon(txn.transaction_type)} {txn.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${txn.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{txn.id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Last
              </button>
            </div>
            
            {summary && (
              <div className="text-sm text-gray-600">
                📅 {summary.date_range}
              </div>
            )}
          </div>
        </div>
        
        {/* Section Management Modal */}
        {showSectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">📁 Manage Transaction Sections</h3>
              
              {/* Create New Section */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Create New Section</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Section Name (e.g., Training Data, Test Data)"
                    value={newSection.name}
                    onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newSection.description}
                    onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newSection.color}
                      onChange={(e) => setNewSection({...newSection, color: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="blue">🔵 Blue</option>
                      <option value="green">🟢 Green</option>
                      <option value="red">🔴 Red</option>
                      <option value="yellow">🟡 Yellow</option>
                      <option value="purple">🟣 Purple</option>
                      <option value="orange">🟠 Orange</option>
                    </select>
                    <button
                      onClick={handleCreateSection}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                      ➕ Create Section
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Existing Sections */}
              <div>
                <h4 className="font-semibold mb-2">Existing Sections ({sections.length})</h4>
                <div className="space-y-2">
                  {sections.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No sections created yet</p>
                  ) : (
                    sections.map(section => (
                      <div key={section.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                        <div>
                          <div className="font-medium">{section.name}</div>
                          <div className="text-sm text-gray-500">{section.description || 'No description'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {section.transaction_count} transactions • Created {new Date(section.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                          disabled={section.transaction_count > 0}
                          title={section.transaction_count > 0 ? 'Cannot delete section with transactions' : 'Delete section'}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowSectionModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Import CSV Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold mb-4">📤 Import Transactions from CSV</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CSV File Format Required:</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm font-mono">
                    <div className="font-semibold">Required columns:</div>
                    <div>atm_id, vault_id, amount, transaction_type, timestamp</div>
                    <div className="mt-2 font-semibold">Optional columns:</div>
                    <div>notes</div>
                    <div className="mt-2 text-gray-600">
                      Example: 1,1,500.00,withdrawal,2025-11-03 14:30:00
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Section (optional):</label>
                  <select
                    value={importSection}
                    onChange={(e) => setImportSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">No Section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File:</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">Selected: {selectedFile.name}</p>
                  )}
                </div>
                
                {importResult && (
                  <div className={`p-4 rounded-md ${importResult.imported_count > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="font-semibold">{importResult.message}</p>
                    <p className="text-sm">Imported: {importResult.imported_count} / {importResult.total_rows} rows</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Errors:</p>
                        <ul className="text-xs list-disc list-inside">
                          {importResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedFile(null);
                      setImportSection('');
                      setImportResult(null);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCSV}
                    disabled={!selectedFile}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📤 Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ATMManagement = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', location: '', capacity: '', current_balance: '', daily_avg_demand: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const success = await addATM(formData);
      if (success) {
        setShowForm(false);
        setFormData({ name: '', location: '', capacity: '', current_balance: '', daily_avg_demand: '' });
      }
    };

    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">ATM Management</h3>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            {showForm ? 'Cancel' : 'Add ATM'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input
                placeholder="ATM Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Current Balance"
                value={formData.current_balance}
                onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Daily Avg Demand"
                value={formData.daily_avg_demand}
                onChange={(e) => setFormData({...formData, daily_avg_demand: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2 col-span-2"
                required
              />
              <button type="submit" className="col-span-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
                Add ATM
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {atms.map((atm) => {
                const shortage = Math.max(0, atm.daily_avg_demand - atm.current_balance);
                const isLow = shortage > 0;
                return (
                  <tr key={atm.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{atm.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{atm.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${atm.current_balance.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${atm.daily_avg_demand.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {isLow ? `Low (-$${shortage.toLocaleString()})` : 'Adequate'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 text-blue-500 mr-2" />
              <span className="text-xl font-bold text-gray-900">Smart ATM Optimizer</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <div className="flex">
          <div className="w-64 bg-white shadow-sm min-h-screen">
            <nav className="mt-8">
              <div className="px-4 space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                  { id: 'ml-forecast', label: 'ML Forecast', icon: Brain },
                  { id: 'optimization', label: 'Optimization', icon: Settings },
                  { id: 'transaction-history', label: 'Transaction History', icon: Calendar },
                  { id: 'vaults', label: 'Vaults', icon: Building },
                  { id: 'atms', label: 'ATMs', icon: Database },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-4 py-2 text-left rounded-md transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'ml-forecast' && <MLForecastTab />}
            {activeTab === 'optimization' && <OptimizationTab />}
            {activeTab === 'transaction-history' && <TransactionHistoryTab />}
            {activeTab === 'vaults' && <VaultManagement />}
            {activeTab === 'atms' && <ATMManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartATMDashboard;
