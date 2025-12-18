import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ResponsiveContainer,
} from "recharts";
import {
    Building,
    Banknote,
    TrendingUp,
    AlertTriangle,
    Play,
    Database,
    Settings,
    Brain,
    Calendar,
    Truck,
    Map,
    Route,
    Sparkles,
    Target,
    Activity,
    Zap,
    Upload,
    Download,
    LogOut,
    User,
    Shield,
    UserCog,
    Maximize,
    Gauge,
} from "lucide-react";
import VehicleManagement from "./VehicleManagement";
import RoutePlanning from "./RoutePlanning";
import RouteDashboard from "./RouteDashboard";
import AccessControl from "./AccessControl";
import AuthPage from "./AuthPage";
import ModelTrainingModal from "./ModelTrainingModal";
import SyntheticDataGenerator from "./SyntheticDataGenerator";
import MetricsModal from "./MetricsModal";
import ProfileManager from "./ProfileManager";

console.log("Routing components loaded:", {
    VehicleManagement: !!VehicleManagement,
    RoutePlanning: !!RoutePlanning,
    RouteDashboard: !!RouteDashboard,
});

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SmartATMDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [vaults, setVaults] = useState([]);
    const [atms, setAtms] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState("greedy");
    const [mlForecast, setMlForecast] = useState(null);
    const [mlMetrics, setMlMetrics] = useState(null);
    const [selectedATMForForecast, setSelectedATMForForecast] = useState(1);
    const [selectedModel, setSelectedModel] = useState("ensemble");
    const [forecastDays, setForecastDays] = useState(7);

    // AI Recommendations state
    const [criticalATMs, setCriticalATMs] = useState([]);
    const [aiLoading, setAILoading] = useState(false);
    const [whatIfScenario, setWhatIfScenario] = useState(null);
    const [selectedScenarioType, setSelectedScenarioType] =
        useState("emergency");

    // Fetch data - memoized to prevent recreation
    const fetchData = useCallback(async () => {
        try {
            // Add cache busting timestamp
            const timestamp = new Date().getTime();
            const [vaultsRes, atmsRes, transactionsRes, analyticsRes] =
                await Promise.all([
                    fetch(`${API_BASE}/vaults?_=${timestamp}`).then((r) => r.json()),
                    fetch(`${API_BASE}/atms?_=${timestamp}`).then((r) => r.json()),
                    fetch(`${API_BASE}/transactions?_=${timestamp}`).then((r) => r.json()),
                    fetch(`${API_BASE}/analytics/dashboard?_=${timestamp}`).then((r) =>
                        r.json()
                    ),
                ]);

            console.log("✅ Data loaded:", {
                vaults: vaultsRes.length,
                atms: atmsRes.length,
                transactions: transactionsRes.transactions?.length || 0,
            });
            console.log(
                "ATMs:",
                atmsRes.map((a) => `${a.id}. ${a.name} - Profile: ${a.detected_profile || 'auto'}`).join(", ")
            );

            setVaults(vaultsRes);
            setAtms(atmsRes);
            setTransactions(transactionsRes.transactions || []);
            setAnalytics(analyticsRes);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    // Optimization - memoized
    const runOptimization = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ algorithm: selectedAlgorithm }),
            });
            const result = await response.json();
            setOptimizationResult(result);
        } catch (error) {
            console.error("Optimization failed:", error);
        }
        setLoading(false);
    }, [selectedAlgorithm]);

    // Execute allocation - memoized
    const executeAllocation = useCallback(async () => {
        if (!optimizationResult?.allocations) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/execute-allocation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    allocations: optimizationResult.allocations,
                }),
            });

            if (response.ok) {
                alert("Allocation executed successfully!");
                setOptimizationResult(null);
                fetchData();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert("Failed to execute allocation");
        }
        setLoading(false);
    }, [optimizationResult, fetchData]);

    // ML Forecasting functions - memoized
    const fetchMLForecast = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE}/ml/forecast/${selectedATMForForecast}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        days_ahead: forecastDays,
                        model_type: selectedModel,
                    }),
                }
            );
            const result = await response.json();
            if (response.ok) {
                setMlForecast(result);
                // Refresh metrics after successful forecast
                fetchMLMetrics();
            } else {
                alert(`ML Forecast Error: ${result.message || result.error}`);
            }
        } catch (error) {
            console.error("ML Forecast failed:", error);
            alert(
                "ML API is not available. Please ensure the backend is running."
            );
        }
        setLoading(false);
    }, [selectedATMForForecast, forecastDays, selectedModel]);

    const fetchMLMetrics = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_BASE}/ml/models/metrics/${selectedATMForForecast}`
            );
            const result = await response.json();
            if (response.ok) {
                setMlMetrics(result);
            }
        } catch (error) {
            console.error("Failed to fetch ML metrics:", error);
        }
    }, [selectedATMForForecast]);

    useEffect(() => {
        if (activeTab === "ml-forecast") {
            fetchMLMetrics();
        }
    }, [activeTab, selectedATMForForecast, fetchMLMetrics]);

    // CRUD Operations - memoized
    const addVault = useCallback(
        async (vaultData) => {
            try {
                const response = await fetch(`${API_BASE}/vaults`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(vaultData),
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to add vault:", error);
            }
            return false;
        },
        [fetchData]
    );

    const updateVault = useCallback(
        async (vaultId, vaultData) => {
            try {
                const response = await fetch(`${API_BASE}/vaults/${vaultId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(vaultData),
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to update vault:", error);
            }
            return false;
        },
        [fetchData]
    );

    const deleteVault = useCallback(
        async (vaultId) => {
            if (
                !window.confirm("Are you sure you want to delete this vault?")
            ) {
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/vaults/${vaultId}`, {
                    method: "DELETE",
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to delete vault:", error);
            }
            return false;
        },
        [fetchData]
    );

    const addATM = useCallback(
        async (atmData) => {
            try {
                const response = await fetch(`${API_BASE}/atms`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(atmData),
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to add ATM:", error);
            }
            return false;
        },
        [fetchData]
    );

    const updateATM = useCallback(
        async (atmId, atmData) => {
            try {
                const response = await fetch(`${API_BASE}/atms/${atmId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(atmData),
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to update ATM:", error);
            }
            return false;
        },
        [fetchData]
    );

    const deleteATM = useCallback(
        async (atmId) => {
            if (!window.confirm("Are you sure you want to delete this ATM?")) {
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/atms/${atmId}`, {
                    method: "DELETE",
                });
                if (response.ok) {
                    fetchData();
                    return true;
                }
            } catch (error) {
                console.error("Failed to delete ATM:", error);
            }
            return false;
        },
        [fetchData]
    );

    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token && user) {
            setIsAuthenticated(true);
            setCurrentUser(JSON.parse(user));
        }
    }, []);

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
        };
    };

    // Handle login
    const handleLogin = (token, user) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setIsAuthenticated(true);
        setCurrentUser(user);
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setCurrentUser(null);
        setActiveTab("dashboard");
    };

    // Components
    const Dashboard = () => {
        const [animateVaults, setAnimateVaults] = useState(false);

        useEffect(() => {
            // Trigger vault animation after component mounts
            const timer = setTimeout(() => setAnimateVaults(true), 100);
            return () => clearTimeout(timer);
        }, []);

        // Memoize expensive computations (must be before any early returns)
        const utilizationData = useMemo(
            () =>
                analytics?.atm_utilization?.map((atm) => ({
                    name: atm.name.replace("ATM ", ""),
                    utilization: atm.utilization,
                    balance: atm.current_balance / 1000,
                    capacity: atm.capacity / 1000,
                })) || [],
            [analytics]
        );

        // ATM Status Distribution - memoized
        const atmStatusData = useMemo(
            () =>
                analytics?.atm_utilization?.reduce(
                    (acc, atm) => {
                        const utilizationPct =
                            (atm.current_balance / atm.capacity) * 100;
                        if (utilizationPct < 20) acc.critical++;
                        else if (utilizationPct < 50) acc.warning++;
                        else acc.healthy++;
                        return acc;
                    },
                    { healthy: 0, warning: 0, critical: 0 }
                ) || { healthy: 0, warning: 0, critical: 0 },
            [analytics]
        );

        const statusPieData = useMemo(
            () => [
                {
                    name: "Healthy (>50%)",
                    value: atmStatusData.healthy,
                    color: "#10B981",
                },
                {
                    name: "Warning (20-50%)",
                    value: atmStatusData.warning,
                    color: "#F59E0B",
                },
                {
                    name: "Critical (<20%)",
                    value: atmStatusData.critical,
                    color: "#EF4444",
                },
            ],
            [atmStatusData]
        );

        // Vault Balance Distribution - memoized
        const vaultBalanceData = useMemo(
            () =>
                vaults.map((vault) => ({
                    name: vault.name
                        .replace("Vault - ", "")
                        .replace("Main Vault - ", ""),
                    balance: vault.current_balance / 1000000,
                    capacity: vault.capacity / 1000000,
                    utilization: (vault.current_balance / vault.capacity) * 100,
                })),
            [vaults]
        );

        // All ATMs by utilization - memoized
        const allAtmsByUtilization = useMemo(
            () =>
                analytics?.atm_utilization
                    ? [...analytics.atm_utilization]
                          .sort((a, b) => b.utilization - a.utilization)
                          .map((atm) => ({
                              name: atm.name.replace("ATM ", ""),
                              utilization: atm.utilization,
                          }))
                    : [],
            [analytics]
        );

        const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];

        if (!analytics) return <div className="p-8">Loading...</div>;

        return (
            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Total Vaults
                                </p>
                                <p className="text-3xl font-bold mt-1">
                                    {analytics.summary.total_vaults}
                                </p>
                            </div>
                            <Building className="h-10 w-10 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Total ATMs
                                </p>
                                <p className="text-3xl font-bold mt-1">
                                    {analytics.summary.total_atms}
                                </p>
                            </div>
                            <Database className="h-10 w-10 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-lg shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Vault Balance
                                </p>
                                <p className="text-3xl font-bold mt-1">
                                    $
                                    {(
                                        analytics.summary.total_vault_balance /
                                        1000000
                                    ).toFixed(1)}
                                    M
                                </p>
                            </div>
                            <Banknote className="h-10 w-10 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    ATM Balance
                                </p>
                                <p className="text-3xl font-bold mt-1">
                                    $
                                    {(
                                        analytics.summary.total_atm_balance /
                                        1000
                                    ).toFixed(0)}
                                    K
                                </p>
                            </div>
                            <TrendingUp className="h-10 w-10 opacity-80" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-lg shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Avg Utilization
                                </p>
                                <p className="text-3xl font-bold mt-1">
                                    {(
                                        analytics.atm_utilization.reduce(
                                            (sum, atm) => sum + atm.utilization,
                                            0
                                        ) / analytics.atm_utilization.length
                                    ).toFixed(1)}
                                    %
                                </p>
                            </div>
                            <Activity className="h-10 w-10 opacity-80" />
                        </div>
                    </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ATM Status Distribution Pie Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            ATM Health Status Distribution
                        </h3>
                        <div className="flex justify-center">
                            <PieChart width={400} height={320}>
                                <Pie
                                    data={statusPieData}
                                    cx={200}
                                    cy={140}
                                    labelLine={true}
                                    label={({ value, percent }) =>
                                        `${value} (${(percent * 100).toFixed(
                                            0
                                        )}%)`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusPieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry) =>
                                        entry.payload.name
                                    }
                                />
                            </PieChart>
                        </div>
                    </div>

                    {/* Vault Balance Distribution */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            Vault Balance Distribution
                        </h3>
                        <div
                            className="flex justify-evenly pt-8 pb-4"
                            style={{ minHeight: "360px" }}
                        >
                            {vaultBalanceData.map((vault, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center"
                                    style={{ width: "110px" }}
                                >
                                    <div className="text-sm font-bold text-gray-800 mb-1">
                                        {vault.utilization.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-medium text-gray-700 mb-3">
                                        ${vault.balance.toFixed(1)}M
                                    </div>
                                    <div
                                        className="relative"
                                        style={{
                                            width: "64px",
                                            height: "160px",
                                        }}
                                    >
                                        <div
                                            className="absolute bottom-0 w-full bg-gray-200 rounded-t-lg"
                                            style={{ height: "160px" }}
                                        ></div>
                                        <div
                                            className="absolute bottom-0 bg-gradient-to-t from-blue-600 to-blue-400 w-full rounded-t-lg transition-all duration-1000 ease-out"
                                            style={{
                                                height: animateVaults
                                                    ? `${
                                                          Math.min(
                                                              vault.utilization,
                                                              100
                                                          ) * 1.6
                                                      }px`
                                                    : "0px",
                                                transitionDelay: `${
                                                    index * 150
                                                }ms`,
                                            }}
                                        ></div>
                                    </div>
                                    <div
                                        className="text-sm font-semibold text-gray-800 mt-3 text-center leading-tight"
                                        style={{
                                            minHeight: "36px",
                                            width: "110px",
                                        }}
                                    >
                                        {vault.name}
                                    </div>
                                    <div className="text-xs text-gray-500 text-center mt-1">
                                        / ${vault.capacity.toFixed(1)}M
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ATM Utilization Comparison */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            All ATMs by Utilization
                        </h3>
                        <div
                            className="overflow-y-auto"
                            style={{ maxHeight: "280px" }}
                        >
                            <BarChart
                                width={380}
                                height={allAtmsByUtilization.length * 35}
                                data={allAtmsByUtilization}
                                layout="vertical"
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    unit="%"
                                    domain={[0, "dataMax + 10"]}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={140}
                                />
                                <Tooltip
                                    formatter={(value) =>
                                        `${value.toFixed(1)}%`
                                    }
                                />
                                <Bar dataKey="utilization" fill="#8B5CF6" />
                            </BarChart>
                        </div>
                    </div>

                    {/* ATM Balance vs Capacity */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            ATM Balance vs Capacity
                        </h3>
                        <BarChart
                            width={380}
                            height={280}
                            data={utilizationData.slice(0, 8)}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                angle={-30}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                label={{
                                    value: "Thousand $",
                                    angle: -90,
                                    position: "insideLeft",
                                }}
                            />
                            <Tooltip
                                formatter={(value) => `$${value.toFixed(0)}K`}
                            />
                            <Legend />
                            <Bar
                                dataKey="balance"
                                fill="#3B82F6"
                                name="Current Balance"
                            />
                            <Bar
                                dataKey="capacity"
                                fill="#93C5FD"
                                name="Capacity"
                            />
                        </BarChart>
                    </div>
                </div>
            </div>
        );
    };

    const OptimizationTab = () => (
        <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">
                    Cash Allocation Optimizer
                </h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Algorithm
                    </label>
                    <select
                        value={selectedAlgorithm}
                        onChange={(e) => setSelectedAlgorithm(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2"
                    >
                        <option value="greedy">Greedy Algorithm</option>
                        <option value="linear_programming">
                            Linear Programming
                        </option>
                    </select>
                </div>

                <button
                    onClick={runOptimization}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                    <Play className="h-4 w-4" />
                    {loading ? "Optimizing..." : "Run Optimization"}
                </button>

                {optimizationResult && (
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-medium">
                                Optimization Results (
                                {optimizationResult.algorithm})
                            </h4>
                            {optimizationResult.total_shortage > 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>
                                        Total Shortage: $
                                        {optimizationResult.total_shortage.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Vault
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            ATM
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            ATM Shortage
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {optimizationResult.allocations.map(
                                        (allocation, idx) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {allocation.vault_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {allocation.atm_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                    $
                                                    {allocation.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    $
                                                    {allocation.shortage_before.toLocaleString()}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={executeAllocation}
                            disabled={loading}
                            className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                        >
                            {loading ? "Executing..." : "Execute Allocation"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const VaultManagement = () => {
        const [showForm, setShowForm] = useState(false);
        const [editingVault, setEditingVault] = useState(null);
        const [formData, setFormData] = useState({
            name: "",
            location: "",
            latitude: "",
            longitude: "",
            capacity: "",
            current_balance: "",
        });

        const handleEdit = (vault) => {
            setEditingVault(vault);
            setFormData({
                name: vault.name,
                location: vault.location,
                latitude: vault.latitude || "",
                longitude: vault.longitude || "",
                capacity: vault.capacity,
                current_balance: vault.current_balance,
            });
            setShowForm(true);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const success = editingVault
                ? await updateVault(editingVault.id, formData)
                : await addVault(formData);
            if (success) {
                setShowForm(false);
                setEditingVault(null);
                setFormData({
                    name: "",
                    location: "",
                    latitude: "",
                    longitude: "",
                    capacity: "",
                    current_balance: "",
                });
            }
        };

        const handleCancel = () => {
            setShowForm(false);
            setEditingVault(null);
            setFormData({
                name: "",
                location: "",
                latitude: "",
                longitude: "",
                capacity: "",
                current_balance: "",
            });
        };

        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Vault Management</h3>
                    <button
                        onClick={() =>
                            showForm ? handleCancel() : setShowForm(true)
                        }
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                        {showForm ? "Cancel" : "Add Vault"}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-2 gap-4"
                        >
                            <input
                                placeholder="Vault Name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 col-span-2"
                                required
                            />
                            <input
                                placeholder="Location"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        location: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 col-span-2"
                                required
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Latitude (for routing)"
                                value={formData.latitude}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        latitude: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Longitude (for routing)"
                                value={formData.longitude}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        longitude: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                            <input
                                placeholder="Location"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        location: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Capacity"
                                value={formData.capacity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        capacity: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Current Balance"
                                value={formData.current_balance}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        current_balance: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <button
                                type="submit"
                                className="col-span-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                            >
                                {editingVault ? "Update Vault" : "Add Vault"}
                            </button>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <div>Coordinates</div>
                                    <div className="text-xs normal-case text-gray-400">
                                        (Lat, Long)
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Capacity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Current Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Utilization
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {vaults.map((vault) => (
                                <tr key={vault.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {vault.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {vault.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {vault.location}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {vault.latitude && vault.longitude ? (
                                            <span className="text-xs">
                                                📍 {vault.latitude.toFixed(4)},{" "}
                                                {vault.longitude.toFixed(4)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">
                                                Not set
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${vault.capacity.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        $
                                        {vault.current_balance.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            (vault.current_balance /
                                                                vault.capacity) *
                                                                100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {(
                                                    (vault.current_balance /
                                                        vault.capacity) *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => handleEdit(vault)}
                                            className="text-blue-600 hover:text-blue-900 font-medium mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() =>
                                                deleteVault(vault.id)
                                            }
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            Delete
                                        </button>
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
                    <h2 className="text-2xl font-bold">
                        ML-Powered Cash Demand Forecasting
                    </h2>
                </div>
                <p className="text-purple-100">
                    Predict ATM cash demand using ARIMA, LSTM, and Ensemble
                    models
                </p>
            </div>

            {/* Control Panel */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">
                    Forecast Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select ATM
                        </label>
                        <select
                            value={selectedATMForForecast}
                            onChange={(e) =>
                                setSelectedATMForForecast(
                                    Number(e.target.value)
                                )
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            {atms && atms.length > 0 ? (
                                atms.map((atm) => (
                                    <option key={atm.id} value={atm.id}>
                                        {atm.name} - {atm.location}
                                    </option>
                                ))
                            ) : (
                                <option value="">Loading ATMs...</option>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ML Model
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="arima">ARIMA (Time Series)</option>
                            <option value="lstm">LSTM (Deep Learning)</option>
                            <option value="ensemble">
                                Ensemble (Best of Both) 🏆
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Forecast Days
                        </label>
                        <select
                            value={forecastDays}
                            onChange={(e) =>
                                setForecastDays(Number(e.target.value))
                            }
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
                    {loading
                        ? "Generating Forecast..."
                        : "Generate ML Forecast"}
                </button>
            </div>

            {/* Model Performance Metrics Table */}
            {mlMetrics && mlMetrics.metrics && mlMetrics.metrics.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            Model Performance Metrics - ATM{" "}
                            {selectedATMForForecast}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                Best Model:
                            </span>
                            <span className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm">
                                {mlMetrics.best_model} (MAPE:{" "}
                                {mlMetrics.best_mape}%)
                            </span>
                        </div>
                    </div>

                    {/* Metrics Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Model
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        MAE
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        RMSE
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        MAPE
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Training Days
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {mlMetrics.metrics.map((metric) => (
                                    <tr
                                        key={metric.model}
                                        className={
                                            metric.is_best
                                                ? "bg-purple-50"
                                                : "hover:bg-gray-50"
                                        }
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {metric.model}
                                                </span>
                                                {metric.is_best && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                        ⭐ Best
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {metric.mae_formatted}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Mean Absolute Error
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {metric.rmse_formatted}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Root Mean Squared Error
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        metric.mape < 10
                                                            ? "text-green-600"
                                                            : metric.mape < 20
                                                            ? "text-blue-600"
                                                            : metric.mape < 50
                                                            ? "text-yellow-600"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    {metric.mape_formatted}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {metric.mape < 10
                                                    ? "Excellent"
                                                    : metric.mape < 20
                                                    ? "Good"
                                                    : metric.mape < 50
                                                    ? "Acceptable"
                                                    : "Needs Improvement"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {metric.training_days} days
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                ✓ Trained
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-600 mb-2 font-semibold">
                            Understanding the Metrics:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                                <span className="font-medium">MAE:</span>{" "}
                                Average prediction error in dollars (lower is
                                better)
                            </div>
                            <div>
                                <span className="font-medium">RMSE:</span>{" "}
                                Penalizes large errors more heavily (lower is
                                better)
                            </div>
                            <div>
                                <span className="font-medium">MAPE:</span>{" "}
                                Percentage error - &lt;10% Excellent, 10-20%
                                Good, 20-50% Acceptable
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Forecast Results */}
            {mlForecast && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
                            <p className="text-sm font-medium text-gray-600">
                                Model Used
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {mlForecast.model_type.toUpperCase()}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                            <p className="text-sm font-medium text-gray-600">
                                Total Demand
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {mlForecast.total_predicted_demand_formatted}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
                            <p className="text-sm font-medium text-gray-600">
                                Avg Daily
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {mlForecast.avg_daily_demand_formatted}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
                            <p className="text-sm font-medium text-gray-600">
                                Peak Demand
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                ${mlForecast.max_demand?.toLocaleString()}
                            </p>
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
                                    formatter={(value) => [
                                        `$${value.toLocaleString()}`,
                                        "Predicted Demand",
                                    ]}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="predicted_demand"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: "#8b5cf6", r: 4 }}
                                    name="Predicted Demand"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detailed Forecast Table */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">
                            Daily Forecast Details
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Day
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Predicted Demand
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {mlForecast.forecast &&
                                    mlForecast.forecast.length > 0 ? (
                                        mlForecast.forecast.map((day, idx) => {
                                            const isWeekend =
                                                day.day_of_week ===
                                                    "Saturday" ||
                                                day.day_of_week === "Sunday";
                                            const isHigh =
                                                day.predicted_demand >
                                                mlForecast.avg_daily_demand;

                                            return (
                                                <tr
                                                    key={idx}
                                                    className={
                                                        isWeekend
                                                            ? "bg-blue-50"
                                                            : ""
                                                    }
                                                >
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
                                                        {
                                                            day.predicted_demand_formatted
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 text-xs rounded-full ${
                                                                isHigh
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-green-100 text-green-800"
                                                            }`}
                                                        >
                                                            {isHigh
                                                                ? "High Demand"
                                                                : "Normal"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                className="px-6 py-4 text-center text-gray-500"
                                            >
                                                No forecast data available
                                            </td>
                                        </tr>
                                    )}
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
                                <span className="text-purple-600 font-bold">
                                    •
                                </span>
                                <span>
                                    Total {forecastDays}-day demand:{" "}
                                    <strong>
                                        {
                                            mlForecast.total_predicted_demand_formatted
                                        }
                                    </strong>
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-600 font-bold">
                                    •
                                </span>
                                <span>
                                    Peak demand expected on:{" "}
                                    <strong>
                                        {mlForecast.forecast &&
                                        mlForecast.forecast.length > 0
                                            ? mlForecast.forecast.reduce(
                                                  (max, day) =>
                                                      day.predicted_demand >
                                                      max.predicted_demand
                                                          ? day
                                                          : max
                                              ).date
                                            : "N/A"}
                                    </strong>{" "}
                                    {mlForecast.forecast &&
                                        mlForecast.forecast.length > 0 && (
                                            <>
                                                (
                                                {
                                                    mlForecast.forecast.reduce(
                                                        (max, day) =>
                                                            day.predicted_demand >
                                                            max.predicted_demand
                                                                ? day
                                                                : max
                                                    ).day_of_week
                                                }
                                                )
                                            </>
                                        )}
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-600 font-bold">
                                    •
                                </span>
                                <span>
                                    Recommended cash level:{" "}
                                    <strong>
                                        $
                                        {(
                                            mlForecast.total_predicted_demand *
                                            1.1
                                        ).toLocaleString()}
                                    </strong>{" "}
                                    (with 10% safety buffer)
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-600 font-bold">
                                    •
                                </span>
                                <span>
                                    Model accuracy (MAPE):{" "}
                                    <strong>
                                        {mlMetrics?.best_mape?.toFixed(2)}%
                                    </strong>{" "}
                                    -
                                    {mlMetrics?.best_mape < 20
                                        ? " Excellent accuracy!"
                                        : " Good accuracy"}
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
                        Select an ATM, choose a model, and click "Generate ML
                        Forecast" to see predictions
                    </p>
                </div>
            )}
        </div>
    );

    // AI Recommendations Tab Component
    const AIRecommendationsTab = () => {
        // Fetch critical ATMs with ML forecasts
        const fetchCriticalATMs = async () => {
            setAILoading(true);
            try {
                // First, get ML forecasts for all ATMs
                const forecastPromises = atms.map(async (atm) => {
                    try {
                        const response = await fetch(
                            `${API_BASE}/ml/forecast/${atm.id}?model=ensemble&days=7`
                        );
                        const data = await response.json();
                        if (data.success) {
                            return {
                                atmId: atm.id,
                                predictions: data.forecast.map(
                                    (f) => f.predicted_demand
                                ),
                            };
                        }
                    } catch (error) {
                        console.error(
                            `Error fetching forecast for ATM ${atm.id}:`,
                            error
                        );
                    }
                    return null;
                });

                const forecasts = await Promise.all(forecastPromises);
                const mlForecasts = {};
                forecasts.forEach((f) => {
                    if (f) mlForecasts[f.atmId] = f.predictions;
                });

                // Get critical ATMs recommendations
                const response = await fetch(
                    `${API_BASE}/ai/recommendations/critical-atms`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            atms: atms.map((atm) => ({
                                id: atm.id,
                                name: atm.name,
                                location: atm.location,
                                capacity: atm.capacity,
                                current_balance: atm.current_balance,
                                days_since_last_refill:
                                    Math.floor(Math.random() * 10) + 1, // Mock data
                            })),
                            ml_forecasts: mlForecasts,
                            threshold: 1.5,
                        }),
                    }
                );

                const data = await response.json();
                if (data.success) {
                    setCriticalATMs(data.critical_atms);
                }
            } catch (error) {
                console.error("Error fetching critical ATMs:", error);
                alert("Failed to fetch AI recommendations");
            } finally {
                setAILoading(false);
            }
        };

        // Simulate What-If Scenario
        const simulateScenario = async (scenarioType) => {
            setAILoading(true);
            try {
                let endpoint = "";
                let requestBody = {};

                if (scenarioType === "emergency") {
                    // Emergency rerouting simulation
                    endpoint = `${API_BASE}/ai/whatif/emergency-rerouting`;
                    requestBody = {
                        current_route: {
                            route: atms.slice(0, 5).map((atm) => ({
                                atm_id: atm.id,
                                location: [40.7128, -74.006], // Mock location
                            })),
                            total_distance: 25.5,
                            total_time: 2.5,
                            fuel_cost: 15.0,
                        },
                        emergency_atm_id: atms[6]?.id || 6,
                        atm_location: [40.7589, -73.9851],
                        vehicle_location: [40.7128, -74.006],
                    };
                } else if (scenarioType === "breakdown") {
                    // Vehicle breakdown simulation
                    endpoint = `${API_BASE}/ai/whatif/vehicle-breakdown`;
                    requestBody = {
                        current_route: {
                            route: atms
                                .slice(0, 5)
                                .map((atm) => ({ atm_id: atm.id })),
                            total_distance: 25.5,
                            total_time: 2.5,
                            fuel_cost: 15.0,
                            total_cash_needed: 100000,
                            start_location: [40.7128, -74.006],
                        },
                        available_vehicles: [
                            {
                                id: 1,
                                name: "Vehicle 1",
                                status: "available",
                                capacity: 150000,
                                fuel_efficiency: 12,
                                current_location: [40.7128, -74.006],
                            },
                            {
                                id: 2,
                                name: "Vehicle 2",
                                status: "available",
                                capacity: 120000,
                                fuel_efficiency: 10,
                                current_location: [40.7589, -73.9851],
                            },
                            {
                                id: 3,
                                name: "Vehicle 3",
                                status: "available",
                                capacity: 180000,
                                fuel_efficiency: 15,
                                current_location: [40.7614, -73.9776],
                            },
                        ],
                        broken_vehicle_id: 1,
                    };
                } else if (scenarioType === "cost") {
                    // Cost comparison
                    endpoint = `${API_BASE}/ai/whatif/cost-comparison`;
                    requestBody = {
                        current_route: {
                            total_distance: 25.5,
                            total_time: 2.5,
                            fuel_cost: 15.0,
                            route: atms.slice(0, 5),
                        },
                        alternative_route: {
                            total_distance: 22.0,
                            total_time: 2.2,
                            fuel_cost: 13.0,
                            route: atms.slice(1, 6),
                        },
                    };
                }

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                });

                const data = await response.json();
                if (data.success) {
                    setWhatIfScenario(data.analysis || data.comparison);
                }
            } catch (error) {
                console.error("Error simulating scenario:", error);
                alert("Failed to simulate scenario");
            } finally {
                setAILoading(false);
            }
        };

        // Removed automatic fetching - user must click "Analyze" button

        return (
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="h-8 w-8" />
                        <h2 className="text-2xl font-bold">
                            AI-Powered Smart Recommendations
                        </h2>
                    </div>
                    <p className="text-purple-100">
                        Intelligent route recommendations, what-if analysis, and
                        optimization metrics
                    </p>
                </div>

                {/* Critical ATMs Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="h-6 w-6 text-red-600" />
                            <h3 className="text-lg font-semibold">
                                Critical ATMs Requiring Attention
                            </h3>
                        </div>
                        <button
                            onClick={fetchCriticalATMs}
                            disabled={aiLoading || atms.length === 0}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {aiLoading ? (
                                <>
                                    <Activity className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    Analyze
                                </>
                            )}
                        </button>
                    </div>

                    {criticalATMs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>
                                Click "Analyze" button to identify critical ATMs
                                requiring attention.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Rank
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            ATM
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Priority Score
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Criticality
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Balance
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            7-Day Demand
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Recommended Refill
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {criticalATMs.map((atm, idx) => (
                                        <tr
                                            key={atm.atm_id}
                                            className={
                                                atm.criticality === "critical"
                                                    ? "bg-red-50"
                                                    : atm.criticality === "high"
                                                    ? "bg-orange-50"
                                                    : atm.criticality ===
                                                      "medium"
                                                    ? "bg-yellow-50"
                                                    : ""
                                            }
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold">
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {atm.atm_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {atm.location}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-lg font-bold text-purple-600">
                                                    {atm.priority_score.toFixed(
                                                        2
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        atm.criticality ===
                                                        "critical"
                                                            ? "bg-red-100 text-red-800"
                                                            : atm.criticality ===
                                                              "high"
                                                            ? "bg-orange-100 text-orange-800"
                                                            : atm.criticality ===
                                                              "medium"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-green-100 text-green-800"
                                                    }`}
                                                >
                                                    {atm.criticality.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    $
                                                    {atm.current_balance.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {atm.balance_percentage}%
                                                    capacity
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-indigo-600">
                                                    $
                                                    {atm.predicted_7day_demand.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm">
                                                    <div className="font-medium text-gray-900">
                                                        Every{" "}
                                                        {
                                                            atm
                                                                .refill_recommendation
                                                                .recommended_days
                                                        }{" "}
                                                        days
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {
                                                            atm
                                                                .refill_recommendation
                                                                .reason
                                                        }
                                                    </div>
                                                    <div className="text-xs text-purple-600 mt-1">
                                                        Confidence:{" "}
                                                        {
                                                            atm
                                                                .refill_recommendation
                                                                .confidence
                                                        }
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* What-If Analysis Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <h3 className="text-lg font-semibold">
                            What-If Scenario Analysis
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button
                            onClick={() => {
                                setSelectedScenarioType("emergency");
                                simulateScenario("emergency");
                            }}
                            disabled={aiLoading}
                            className="p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                            <div className="font-semibold text-gray-900">
                                Emergency Rerouting
                            </div>
                            <div className="text-sm text-gray-600">
                                ATM runs out of cash
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedScenarioType("breakdown");
                                simulateScenario("breakdown");
                            }}
                            disabled={aiLoading}
                            className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                        >
                            <Truck className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                            <div className="font-semibold text-gray-900">
                                Vehicle Breakdown
                            </div>
                            <div className="text-sm text-gray-600">
                                Find alternative vehicle
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedScenarioType("cost");
                                simulateScenario("cost");
                            }}
                            disabled={aiLoading}
                            className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <div className="font-semibold text-gray-900">
                                Cost Comparison
                            </div>
                            <div className="text-sm text-gray-600">
                                Compare route efficiency
                            </div>
                        </button>
                    </div>

                    {/* Scenario Results */}
                    {whatIfScenario && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <Zap className="h-5 w-5 text-purple-600" />
                                Scenario Analysis Results
                            </h4>

                            {selectedScenarioType === "emergency" &&
                                whatIfScenario.scenario ===
                                    "emergency_rerouting" && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-3 rounded">
                                                <div className="text-xs text-gray-600">
                                                    Emergency ATM
                                                </div>
                                                <div className="text-lg font-bold text-red-600">
                                                    ATM #
                                                    {
                                                        whatIfScenario.emergency_atm_id
                                                    }
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded">
                                                <div className="text-xs text-gray-600">
                                                    Distance
                                                </div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {
                                                        whatIfScenario.distance_to_emergency
                                                    }{" "}
                                                    km
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded">
                                                <div className="text-xs text-gray-600">
                                                    Additional Time
                                                </div>
                                                <div className="text-lg font-bold text-orange-600">
                                                    {
                                                        whatIfScenario.additional_time_hours
                                                    }{" "}
                                                    hrs
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded">
                                                <div className="text-xs text-gray-600">
                                                    Additional Cost
                                                </div>
                                                <div className="text-lg font-bold text-green-600">
                                                    $
                                                    {
                                                        whatIfScenario.additional_fuel_cost
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-white rounded">
                                            <div className="font-medium text-purple-900">
                                                💡 Recommendation:
                                            </div>
                                            <div className="text-gray-700">
                                                {whatIfScenario.recommendation}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {selectedScenarioType === "breakdown" &&
                                whatIfScenario.scenario ===
                                    "vehicle_breakdown" && (
                                    <div className="space-y-2">
                                        {whatIfScenario.status ===
                                        "resolved" ? (
                                            <>
                                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                                    ✅ Alternative vehicle
                                                    found:{" "}
                                                    <strong>
                                                        {
                                                            whatIfScenario
                                                                .recommended_vehicle
                                                                .vehicle_name
                                                        }
                                                    </strong>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                    <div className="bg-white p-3 rounded">
                                                        <div className="text-xs text-gray-600">
                                                            Capacity
                                                        </div>
                                                        <div className="text-lg font-bold text-blue-600">
                                                            $
                                                            {whatIfScenario.recommended_vehicle.capacity.toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded">
                                                        <div className="text-xs text-gray-600">
                                                            Fuel Efficiency
                                                        </div>
                                                        <div className="text-lg font-bold text-green-600">
                                                            {
                                                                whatIfScenario
                                                                    .recommended_vehicle
                                                                    .fuel_efficiency
                                                            }{" "}
                                                            km/L
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded">
                                                        <div className="text-xs text-gray-600">
                                                            Estimated Cost
                                                        </div>
                                                        <div className="text-lg font-bold text-orange-600">
                                                            $
                                                            {
                                                                whatIfScenario
                                                                    .recommended_vehicle
                                                                    .estimated_fuel_cost
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                                ⚠️{" "}
                                                {whatIfScenario.recommendation}
                                            </div>
                                        )}
                                    </div>
                                )}

                            {selectedScenarioType === "cost" &&
                                whatIfScenario.scenario ===
                                    "cost_comparison" && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded border-2 border-blue-300">
                                                <div className="text-sm font-semibold text-blue-900 mb-2">
                                                    Current Route
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        Distance:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .current_route
                                                                    .distance_km
                                                            }{" "}
                                                            km
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Time:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .current_route
                                                                    .time_hours
                                                            }{" "}
                                                            hrs
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Cost:{" "}
                                                        <span className="font-bold">
                                                            $
                                                            {
                                                                whatIfScenario
                                                                    .current_route
                                                                    .fuel_cost
                                                            }
                                                        </span>
                                                    </div>
                                                    <div>
                                                        ATMs:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .current_route
                                                                    .atms_visited
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 rounded border-2 border-green-300">
                                                <div className="text-sm font-semibold text-green-900 mb-2">
                                                    Alternative Route
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        Distance:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .alternative_route
                                                                    .distance_km
                                                            }{" "}
                                                            km
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Time:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .alternative_route
                                                                    .time_hours
                                                            }{" "}
                                                            hrs
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Cost:{" "}
                                                        <span className="font-bold">
                                                            $
                                                            {
                                                                whatIfScenario
                                                                    .alternative_route
                                                                    .fuel_cost
                                                            }
                                                        </span>
                                                    </div>
                                                    <div>
                                                        ATMs:{" "}
                                                        <span className="font-bold">
                                                            {
                                                                whatIfScenario
                                                                    .alternative_route
                                                                    .atms_visited
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded">
                                            <div className="text-sm font-semibold text-gray-900 mb-2">
                                                Savings Analysis
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <div className="text-gray-600">
                                                        Distance Saving
                                                    </div>
                                                    <div
                                                        className={`font-bold ${
                                                            whatIfScenario
                                                                .differences
                                                                .distance_saving_pct <
                                                            0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {whatIfScenario.differences.distance_saving_pct.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">
                                                        Time Saving
                                                    </div>
                                                    <div
                                                        className={`font-bold ${
                                                            whatIfScenario
                                                                .differences
                                                                .time_saving_pct <
                                                            0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {whatIfScenario.differences.time_saving_pct.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">
                                                        Cost Saving
                                                    </div>
                                                    <div
                                                        className={`font-bold ${
                                                            whatIfScenario
                                                                .differences
                                                                .cost_saving_pct <
                                                            0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {whatIfScenario.differences.cost_saving_pct.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                                                <div className="font-medium text-purple-900">
                                                    💡 Recommendation:
                                                </div>
                                                <div className="text-gray-700">
                                                    {whatIfScenario.reason}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const TransactionHistoryTab = () => {
        const [historyData, setHistoryData] = useState([]);
        const [summary, setSummary] = useState(null);
        const [currentPage, setCurrentPage] = useState(1);
        const [totalPages, setTotalPages] = useState(1);
        const [perPage, setPerPage] = useState(50);
        const [loading, setLoading] = useState(false);

        // Filter states
        const [filterType, setFilterType] = useState("");
        const [filterATM, setFilterATM] = useState("");
        const [filterVault, setFilterVault] = useState("");
        const [filterSection, setFilterSection] = useState("");
        const [dateFrom, setDateFrom] = useState("");
        const [dateTo, setDateTo] = useState("");
        const [searchTerm, setSearchTerm] = useState("");
        const [minAmount, setMinAmount] = useState("");
        const [maxAmount, setMaxAmount] = useState("");
        const [timePeriod, setTimePeriod] = useState("");

        // Sort states
        const [sortBy, setSortBy] = useState("timestamp");
        const [sortOrder, setSortOrder] = useState("desc");

        // Section management states
        const [sections, setSections] = useState([]);
        const [showSectionModal, setShowSectionModal] = useState(false);
        const [newSection, setNewSection] = useState({
            name: "",
            description: "",
            color: "blue",
        });

        // CSV Import states
        const [showImportModal, setShowImportModal] = useState(false);
        const [selectedFile, setSelectedFile] = useState(null);
        const [importSection, setImportSection] = useState("");
        const [importResult, setImportResult] = useState(null);

        const fetchTransactionHistory = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage,
                    per_page: perPage,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                });

                if (filterType) params.append("filter_type", filterType);
                if (filterATM) params.append("filter_atm_id", filterATM);
                if (filterVault) params.append("filter_vault_id", filterVault);
                if (filterSection)
                    params.append("filter_section_id", filterSection);
                if (dateFrom) params.append("date_from", dateFrom);
                if (dateTo) params.append("date_to", dateTo);
                if (searchTerm) params.append("search", searchTerm);
                if (minAmount) params.append("min_amount", minAmount);
                if (maxAmount) params.append("max_amount", maxAmount);
                if (timePeriod) params.append("time_period", timePeriod);

                const response = await fetch(
                    `${API_BASE}/transactions/history?${params}`
                );
                const data = await response.json();

                setHistoryData(data.transactions);
                setSummary(data.summary);
                setTotalPages(data.pages);
            } catch (error) {
                console.error("Failed to fetch transaction history:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSections = async () => {
            try {
                const response = await fetch(
                    `${API_BASE}/transaction-sections`
                );
                const data = await response.json();
                setSections(data);
            } catch (error) {
                console.error("Failed to fetch sections:", error);
            }
        };

        useEffect(() => {
            fetchTransactionHistory();
            fetchSections();
        }, [
            currentPage,
            perPage,
            sortBy,
            sortOrder,
            filterType,
            filterATM,
            filterVault,
            filterSection,
            dateFrom,
            dateTo,
            searchTerm,
            minAmount,
            maxAmount,
            timePeriod,
        ]);

        const handleClearFilters = () => {
            setFilterType("");
            setFilterATM("");
            setFilterVault("");
            setFilterSection("");
            setDateFrom("");
            setDateTo("");
            setSearchTerm("");
            setMinAmount("");
            setMaxAmount("");
            setTimePeriod("");
            setCurrentPage(1);
        };

        const handleCreateSection = async () => {
            if (!newSection.name) {
                alert("Section name is required");
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE}/transaction-sections`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newSection),
                    }
                );

                if (response.ok) {
                    setShowSectionModal(false);
                    setNewSection({ name: "", description: "", color: "blue" });
                    fetchSections();
                    alert("Section created successfully!");
                } else {
                    const data = await response.json();
                    alert(data.error || "Failed to create section");
                }
            } catch (error) {
                console.error("Failed to create section:", error);
                alert("Failed to create section");
            }
        };

        const handleDeleteSection = async (sectionId) => {
            if (
                !window.confirm("Are you sure you want to delete this section?")
            )
                return;

            try {
                const response = await fetch(
                    `${API_BASE}/transaction-sections/${sectionId}`,
                    {
                        method: "DELETE",
                    }
                );

                if (response.ok) {
                    fetchSections();
                    alert("Section deleted successfully!");
                } else {
                    const data = await response.json();
                    alert(data.error || "Failed to delete section");
                }
            } catch (error) {
                console.error("Failed to delete section:", error);
                alert("Failed to delete section");
            }
        };

        const handleFileChange = (e) => {
            setSelectedFile(e.target.files[0]);
            setImportResult(null);
        };

        const handleImportCSV = async () => {
            if (!selectedFile) {
                alert("Please select a CSV file");
                return;
            }

            const formData = new FormData();
            formData.append("file", selectedFile);
            if (importSection) {
                formData.append("section_id", importSection);
            }

            try {
                const response = await fetch(
                    `${API_BASE}/transactions/import-csv`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setImportResult(data);
                    setSelectedFile(null);
                    fetchTransactionHistory();
                    alert(
                        `✅ Successfully imported ${data.imported_count} transactions!`
                    );
                } else {
                    alert(data.error || "Failed to Import CSV");
                }
            } catch (error) {
                console.error("Failed to Import CSV:", error);
                alert("Failed to Import CSV");
            }
        };

        const handleExportCSV = () => {
            const params = new URLSearchParams();
            if (filterType) params.append("filter_type", filterType);
            if (filterATM) params.append("filter_atm_id", filterATM);
            if (filterVault) params.append("filter_vault_id", filterVault);
            if (filterSection)
                params.append("filter_section_id", filterSection);
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
            if (searchTerm) params.append("search", searchTerm);
            if (minAmount) params.append("min_amount", minAmount);
            if (maxAmount) params.append("max_amount", maxAmount);
            if (timePeriod) params.append("time_period", timePeriod);

            const url = `${API_BASE}/transactions/export-csv?${params}`;
            window.open(url, "_blank");
        };

        const handleSort = (column) => {
            if (sortBy === column) {
                setSortOrder(sortOrder === "desc" ? "asc" : "desc");
            } else {
                setSortBy(column);
                setSortOrder("desc");
            }
        };

        const getTypeColor = (type) => {
            switch (type) {
                case "withdrawal":
                    return "bg-green-100 text-green-800";
                case "deposit":
                    return "bg-blue-100 text-blue-800";
                case "allocation":
                    return "bg-purple-100 text-purple-800";
                case "balance_check":
                    return "bg-gray-100 text-gray-800";
                default:
                    return "bg-gray-100 text-gray-800";
            }
        };

        const getTypeIcon = (type) => {
            switch (type) {
                case "withdrawal":
                    return "🟢";
                case "deposit":
                    return "🔵";
                case "allocation":
                    return "🟣";
                case "balance_check":
                    return "⚪";
                default:
                    return "⚪";
            }
        };

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        };

        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-900">
                        Transaction History
                    </h3>
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
                            <Upload className="h-4 w-4" />
                            Import CSV
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
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
                            <p className="text-sm text-gray-600">
                                Total Transactions
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary.total_transactions}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                📊 All types
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                            <p className="text-sm text-gray-600">
                                Total Amount
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                                ${summary.total_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                💰 Sum of all
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
                            <p className="text-sm text-gray-600">
                                🟢 Withdrawals
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary.total_withdrawals}
                            </p>
                            <p className="text-sm text-green-700 font-semibold">
                                ${summary.withdrawal_amount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
                            <p className="text-sm text-gray-600">🔵 Deposits</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary.total_deposits}
                            </p>
                            <p className="text-sm text-blue-700 font-semibold">
                                ${summary.deposit_amount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                            <p className="text-sm text-gray-600">
                                🟣 Allocations
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary.total_allocations}
                            </p>
                            <p className="text-sm text-purple-700 font-semibold">
                                ${summary.allocation_amount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
                            <p className="text-sm text-gray-600">
                                Average Amount
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                ${summary.avg_transaction.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                📈 Per transaction
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters Panel */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h4 className="text-lg font-semibold mb-4">
                        🔍 Filters & Search
                    </h4>

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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Transaction Type
                            </label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">All Types</option>
                                <option value="withdrawal">Withdrawal</option>
                                <option value="deposit">Deposit</option>
                                <option value="allocation">Allocation</option>
                                <option value="balance_check">
                                    Balance Check
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ATM
                            </label>
                            <select
                                value={filterATM}
                                onChange={(e) => setFilterATM(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">All ATMs</option>
                                {atms.map((atm) => (
                                    <option key={atm.id} value={atm.id}>
                                        {atm.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vault
                            </label>
                            <select
                                value={filterVault}
                                onChange={(e) => setFilterVault(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">All Vaults</option>
                                {vaults.map((vault) => (
                                    <option key={vault.id} value={vault.id}>
                                        {vault.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                📁 Section
                            </label>
                            <select
                                value={filterSection}
                                onChange={(e) =>
                                    setFilterSection(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">All Sections</option>
                                {sections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.name} (
                                        {section.transaction_count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                            </label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Amount ($)
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Amount ($)
                            </label>
                            <input
                                type="number"
                                placeholder="Unlimited"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Time of Day
                            </label>
                            <select
                                value={timePeriod}
                                onChange={(e) => setTimePeriod(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">All Times</option>
                                <option value="morning">
                                    🌅 Morning (6 AM - 12 PM)
                                </option>
                                <option value="afternoon">
                                    ☀️ Afternoon (12 PM - 6 PM)
                                </option>
                                <option value="evening">
                                    🌆 Evening (6 PM - 12 AM)
                                </option>
                                <option value="night">
                                    🌙 Night (12 AM - 6 AM)
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quick Amount Filters
                            </label>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => {
                                        setMinAmount("");
                                        setMaxAmount("100");
                                    }}
                                    className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                                    title="Small transactions (< $100)"
                                >
                                    &lt; $100
                                </button>
                                <button
                                    onClick={() => {
                                        setMinAmount("100");
                                        setMaxAmount("1000");
                                    }}
                                    className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                                    title="Medium transactions ($100-$1K)"
                                >
                                    $100-1K
                                </button>
                                <button
                                    onClick={() => {
                                        setMinAmount("1000");
                                        setMaxAmount("");
                                    }}
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
                                onClick={() => {
                                    setDateFrom(
                                        new Date(
                                            Date.now() - 7 * 24 * 60 * 60 * 1000
                                        )
                                            .toISOString()
                                            .split("T")[0]
                                    );
                                    setDateTo(
                                        new Date().toISOString().split("T")[0]
                                    );
                                }}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                            >
                                Last 7 Days
                            </button>
                            <button
                                onClick={() => {
                                    setDateFrom(
                                        new Date(
                                            Date.now() -
                                                30 * 24 * 60 * 60 * 1000
                                        )
                                            .toISOString()
                                            .split("T")[0]
                                    );
                                    setDateTo(
                                        new Date().toISOString().split("T")[0]
                                    );
                                }}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                            >
                                Last 30 Days
                            </button>
                            <button
                                onClick={() => {
                                    setFilterType("withdrawal");
                                }}
                                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm"
                            >
                                🟢 Withdrawals
                            </button>
                            <button
                                onClick={() => {
                                    setFilterType("allocation");
                                }}
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
                                        onClick={() => handleSort("timestamp")}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    >
                                        Date/Time{" "}
                                        {sortBy === "timestamp" &&
                                            (sortOrder === "desc" ? "↓" : "↑")}
                                    </th>
                                    <th
                                        onClick={() => handleSort("atm_name")}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    >
                                        ATM{" "}
                                        {sortBy === "atm_name" &&
                                            (sortOrder === "desc" ? "↓" : "↑")}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vault
                                    </th>
                                    <th
                                        onClick={() => handleSort("type")}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    >
                                        Type{" "}
                                        {sortBy === "type" &&
                                            (sortOrder === "desc" ? "↓" : "↑")}
                                    </th>
                                    <th
                                        onClick={() => handleSort("amount")}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    >
                                        Amount{" "}
                                        {sortBy === "amount" &&
                                            (sortOrder === "desc" ? "↓" : "↑")}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="px-6 py-4 text-center text-gray-500"
                                        >
                                            Loading...
                                        </td>
                                    </tr>
                                ) : historyData.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="px-6 py-4 text-center text-gray-500"
                                        >
                                            No transactions found
                                        </td>
                                    </tr>
                                ) : (
                                    historyData.map((txn) => (
                                        <tr
                                            key={txn.id}
                                            className="hover:bg-gray-50"
                                        >
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
                                                <span
                                                    className={`px-2 py-1 text-xs rounded-full ${getTypeColor(
                                                        txn.transaction_type
                                                    )}`}
                                                >
                                                    {getTypeIcon(
                                                        txn.transaction_type
                                                    )}{" "}
                                                    {txn.transaction_type}
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
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
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
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.max(1, prev - 1)
                                    )
                                }
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">
                                {currentPage}
                            </span>
                            <button
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1)
                                    )
                                }
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
                            <h3 className="text-xl font-bold mb-4">
                                📁 Manage Transaction Sections
                            </h3>

                            {/* Create New Section */}
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <h4 className="font-semibold mb-2">
                                    Create New Section
                                </h4>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Section Name (e.g., Training Data, Test Data)"
                                        value={newSection.name}
                                        onChange={(e) =>
                                            setNewSection({
                                                ...newSection,
                                                name: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={newSection.description}
                                        onChange={(e) =>
                                            setNewSection({
                                                ...newSection,
                                                description: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        rows="2"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={newSection.color}
                                            onChange={(e) =>
                                                setNewSection({
                                                    ...newSection,
                                                    color: e.target.value,
                                                })
                                            }
                                            className="px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="blue">
                                                🔵 Blue
                                            </option>
                                            <option value="green">
                                                🟢 Green
                                            </option>
                                            <option value="red">🔴 Red</option>
                                            <option value="yellow">
                                                🟡 Yellow
                                            </option>
                                            <option value="purple">
                                                🟣 Purple
                                            </option>
                                            <option value="orange">
                                                🟠 Orange
                                            </option>
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
                                <h4 className="font-semibold mb-2">
                                    Existing Sections ({sections.length})
                                </h4>
                                <div className="space-y-2">
                                    {sections.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">
                                            No sections created yet
                                        </p>
                                    ) : (
                                        sections.map((section) => (
                                            <div
                                                key={section.id}
                                                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                                            >
                                                <div>
                                                    <div className="font-medium">
                                                        {section.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {section.description ||
                                                            "No description"}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {
                                                            section.transaction_count
                                                        }{" "}
                                                        transactions • Created{" "}
                                                        {new Date(
                                                            section.created_at
                                                        ).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        handleDeleteSection(
                                                            section.id
                                                        )
                                                    }
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                                                    disabled={
                                                        section.transaction_count >
                                                        0
                                                    }
                                                    title={
                                                        section.transaction_count >
                                                        0
                                                            ? "Cannot delete section with transactions"
                                                            : "Delete section"
                                                    }
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
                            <h3 className="text-xl font-bold mb-4">
                                📤 Import Transactions from CSV
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        CSV File Format Required:
                                    </label>
                                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono">
                                        <div className="font-semibold">
                                            Required columns:
                                        </div>
                                        <div>
                                            atm_id, vault_id, amount,
                                            transaction_type, timestamp
                                        </div>
                                        <div className="mt-2 font-semibold">
                                            Optional columns:
                                        </div>
                                        <div>notes</div>
                                        <div className="mt-2 text-gray-600">
                                            Example:
                                            1,1,500.00,withdrawal,2025-11-03
                                            14:30:00
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign to Section (optional):
                                    </label>
                                    <select
                                        value={importSection}
                                        onChange={(e) =>
                                            setImportSection(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">No Section</option>
                                        {sections.map((section) => (
                                            <option
                                                key={section.id}
                                                value={section.id}
                                            >
                                                {section.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select CSV File:
                                    </label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    {selectedFile && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Selected: {selectedFile.name}
                                        </p>
                                    )}
                                </div>

                                {importResult && (
                                    <div
                                        className={`p-4 rounded-md ${
                                            importResult.imported_count > 0
                                                ? "bg-green-50 border border-green-200"
                                                : "bg-red-50 border border-red-200"
                                        }`}
                                    >
                                        <p className="font-semibold">
                                            {importResult.message}
                                        </p>
                                        <p className="text-sm">
                                            Imported:{" "}
                                            {importResult.imported_count} /{" "}
                                            {importResult.total_rows} rows
                                        </p>
                                        {importResult.errors &&
                                            importResult.errors.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-sm font-semibold">
                                                        Errors:
                                                    </p>
                                                    <ul className="text-xs list-disc list-inside">
                                                        {importResult.errors.map(
                                                            (err, idx) => (
                                                                <li key={idx}>
                                                                    {err}
                                                                </li>
                                                            )
                                                        )}
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
                                            setImportSection("");
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
        const [editingATM, setEditingATM] = useState(null);
        const [trainingModalATM, setTrainingModalATM] = useState(null);
        const [syntheticDataATM, setSyntheticDataATM] = useState(null);
        const [metricsModalATM, setMetricsModalATM] = useState(null);
        const [availableProfiles, setAvailableProfiles] = useState([]);
        const [formData, setFormData] = useState({
            name: "",
            location: "",
            latitude: "",
            longitude: "",
            capacity: "",
            current_balance: "",
            daily_avg_demand: "",
            profile_override: null,
            profile_override_type: null,
            profile_override_id: null,
        });

        // Fetch available profiles
        useEffect(() => {
            const fetchProfiles = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE}/profiles`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setAvailableProfiles(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch profiles:', error);
                }
            };
            fetchProfiles();
        }, []);

        // Calculate training statistics
        const untrainedATMs = atms.filter((a) => a.transaction_count === 0);
        const trainedATMs = atms.filter((a) => a.transaction_count > 0);

        const handleEdit = (atm) => {
            setEditingATM(atm);
            setFormData({
                name: atm.name,
                location: atm.location,
                latitude: atm.latitude || "",
                longitude: atm.longitude || "",
                capacity: atm.capacity,
                current_balance: atm.current_balance,
                daily_avg_demand: atm.daily_avg_demand,
                profile_override: atm.profile_override || null,
                profile_override_type: atm.profile_override_type || null,
                profile_override_id: atm.profile_override_id || null,
            });
            setShowForm(true);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const success = editingATM
                ? await updateATM(editingATM.id, formData)
                : await addATM(formData);
            if (success) {
                setShowForm(false);
                setEditingATM(null);
                setFormData({
                    name: "",
                    location: "",
                    latitude: "",
                    longitude: "",
                    capacity: "",
                    current_balance: "",
                    daily_avg_demand: "",
                    profile_override: "",
                    profile_override_type: "",
                    profile_override_id: null,
                });
            }
        };

        const handleCancel = () => {
            setShowForm(false);
            setEditingATM(null);
            setFormData({
                name: "",
                location: "",
                latitude: "",
                longitude: "",
                capacity: "",
                current_balance: "",
                daily_avg_demand: "",
                profile_override: null,
                profile_override_type: null,
                profile_override_id: null,
            });
        };

        const handleDelete = async (atmId) => {
            if (!window.confirm("Are you sure you want to delete this ATM?")) {
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/atms/${atmId}`, {
                    method: "DELETE",
                });
                if (response.ok) {
                    fetchData();
                    alert("ATM deleted successfully!");
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Delete failed:", errorData);
                    alert(
                        `Failed to delete ATM: ${
                            errorData.error || response.statusText
                        }`
                    );
                }
            } catch (error) {
                console.error("Failed to delete ATM:", error);
                alert(`Failed to delete ATM: ${error.message}`);
            }
        };

        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">ATM Management</h3>
                    <button
                        onClick={() =>
                            showForm ? handleCancel() : setShowForm(true)
                        }
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                        {showForm ? "Cancel" : "Add ATM"}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-2 gap-4"
                        >
                            <input
                                placeholder="ATM Name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 col-span-3"
                                required
                            />
                            <input
                                placeholder="Location"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        location: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Latitude (for routing)"
                                value={formData.latitude}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        latitude: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Longitude (for routing)"
                                value={formData.longitude}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        longitude: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                            <input
                                type="number"
                                placeholder="Capacity"
                                value={formData.capacity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        capacity: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Current Balance"
                                value={formData.current_balance}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        current_balance: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Daily Avg Demand"
                                value={formData.daily_avg_demand}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        daily_avg_demand: e.target.value,
                                    })
                                }
                                className="border border-gray-300 rounded-md px-3 py-2 col-span-3"
                                required
                            />
                            
                            {/* Profile Override Selector */}
                            <div className="col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Profile Override (Optional)
                                </label>
                                <select
                                    value={formData.profile_override_type === 'preset' ? formData.profile_override : 
                                           formData.profile_override_type === 'custom' ? `custom_${formData.profile_override_id}` : 
                                           'auto'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'auto') {
                                            setFormData({
                                                ...formData,
                                                profile_override: null,
                                                profile_override_type: null,
                                                profile_override_id: null
                                            });
                                        } else if (value.startsWith('custom_')) {
                                            const customId = parseInt(value.replace('custom_', ''));
                                            const customProfile = availableProfiles.find(p => p.id === customId);
                                            setFormData({
                                                ...formData,
                                                profile_override: customProfile?.name,
                                                profile_override_type: 'custom',
                                                profile_override_id: customId
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                profile_override: value,
                                                profile_override_type: 'preset',
                                                profile_override_id: null
                                            });
                                        }
                                    }}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="auto">Auto-detect from location</option>
                                    <optgroup label="Preset Profiles">
                                        {availableProfiles.filter(p => p.is_preset).map(profile => (
                                            <option key={profile.name} value={profile.name}>
                                                {profile.name.replace(/_/g, ' ')} ({profile.usage_count} ATMs)
                                            </option>
                                        ))}
                                    </optgroup>
                                    {availableProfiles.filter(p => !p.is_preset).length > 0 && (
                                        <optgroup label="Custom Profiles">
                                            {availableProfiles.filter(p => !p.is_preset).map(profile => (
                                                <option key={profile.id} value={`custom_${profile.id}`}>
                                                    {profile.name} ({profile.usage_count} ATMs)
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.profile_override_type ? 
                                        `Using ${formData.profile_override_type} profile: ${formData.profile_override}` : 
                                        'Profile will be auto-detected from ATM name and location'}
                                </p>
                            </div>
                            
                            <button
                                type="submit"
                                className="col-span-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                            >
                                {editingATM ? "Update ATM" : "Add ATM"}
                            </button>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <div>Coordinates</div>
                                    <div className="text-xs normal-case text-gray-400">
                                        (Lat, Long)
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Profile
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Daily Demand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Data Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Model Accuracy (MAPE)
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Model Metrics
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Cash Status
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {atms.map((atm) => {
                                const shortage = Math.max(
                                    0,
                                    atm.daily_avg_demand - atm.current_balance
                                );
                                const isLow = shortage > 0;
                                return (
                                    <tr key={atm.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {atm.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {atm.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {atm.location}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {atm.latitude && atm.longitude ? (
                                                <span className="text-xs">
                                                    📍 {atm.latitude.toFixed(4)}
                                                    , {atm.longitude.toFixed(4)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    Not set
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {atm.detected_profile ? (
                                                <span className="px-2 py-1 text-xs rounded-md bg-purple-100 text-purple-800 font-medium">
                                                    {atm.detected_profile.replace(/_/g, ' ')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    Default
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            $
                                            {atm.current_balance.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            $
                                            {atm.daily_avg_demand.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${
                                                    atm.transaction_count === 0
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : atm.transaction_count <
                                                          100
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-green-100 text-green-800"
                                                }`}
                                            >
                                                {atm.transaction_count === 0
                                                    ? "No Data"
                                                    : atm.transaction_count <
                                                      100
                                                    ? `${atm.transaction_count} txns`
                                                    : `${atm.transaction_count} txns ✓`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {atm.mape === 'outdated' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-800">
                                                        ⚠ Outdated
                                                    </span>
                                                    {atm.best_model && (
                                                        <span className="text-xs text-gray-500">
                                                            {atm.best_model}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-orange-600 font-medium">
                                                        Profile Changed
                                                    </span>
                                                </div>
                                            ) : atm.mape !== null &&
                                              atm.mape !== undefined ? (
                                                <div className="flex flex-col gap-1">
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                                                            atm.mape < 20
                                                                ? "bg-green-100 text-green-800"
                                                                : atm.mape < 40
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {atm.mape.toFixed(2)}%
                                                    </span>
                                                    {atm.best_model && (
                                                        <span className="text-xs text-gray-500">
                                                            {atm.best_model}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    Not Trained
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {atm.transaction_count > 0 ? (
                                                <button
                                                    onClick={() =>
                                                        setMetricsModalATM(atm)
                                                    }
                                                    className="text-purple-600 hover:text-purple-900 font-medium text-xs underline"
                                                >
                                                    View Metrics
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${
                                                    isLow
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-green-100 text-green-800"
                                                }`}
                                            >
                                                {isLow
                                                    ? `Low (-$${shortage.toLocaleString()})`
                                                    : "Adequate"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center justify-center gap-2">
                                                {atm.transaction_count === 0 ? (
                                                    <>
                                                        {/* Quick Train Button for Untrained ATMs */}
                                                        <button
                                                            onClick={async () => {
                                                                // Auto-generate data then train
                                                                setSyntheticDataATM(
                                                                    atm
                                                                );
                                                            }}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 shadow-sm flex items-center gap-1.5 text-xs"
                                                            title="Generate data and train model (like ATMs 1-6)"
                                                        >
                                                            Quick Train
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleEdit(atm)
                                                            }
                                                            className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                                                        >
                                                            Edit
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                handleEdit(atm)
                                                            }
                                                            className="text-blue-600 hover:text-blue-900 font-medium mr-3"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setTrainingModalATM(
                                                                    atm
                                                                )
                                                            }
                                                            className="text-purple-600 hover:text-purple-900 font-medium mr-3"
                                                            title="Train ML Model"
                                                        >
                                                            Train Model
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleDelete(atm.id)
                                                    }
                                                    className="text-red-600 hover:text-red-900 font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Training Modal */}
                {trainingModalATM && (
                    <ModelTrainingModal
                        atm={trainingModalATM}
                        onClose={() => setTrainingModalATM(null)}
                        onTrainingComplete={(atmId) => {
                            console.log(`Training completed for ATM ${atmId}`);
                            fetchData(); // Refresh data
                            // Don't close modal - let user see results and close manually
                        }}
                        API_BASE={API_BASE}
                    />
                )}

                {/* Metrics Modal */}
                {metricsModalATM && (
                    <MetricsModal
                        atm={metricsModalATM}
                        onClose={() => setMetricsModalATM(null)}
                    />
                )}

                {/* Synthetic Data Generator Modal */}
                {syntheticDataATM && (
                    <SyntheticDataGenerator
                        atmId={syntheticDataATM.id}
                        atmName={syntheticDataATM.name}
                        onDataGenerated={() => {
                            fetchData(); // Refresh data
                        }}
                        onClose={() => setSyntheticDataATM(null)}
                        onTrainNow={(atmId) => {
                            // Open training modal after data generation
                            const atm = atms.find((a) => a.id === atmId);
                            if (atm) {
                                setTrainingModalATM(atm);
                            }
                        }}
                    />
                )}
            </div>
        );
    };

    // Show login page if not authenticated (after all hooks and component definitions)
    if (!isAuthenticated) {
        return <AuthPage onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Banknote className="h-8 w-8 text-blue-500 mr-2" />
                            <span className="text-xl font-bold text-gray-900">
                                Smart ATM Optimizer
                            </span>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                <span>{currentUser?.email}</span>
                            </div>

                            {/* Access Control Button (Root Only) */}
                            {currentUser?.is_root && (
                                <button
                                    onClick={() =>
                                        setActiveTab("access-control")
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                                        activeTab === "access-control"
                                            ? "bg-purple-600 text-white"
                                            : "text-purple-700 hover:text-purple-900 hover:bg-purple-50 border-2 border-purple-600"
                                    }`}
                                >
                                    <Shield className="h-4 w-4" />
                                    Access Control
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
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
                                    {
                                        id: "dashboard",
                                        label: "Dashboard",
                                        icon: TrendingUp,
                                    },
                                    {
                                        id: "ml-forecast",
                                        label: "ML Forecast",
                                        icon: Brain,
                                    },
                                    {
                                        id: "ai-recommendations",
                                        label: "AI Recommendations",
                                        icon: Sparkles,
                                    },
                                    {
                                        id: "optimization",
                                        label: "Optimization",
                                        icon: Gauge,
                                    },
                                    {
                                        id: "transaction-history",
                                        label: "Transaction History",
                                        icon: Calendar,
                                    },
                                    {
                                        id: "vaults",
                                        label: "Vaults",
                                        icon: Building,
                                    },
                                    {
                                        id: "atms",
                                        label: "ATMs",
                                        icon: Database,
                                    },
                                    {
                                        id: "vehicles",
                                        label: "Vehicles",
                                        icon: Truck,
                                    },
                                    {
                                        id: "route-planning",
                                        label: "Route Planning",
                                        icon: Map,
                                    },
                                    {
                                        id: "route-dashboard",
                                        label: "Routes",
                                        icon: Route,
                                    },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() =>
                                                setActiveTab(item.id)
                                            }
                                            className={`w-full flex items-center px-4 py-2 text-left rounded-md transition-colors ${
                                                activeTab === item.id
                                                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                                                    : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            <Icon className="h-5 w-5 mr-3" />
                                            {item.label}
                                        </button>
                                    );
                                })}

                                {/* Admin-only Profile Manager */}
                                {currentUser?.is_root && (
                                    <button
                                        onClick={() => setActiveTab("profile-manager")}
                                        className={`w-full flex items-center px-4 py-2 text-left rounded-md transition-colors ${
                                            activeTab === "profile-manager"
                                                ? "bg-purple-50 text-purple-700 border-r-2 border-purple-500"
                                                : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        <UserCog className="h-5 w-5 mr-3" />
                                        Profile Manager
                                    </button>
                                )}
                            </div>
                        </nav>
                    </div>

                    <div className="flex-1">
                        {activeTab === "dashboard" && <Dashboard />}
                        {activeTab === "ml-forecast" && <MLForecastTab />}
                        {activeTab === "ai-recommendations" && (
                            <AIRecommendationsTab />
                        )}
                        {activeTab === "optimization" && <OptimizationTab />}
                        {activeTab === "transaction-history" && (
                            <TransactionHistoryTab />
                        )}
                        {activeTab === "vaults" && <VaultManagement />}
                        {activeTab === "atms" && <ATMManagement />}
                        {activeTab === "vehicles" && <VehicleManagement />}
                        {activeTab === "route-planning" && <RoutePlanning />}
                        {activeTab === "route-dashboard" && <RouteDashboard />}
                        {activeTab === "profile-manager" &&
                            currentUser?.is_root && <ProfileManager />}
                        {activeTab === "access-control" &&
                            currentUser?.is_root && <AccessControl />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartATMDashboard;
