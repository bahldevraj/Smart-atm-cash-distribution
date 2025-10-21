import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Building, Banknote, TrendingUp, AlertTriangle, Play, Database, Settings } from 'lucide-react';

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

  // Fetch data
  const fetchData = async () => {
    try {
      const [vaultsRes, atmsRes, transactionsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/vaults`).then(r => r.json()),
        fetch(`${API_BASE}/atms`).then(r => r.json()),
        fetch(`${API_BASE}/transactions`).then(r => r.json()),
        fetch(`${API_BASE}/analytics/dashboard`).then(r => r.json())
      ]);
      
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
                  { id: 'optimization', label: 'Optimization', icon: Settings },
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
            {activeTab === 'optimization' && <OptimizationTab />}
            {activeTab === 'vaults' && <VaultManagement />}
            {activeTab === 'atms' && <ATMManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartATMDashboard;