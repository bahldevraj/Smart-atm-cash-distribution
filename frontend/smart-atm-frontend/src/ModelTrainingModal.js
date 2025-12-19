import React, { useState, useEffect, useRef } from "react";
import {
    Brain,
    CheckCircle,
    AlertCircle,
    Clock,
    TrendingUp,
    Database,
    Zap,
    RefreshCw,
} from "lucide-react";

const ModelTrainingModal = ({ atm, onClose, onTrainingComplete, API_BASE }) => {
    const [status, setStatus] = useState(null);
    const [training, setTraining] = useState(false);
    const [error, setError] = useState(null);
    const [pollInterval, setPollInterval] = useState(null);
    const [showDataOptions, setShowDataOptions] = useState(false);
    const [regeneratingData, setRegeneratingData] = useState(false);
    const [dataConfig, setDataConfig] = useState({ days: 365 });
    const [completedJob, setCompletedJob] = useState(null); // Store completed job data
    const [dataJustRegenerated, setDataJustRegenerated] = useState(false); // Track if data was just regenerated
    const [trainingStartTime, setTrainingStartTime] = useState(null); // Track when training started
    const [lastProgressUpdate, setLastProgressUpdate] = useState(null); // Track last progress change
    const pollIntervalRef = useRef(null); // Ref to ensure interval is always cleared

    // Check model status on mount
    useEffect(() => {
        fetchModelStatus();
    }, []);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, []);

    // Handle tab visibility changes to maintain polling
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && training) {
                // Tab became visible and training is active - poll immediately
                pollTrainingStatus();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [training]);

    const fetchModelStatus = async () => {
        try {
            const response = await fetch(
                `${API_BASE}/atms/${atm.id}/model-status`
            );
            const data = await response.json();
            setStatus(data);

            // Also fetch demand history data
            const historyResponse = await fetch(
                `${API_BASE}/atms/${atm.id}/demand-history`
            );
            const historyData = await historyResponse.json();
            setStatus((prevStatus) => ({
                ...prevStatus,
                demand_history: historyData.demand_history || [],
                total_training_records: historyData.total_records || 0,
                has_training_data: historyData.has_training_data || false,
            }));
        } catch (err) {
            setError("Failed to fetch model status");
            console.error(err);
        }
    };

    const startTraining = async (models = ["arima", "lstm"]) => {
        setTraining(true);
        setError(null);
        setTrainingStartTime(Date.now());
        setLastProgressUpdate(0);

        try {
            const response = await fetch(
                `${API_BASE}/atms/${atm.id}/train-model`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ models }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error);
            }

            const data = await response.json();

            // Poll immediately to show initial status
            await pollTrainingStatus();

            // Start polling for status with more aggressive timing
            const interval = setInterval(() => {
                pollTrainingStatus();
            }, 1500); // Poll every 1.5 seconds for better responsiveness

            setPollInterval(interval);
            pollIntervalRef.current = interval;
        } catch (err) {
            setError(err.message);
            setTraining(false);
        }
    };

    const pollTrainingStatus = async () => {
        try {
            // Add timestamp to prevent caching without triggering CORS preflight
            const timestamp = Date.now();
            const response = await fetch(
                `${API_BASE}/atms/${atm.id}/training-status?_=${timestamp}`
            );

            if (response.status === 404) {
                // No job found, stop polling
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setPollInterval(null);
                }
                setTraining(false);
                return;
            }

            const jobData = await response.json();

            // Track progress changes to detect stalls
            const currentProgress = jobData.progress || 0;
            if (
                lastProgressUpdate === null ||
                lastProgressUpdate !== currentProgress
            ) {
                setLastProgressUpdate(currentProgress);
            }

            // Check for stalled training (stuck at same progress for 5+ minutes)
            const now = Date.now();
            if (trainingStartTime && now - trainingStartTime > 5 * 60 * 1000) {
                // More than 5 minutes elapsed
                const timeSinceProgress =
                    now - (lastProgressUpdate || trainingStartTime);
                if (
                    timeSinceProgress > 3 * 60 * 1000 &&
                    currentProgress < 100
                ) {
                    // Stuck at same progress for 3+ minutes
                    console.warn("Training appears stalled - stopping polling");
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        setPollInterval(null);
                    }
                    setTraining(false);
                    setError(
                        "Training appears to have stalled. Please restart the backend and try again."
                    );
                    return;
                }
            }

            // Update status display
            setStatus((prev) => ({
                ...prev,
                training_job: jobData,
            }));

            // Check if completed
            if (jobData.status === "completed") {
                // Stop polling immediately
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setPollInterval(null);
                }
                setTraining(false);

                // Store the completed job data so it persists
                setCompletedJob(jobData);

                console.log("Training completed! Results:", jobData.results);

                // Refresh model status to update has_trained_model flag
                await fetchModelStatus();

                // Don't call onTrainingComplete to prevent fetchData() which might close modal
                // User will manually close modal after reviewing results

                // Keep modal open to show results - user must click Close
            } else if (jobData.status === "failed") {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setPollInterval(null);
                }
                setTraining(false);
                setError(jobData.error || "Training failed");
                console.error("Training failed:", jobData.error);
            }
        } catch (err) {
            console.error("Error polling training status:", err);
            // Don't stop polling on network errors - keep trying
        }
    };

    const regenerateData = async () => {
        setRegeneratingData(true);
        setError(null);
        setShowDataOptions(false); // Hide config panel immediately

        try {
            const response = await fetch(
                `${API_BASE}/atms/${atm.id}/generate-synthetic-data`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        days: dataConfig.days,
                        force: true, // Force regeneration even if data exists
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error);
            }

            const result = await response.json();
            console.log("Data regenerated:", result);

            // Refresh model status
            await fetchModelStatus();

            setRegeneratingData(false);
            setDataJustRegenerated(true); // Mark that data was just regenerated

            // Automatically start training after data generation
            await startTraining();
        } catch (err) {
            setError(err.message);
            setRegeneratingData(false);
        }
    };

    const getStatusColor = () => {
        if (!status) return "gray";
        if (status.has_trained_model) return "green";
        if (status.training_ready) return "blue";
        if (status.training_recommended) return "yellow";
        return "red";
    };

    const getStatusIcon = () => {
        const color = getStatusColor();
        if (color === "green")
            return <CheckCircle className="text-green-500" size={24} />;
        if (color === "blue")
            return <TrendingUp className="text-blue-500" size={24} />;
        if (color === "yellow")
            return <Clock className="text-yellow-500" size={24} />;
        return <AlertCircle className="text-red-500" size={24} />;
    };

    if (!status) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full">
                    <div className="text-center">Loading...</div>
                </div>
            </div>
        );
    }

    const handleClose = () => {
        // Call onTrainingComplete when user manually closes to refresh data
        if (completedJob && onTrainingComplete) {
            onTrainingComplete(atm.id);
        }
        onClose();
    };

    const trainingJob = status.training_job;

    const handleBackdropClick = (e) => {
        // Only close if clicking directly on the backdrop and not during training
        if (e.target === e.currentTarget && !training && !regeneratingData) {
            handleClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Brain className="text-purple-600" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Model Training
                            </h2>
                            <p className="text-gray-600">{atm.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={training || regeneratingData}
                    >
                        ✕
                    </button>
                </div>

                {/* Current Status */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                        {getStatusIcon()}
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                                Current Status
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Model Status:
                                    </span>
                                    <span
                                        className={`font-medium ${
                                            atm.profile_changed
                                                ? "text-orange-600"
                                                : status.has_trained_model
                                                ? "text-green-600"
                                                : "text-yellow-600"
                                        }`}
                                    >
                                        {atm.profile_changed
                                            ? "⚠ Needs Retraining"
                                            : status.has_trained_model
                                            ? "Trained ✓"
                                            : "Not Trained"}
                                    </span>
                                </div>
                                {atm.profile_changed && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <p className="text-xs text-orange-800 font-medium">
                                            ⚠ Profile Changed
                                        </p>
                                        <p className="text-xs text-orange-700 mt-1">
                                            The ATM's profile has been modified.
                                            Previous model accuracy is no longer
                                            valid. Please retrain the model.
                                        </p>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Transactions:
                                    </span>
                                    <span className="font-medium">
                                        {status.transaction_count}
                                    </span>
                                </div>
                                {atm.last_trained_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Last Trained:
                                        </span>
                                        <span className="font-medium text-blue-600">
                                            {new Date(
                                                atm.last_trained_at
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {status.has_trained_model &&
                                    status.prediction_method?.metrics &&
                                    !atm.profile_changed && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                MAPE:
                                            </span>
                                            <span
                                                className={`font-medium ${
                                                    parseFloat(
                                                        status.prediction_method
                                                            .metrics.mape
                                                    ) < 20
                                                        ? "text-green-600"
                                                        : parseFloat(
                                                              status
                                                                  .prediction_method
                                                                  .metrics.mape
                                                          ) < 40
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {parseFloat(
                                                    status.prediction_method
                                                        .metrics.mape
                                                ).toFixed(2)}
                                                %
                                            </span>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                            <strong>Recommendation:</strong>{" "}
                            {status.recommendation}
                        </p>
                    </div>
                </div>

                {/* Training Data Section */}
                <div className="bg-green-50 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <Database className="w-6 h-6 text-green-600 mt-1" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                                Training Data
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Training Records:
                                    </span>
                                    <span
                                        className={`font-medium ${
                                            (status.total_training_records ||
                                                0) > 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {status.total_training_records || 0}{" "}
                                        records
                                    </span>
                                </div>
                                {status.demand_history &&
                                    status.demand_history.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-600 mb-2">
                                                Recent Training Data:
                                            </p>
                                            <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
                                                {status.demand_history
                                                    .slice(-5)
                                                    .map((record, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <span>
                                                                {
                                                                    record.formatted_date
                                                                }
                                                            </span>
                                                            <span className="font-medium">
                                                                {
                                                                    record.formatted_demand
                                                                }
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                {(!status.demand_history ||
                                    status.demand_history.length === 0) && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                        <p className="text-xs text-red-800">
                                            ⚠ No training data available.
                                            Generate synthetic data or wait for
                                            more transactions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Training Progress - Combined for smooth transition */}
                {(regeneratingData ||
                    training ||
                    (trainingJob &&
                        trainingJob.progress > 0 &&
                        !completedJob)) && (
                    <div className="bg-purple-50 rounded-lg p-6 mb-6">
                        <h3 className="font-semibold text-lg mb-4">
                            Training Progress
                        </h3>

                        {/* Step Indicator */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                {/* Step 0: Generating Data */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            transition: "all 0.3s",
                                            flexShrink: 0,
                                            backgroundColor:
                                                trainingJob &&
                                                trainingJob.progress >= 20
                                                    ? "#22c55e"
                                                    : "#9333ea",
                                            color: "#ffffff",
                                            animation:
                                                trainingJob &&
                                                trainingJob.progress >= 20
                                                    ? "none"
                                                    : "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                                        }}
                                    >
                                        {trainingJob &&
                                        trainingJob.progress >= 20
                                            ? "✓"
                                            : "0"}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        Generate Data
                                    </div>
                                </div>
                                <div
                                    className={`flex-1 h-1 mx-2 flex-shrink transition-all ${
                                        trainingJob &&
                                        trainingJob.progress >= 30
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                    }`}
                                ></div>

                                {/* Step 1: Data Preparation */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            transition: "all 0.3s",
                                            flexShrink: 0,
                                            backgroundColor:
                                                trainingJob &&
                                                trainingJob.progress >= 40
                                                    ? "#22c55e"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 20
                                                    ? "#9333ea"
                                                    : "#d1d5db",
                                            color:
                                                trainingJob &&
                                                trainingJob.progress >= 40
                                                    ? "#ffffff"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 20
                                                    ? "#ffffff"
                                                    : "#4b5563",
                                            animation:
                                                trainingJob &&
                                                trainingJob.progress >= 40
                                                    ? "none"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 20
                                                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                                                    : "none",
                                        }}
                                    >
                                        {trainingJob &&
                                        trainingJob.progress >= 40
                                            ? "✓"
                                            : "1"}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        Data Prep
                                    </div>
                                </div>
                                <div
                                    className={`flex-1 h-1 mx-2 flex-shrink transition-all ${
                                        trainingJob &&
                                        trainingJob.progress >= 50
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                    }`}
                                ></div>

                                {/* Step 2: ARIMA Training */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            transition: "all 0.3s",
                                            flexShrink: 0,
                                            backgroundColor:
                                                trainingJob &&
                                                trainingJob.progress >= 65
                                                    ? "#22c55e"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 40
                                                    ? "#9333ea"
                                                    : "#d1d5db",
                                            color:
                                                trainingJob &&
                                                trainingJob.progress >= 65
                                                    ? "#ffffff"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 40
                                                    ? "#ffffff"
                                                    : "#4b5563",
                                            animation:
                                                trainingJob &&
                                                trainingJob.progress >= 65
                                                    ? "none"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 40
                                                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                                                    : "none",
                                        }}
                                    >
                                        {trainingJob &&
                                        trainingJob.progress >= 65
                                            ? "✓"
                                            : "2"}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        ARIMA
                                    </div>
                                </div>
                                <div
                                    className={`flex-1 h-1 mx-2 flex-shrink transition-all ${
                                        trainingJob &&
                                        trainingJob.progress >= 75
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                    }`}
                                ></div>

                                {/* Step 3: LSTM Training */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            transition: "all 0.3s",
                                            flexShrink: 0,
                                            backgroundColor:
                                                trainingJob &&
                                                trainingJob.progress >= 95
                                                    ? "#22c55e"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 65
                                                    ? "#9333ea"
                                                    : "#d1d5db",
                                            color:
                                                trainingJob &&
                                                trainingJob.progress >= 95
                                                    ? "#ffffff"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 65
                                                    ? "#ffffff"
                                                    : "#4b5563",
                                            animation:
                                                trainingJob &&
                                                trainingJob.progress >= 95
                                                    ? "none"
                                                    : trainingJob &&
                                                      trainingJob.progress >= 65
                                                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                                                    : "none",
                                        }}
                                    >
                                        {trainingJob &&
                                        trainingJob.progress >= 95
                                            ? "✓"
                                            : "3"}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        LSTM
                                    </div>
                                </div>
                            </div>

                            {/* Current Step Message */}
                            <div className="text-center text-sm text-gray-700 mt-4">
                                {regeneratingData ? (
                                    <>
                                        <RefreshCw
                                            className="inline animate-spin mr-2"
                                            size={16}
                                        />
                                        Generating {dataConfig.days} days of
                                        synthetic transaction data...
                                    </>
                                ) : trainingJob ? (
                                    trainingJob.message
                                ) : null}
                            </div>
                        </div>

                        {/* Training Details */}
                        {trainingJob && training && (
                            <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                    Models:{" "}
                                    {trainingJob.models
                                        .join(", ")
                                        .toUpperCase()}
                                </div>
                                <div>
                                    Status:{" "}
                                    <span className="font-medium">
                                        {trainingJob.status}
                                    </span>
                                </div>
                                {trainingJob.started_at && (
                                    <div>
                                        Started:{" "}
                                        {new Date(
                                            trainingJob.started_at
                                        ).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Completed Training Summary */}
                {completedJob && completedJob.status === "completed" && (
                    <div className="bg-green-50 rounded-lg p-6 mb-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-800">
                            <CheckCircle size={24} />
                            Training Completed Successfully!
                        </h3>

                        {/* Completed Steps */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            flexShrink: 0,
                                            backgroundColor: "#22c55e",
                                            color: "#ffffff",
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <div className="ml-2 text-sm font-medium">
                                        Generate Data
                                    </div>
                                </div>
                                <div className="flex-1 h-1 mx-2 bg-green-500"></div>

                                <div className="flex items-center flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            flexShrink: 0,
                                            backgroundColor: "#22c55e",
                                            color: "#ffffff",
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <div className="ml-2 text-sm font-medium">
                                        Data Prep
                                    </div>
                                </div>
                                <div className="flex-1 h-1 mx-2 bg-green-500"></div>

                                <div className="flex items-center flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            flexShrink: 0,
                                            backgroundColor: "#22c55e",
                                            color: "#ffffff",
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <div className="ml-2 text-sm font-medium">
                                        ARIMA
                                    </div>
                                </div>
                                <div className="flex-1 h-1 mx-2 bg-green-500"></div>

                                <div className="flex items-center flex-1">
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            maxWidth: "32px",
                                            maxHeight: "32px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "600",
                                            flexShrink: 0,
                                            backgroundColor: "#22c55e",
                                            color: "#ffffff",
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <div className="ml-2 text-sm font-medium">
                                        LSTM
                                    </div>
                                </div>
                            </div>
                        </div>

                        {completedJob.results && (
                            <div className="space-y-3">
                                {Object.entries(completedJob.results).map(
                                    ([model, metrics]) => (
                                        <div
                                            key={model}
                                            className="bg-white rounded p-3"
                                        >
                                            <div className="font-medium text-gray-900 mb-2">
                                                {model.toUpperCase()} Model
                                            </div>
                                            {metrics.error ? (
                                                <p className="text-sm text-red-600">
                                                    Error: {metrics.error}
                                                </p>
                                            ) : (
                                                <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
                                                    <div>
                                                        <span className="font-medium">
                                                            MAE:
                                                        </span>{" "}
                                                        {(
                                                            metrics.MAE ||
                                                            metrics.mae
                                                        )?.toFixed(2) || "N/A"}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">
                                                            RMSE:
                                                        </span>{" "}
                                                        {(
                                                            metrics.RMSE ||
                                                            metrics.rmse
                                                        )?.toFixed(2) || "N/A"}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">
                                                            MAPE:
                                                        </span>{" "}
                                                        {(
                                                            metrics.MAPE ||
                                                            metrics.mape
                                                        )?.toFixed(2) || "N/A"}
                                                        %
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle
                                className="text-red-500 flex-shrink-0"
                                size={20}
                            />
                            <div>
                                <h4 className="font-semibold text-red-800 mb-1">
                                    Training Error
                                </h4>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {!status.has_trained_model && !training && (
                        <>
                            <button
                                onClick={() => startTraining(["arima", "lstm"])}
                                disabled={
                                    !status.training_recommended || training
                                }
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                                    status.training_recommended
                                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                <Zap size={20} />
                                Train Both Models
                                {status.training_ready && " (Recommended)"}
                            </button>

                            {status.training_recommended && (
                                <button
                                    onClick={() => startTraining(["arima"])}
                                    disabled={training}
                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                                >
                                    ARIMA Only (Fast)
                                </button>
                            )}
                        </>
                    )}

                    {status.has_trained_model &&
                        !training &&
                        !regeneratingData && (
                            <>
                                {!showDataOptions ? (
                                    <>
                                        <button
                                            onClick={() =>
                                                startTraining(["arima", "lstm"])
                                            }
                                            className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                                        >
                                            <Zap size={20} />
                                            Retrain Models
                                        </button>
                                        <button
                                            onClick={() =>
                                                setShowDataOptions(true)
                                            }
                                            className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={20} />
                                            Regenerate Data & Train
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-900 mb-3">
                                            Configure Data Generation
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Training Days (30-365)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="30"
                                                    max="365"
                                                    value={dataConfig.days}
                                                    onChange={(e) =>
                                                        setDataConfig({
                                                            ...dataConfig,
                                                            days: parseInt(
                                                                e.target.value
                                                            ),
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Current:{" "}
                                                    {status.transaction_count}{" "}
                                                    transactions
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={regenerateData}
                                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                                                >
                                                    Generate & Train
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setShowDataOptions(
                                                            false
                                                        )
                                                    }
                                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    {regeneratingData && (
                        <div className="flex-1 text-center py-4">
                            <div className="text-blue-600 font-medium">
                                Regenerating {dataConfig.days} days of data...
                            </div>
                        </div>
                    )}

                    {!showDataOptions && (
                        <button
                            onClick={handleClose}
                            disabled={training || regeneratingData}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                        >
                            {training || regeneratingData
                                ? "Processing..."
                                : "Close"}
                        </button>
                    )}
                </div>

                {/* Data Requirements Info */}
                {!status.training_recommended && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-2">
                            Data Requirements
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>✓ Minimum: 30 transactions (basic model)</li>
                            <li>
                                ✓ Recommended: 100+ transactions (high accuracy)
                            </li>
                            <li>
                                ✓ Current: {status.transaction_count}{" "}
                                transactions
                            </li>
                        </ul>
                        <p className="text-sm text-yellow-700 mt-2">
                            Need {Math.max(0, 30 - status.transaction_count)}{" "}
                            more transactions to start training.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelTrainingModal;
