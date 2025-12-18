import React, { useState } from "react";

const SyntheticDataGenerator = ({
    atmId,
    atmName,
    onDataGenerated,
    onClose,
    onTrainNow,
}) => {
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(90);

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(
                `http://localhost:5000/api/atms/${atmId}/generate-synthetic-data`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate data");
            }

            setResult(data);

            // Call parent callback after successful generation (just to refresh data, don't close modal)
            if (onDataGenerated) {
                onDataGenerated();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">
                                Generate Synthetic Data
                            </h2>
                            <p className="text-purple-100 mt-1">
                                Create realistic transaction history for
                                training
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-purple-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* ATM Info */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            Target ATM
                        </h3>
                        <div className="text-blue-700">
                            <p>
                                <span className="font-medium">ID:</span> {atmId}
                            </p>
                            <p>
                                <span className="font-medium">Name:</span>{" "}
                                {atmName}
                            </p>
                        </div>
                    </div>

                    {/* Configuration */}
                    {!result && (
                        <div className="space-y-4 mb-6">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <span className="text-2xl mr-3">⚠️</span>
                                    <div>
                                        <h4 className="font-semibold text-yellow-900 mb-1">
                                            About Synthetic Data
                                        </h4>
                                        <p className="text-yellow-800 text-sm">
                                            This will generate realistic
                                            transaction history using AI-powered
                                            patterns based on the ATM's location
                                            context. Each ATM gets unique
                                            patterns ensuring model diversity.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    History Duration (Days)
                                </label>
                                <input
                                    type="number"
                                    value={days}
                                    onChange={(e) =>
                                        setDays(
                                            Math.max(
                                                30,
                                                Math.min(
                                                    365,
                                                    parseInt(e.target.value) ||
                                                        90
                                                )
                                            )
                                        )
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    min="30"
                                    max="365"
                                    disabled={generating}
                                />
                                <p className="text-gray-500 text-sm mt-1">
                                    Recommended: 90 days (provides ~600-900
                                    transactions per ATM)
                                </p>
                            </div>

                            {/* Features List */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 mb-2">
                                    Uniqueness Constraints
                                </h4>
                                <ul className="text-green-800 text-sm space-y-1">
                                    <li>
                                        ✓ Location-aware patterns (airport,
                                        hospital, business, etc.)
                                    </li>
                                    <li>
                                        ✓ Unique peak hours based on location
                                        type
                                    </li>
                                    <li>
                                        ✓ Seasonal variations (holidays,
                                        weekends)
                                    </li>
                                    <li>
                                        ✓ Realistic withdrawal amount
                                        distributions
                                    </li>
                                    <li>
                                        ✓ ATM-specific random seed for
                                        reproducibility
                                    </li>
                                    <li>
                                        ✓ Hourly traffic patterns matching
                                        real-world behavior
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                                <span className="text-red-500 text-xl mr-2">
                                    ✗
                                </span>
                                <div>
                                    <h4 className="font-semibold text-red-900">
                                        Generation Failed
                                    </h4>
                                    <p className="text-red-700 text-sm mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Display */}
                    {result && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <span className="text-green-500 text-2xl mr-3">
                                        ✓
                                    </span>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-green-900 mb-2">
                                            Data Generated Successfully!
                                        </h4>
                                        <p className="text-green-700 text-sm mb-3">
                                            {result.message}
                                        </p>

                                        {/* Statistics Grid */}
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div className="bg-white rounded p-3 border border-green-100">
                                                <p className="text-gray-600 text-xs">
                                                    Transactions
                                                </p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    {result.generated_transactions.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-white rounded p-3 border border-green-100">
                                                <p className="text-gray-600 text-xs">
                                                    History Period
                                                </p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {result.days_of_history}{" "}
                                                    days
                                                </p>
                                            </div>
                                            {result.statistics && (
                                                <>
                                                    <div className="bg-white rounded p-3 border border-green-100">
                                                        <p className="text-gray-600 text-xs">
                                                            Avg Transaction
                                                        </p>
                                                        <p className="text-xl font-bold text-purple-600">
                                                            ₹
                                                            {result.statistics.avg_transaction?.toFixed(
                                                                0
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white rounded p-3 border border-green-100">
                                                        <p className="text-gray-600 text-xs">
                                                            Success Rate
                                                        </p>
                                                        <p className="text-xl font-bold text-indigo-600">
                                                            {result.statistics.success_rate?.toFixed(
                                                                1
                                                            )}
                                                            %
                                                        </p>
                                                    </div>
                                                    <div className="bg-white rounded p-3 border border-green-100 col-span-2">
                                                        <p className="text-gray-600 text-xs">
                                                            Profile Type
                                                        </p>
                                                        <p className="text-lg font-semibold text-gray-800 capitalize">
                                                            {
                                                                result
                                                                    .statistics
                                                                    .profile_type
                                                            }
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">
                                    🎯 Ready for Training!
                                </h4>
                                <p className="text-blue-800 text-sm mb-3">
                                    Your ATM now has{" "}
                                    {result.generated_transactions.toLocaleString()}{" "}
                                    transactions - the same training regime as
                                    ATMs 1-6 (ARIMA + LSTM models).
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            if (onTrainNow) {
                                                setTimeout(
                                                    () => onTrainNow(atmId),
                                                    500
                                                );
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all shadow-md text-sm"
                                    >
                                        Train Models Now
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-all text-sm"
                                    >
                                        Train Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        {!result ? (
                            <>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                                        generating
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                                    }`}
                                >
                                    {generating ? (
                                        <span className="flex items-center justify-center">
                                            <svg
                                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Generating Data...
                                        </span>
                                    ) : (
                                        "Generate Synthetic Data"
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={generating}
                                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-lg"
                            >
                                Close & Continue
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyntheticDataGenerator;
