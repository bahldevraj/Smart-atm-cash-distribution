import React, { useState, useEffect } from "react";
import { X, TrendingUp, BarChart3, Activity, CheckCircle } from "lucide-react";

const MetricsModal = ({ atm, onClose }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMetrics();
    }, [atm.id]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            // Fetch metrics from the CSV file via backend
            const response = await fetch(
                `http://localhost:5000/api/atms/${atm.id}/metrics`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch metrics");
            }
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            setError(err.message);
            console.error("Error fetching metrics:", err);
        } finally {
            setLoading(false);
        }
    };

    const MetricCard = ({ title, value, icon: Icon }) => (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-medium text-gray-700">{title}</h4>
            </div>
            <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
    );

    const ModelMetrics = ({ model, data }) => {
        if (!data) {
            return (
                <div className="text-center py-8 text-gray-500">
                    No metrics available for {model}
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <h3 className="text-base font-semibold text-gray-800">
                        {model} Model
                    </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <MetricCard
                        title="MAE"
                        value={data.mae ? data.mae.toFixed(2) : "N/A"}
                        icon={TrendingUp}
                    />
                    <MetricCard
                        title="RMSE"
                        value={data.rmse ? data.rmse.toFixed(2) : "N/A"}
                        icon={BarChart3}
                    />
                    <MetricCard
                        title="MAPE"
                        value={data.mape ? `${data.mape.toFixed(2)}%` : "N/A"}
                        icon={Activity}
                    />
                </div>
                {data.training_days && (
                    <div className="mt-2 text-xs text-gray-600">
                        <p>
                            <span className="font-medium">Training Days:</span>{" "}
                            {data.training_days}
                        </p>
                        {data.trained_date && (
                            <p>
                                <span className="font-medium">
                                    Trained Date:
                                </span>{" "}
                                {new Date(
                                    data.trained_date
                                ).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold">Model Metrics</h2>
                        <p className="text-purple-100 text-sm mt-1">
                            {atm.name} - {atm.location}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-500 rounded-full p-1.5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="mt-3 text-sm text-gray-600">
                                Loading metrics...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* ARIMA Metrics */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <ModelMetrics
                                    model="ARIMA"
                                    data={metrics?.arima}
                                />
                            </div>

                            {/* LSTM Metrics */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <ModelMetrics
                                    model="LSTM"
                                    data={metrics?.lstm}
                                />
                            </div>

                            {/* Best Model Indicator */}
                            {metrics && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-green-900">
                                                Best Model:{" "}
                                                {atm.best_model || "N/A"}
                                            </h3>
                                            <p className="text-xs text-green-700">
                                                MAPE:{" "}
                                                {atm.mape
                                                    ? atm.mape.toFixed(2)
                                                    : "N/A"}
                                                %
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MetricsModal;
