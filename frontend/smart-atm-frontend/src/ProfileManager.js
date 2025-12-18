import React, { useState, useEffect } from "react";
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    Copy,
    AlertCircle,
    CheckCircle,
    Clock,
    Sliders,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ProfileManager = () => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [editingProfile, setEditingProfile] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [filterType, setFilterType] = useState("all"); // 'all', 'preset', 'custom'

    // Editor state
    const [profileName, setProfileName] = useState("");
    const [description, setDescription] = useState("");
    const [useCase, setUseCase] = useState("");
    const [baseVolume, setBaseVolume] = useState(500);
    const [peakHours, setPeakHours] = useState([]);
    const [weekendMultiplier, setWeekendMultiplier] = useState(1.0);
    const [seasonalityFactor, setSeasonalityFactor] = useState(1.0);
    const [withdrawalMin, setWithdrawalMin] = useState(1000);
    const [withdrawalMax, setWithdrawalMax] = useState(10000);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const token = localStorage.getItem("token");
            console.log("Fetching profiles from:", `${API_BASE}/profiles`);
            const response = await fetch(`${API_BASE}/profiles`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Profiles received:", data);
            console.log(
                "Preset profiles:",
                data.filter((p) => p.is_preset).length
            );
            console.log(
                "Custom profiles:",
                data.filter((p) => !p.is_preset).length
            );

            // Ensure data is an array
            if (Array.isArray(data)) {
                setProfiles(data);
            } else {
                console.error("Invalid response format:", data);
                setProfiles([]);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
            setProfiles([]);
            setLoading(false);
        }
    };

    const calculatePerformance = (params) => {
        const weekend = params.weekend_multiplier || 1.0;
        const seasonality = params.seasonality_factor || 1.0;
        const baseCv = 20;
        const weekendImpact = Math.abs(weekend - 1.0) * 30;
        const seasonImpact = Math.abs(seasonality - 1.0) * 20;
        const estimatedCv = baseCv + weekendImpact + seasonImpact;
        const mapeMin = Math.round(8 + estimatedCv * 0.2);
        const mapeMax = Math.round(12 + estimatedCv * 0.3);

        return {
            cv: Math.round(estimatedCv * 10) / 10,
            mape: `${mapeMin}-${mapeMax}%`,
            quality:
                estimatedCv < 35
                    ? "excellent"
                    : estimatedCv < 45
                    ? "good"
                    : "fair",
        };
    };

    const openEditor = (profile = null, cloneFrom = null) => {
        if (cloneFrom) {
            // Clone from existing profile
            const params = cloneFrom.parameters;
            setProfileName(cloneFrom.name + "_copy");
            setDescription(cloneFrom.description || "");
            setUseCase(cloneFrom.use_case || "");
            setBaseVolume(params.base_volume);
            setPeakHours(params.peak_hours || []);
            setWeekendMultiplier(params.weekend_multiplier);
            setSeasonalityFactor(params.seasonality_factor);
            setWithdrawalMin(params.withdrawal_range[0]);
            setWithdrawalMax(params.withdrawal_range[1]);
            setEditingProfile(null);
        } else if (profile) {
            // Edit existing custom profile
            const params = profile.parameters;
            setProfileName(profile.name);
            setDescription(profile.description || "");
            setUseCase(profile.use_case || "");
            setBaseVolume(params.base_volume);
            setPeakHours(params.peak_hours || []);
            setWeekendMultiplier(params.weekend_multiplier);
            setSeasonalityFactor(params.seasonality_factor);
            setWithdrawalMin(params.withdrawal_range[0]);
            setWithdrawalMax(params.withdrawal_range[1]);
            setEditingProfile(profile);
        } else {
            // New profile - defaults
            setProfileName("");
            setDescription("");
            setUseCase("");
            setBaseVolume(500);
            setPeakHours([9, 12, 18]);
            setWeekendMultiplier(1.0);
            setSeasonalityFactor(1.0);
            setWithdrawalMin(1000);
            setWithdrawalMax(10000);
            setEditingProfile(null);
        }
        setShowEditor(true);
    };

    const closeEditor = () => {
        setShowEditor(false);
        setEditingProfile(null);
    };

    const togglePeakHour = (hour) => {
        setPeakHours((prev) =>
            prev.includes(hour)
                ? prev.filter((h) => h !== hour)
                : [...prev, hour].sort((a, b) => a - b)
        );
    };

    const saveProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const profileData = {
                name: profileName,
                description: description,
                use_case: useCase,
                parameters: {
                    base_volume: parseInt(baseVolume),
                    peak_hours: peakHours,
                    weekend_multiplier: parseFloat(weekendMultiplier),
                    seasonality_factor: parseFloat(seasonalityFactor),
                    withdrawal_range: [
                        parseInt(withdrawalMin),
                        parseInt(withdrawalMax),
                    ],
                },
            };

            const url = editingProfile
                ? `${API_BASE}/profiles/${editingProfile.id}`
                : `${API_BASE}/profiles`;
            const method = editingProfile ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(profileData),
            });

            if (response.ok) {
                await fetchProfiles();
                closeEditor();
                alert(
                    editingProfile
                        ? "Profile updated successfully!"
                        : "Profile created successfully!"
                );
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile");
        }
    };

    const deleteProfile = async (profileId) => {
        if (!window.confirm("Are you sure you want to delete this profile?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/profiles/${profileId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                await fetchProfiles();
                alert("Profile deleted successfully!");
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error("Failed to delete profile:", error);
            alert("Failed to delete profile");
        }
    };

    const currentPerformance = calculatePerformance({
        weekend_multiplier: weekendMultiplier,
        seasonality_factor: seasonalityFactor,
    });

    const filteredProfiles = profiles.filter((p) => {
        if (filterType === "all") return true;
        if (filterType === "preset") return p.is_preset;
        if (filterType === "custom") return !p.is_preset;
        return true;
    });

    const presetProfiles = filteredProfiles.filter((p) => p.is_preset);
    const customProfiles = filteredProfiles.filter((p) => !p.is_preset);

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center">
                <div className="text-gray-500">Loading profiles...</div>
            </div>
        );
    }

    if (profiles.length === 0) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className="h-8 w-8 text-purple-600" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            Profile Manager
                        </h1>
                    </div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No profiles loaded
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Unable to load profiles. Check the browser console for
                        errors.
                    </p>
                    <button
                        onClick={fetchProfiles}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Settings className="h-8 w-8 text-purple-600" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            Profile Manager
                        </h1>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                            Admin Only
                        </span>
                    </div>
                    <button
                        onClick={() => openEditor()}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                        <Plus className="h-5 w-5" />
                        Create Custom Profile
                    </button>
                </div>
                <p className="text-gray-600">
                    Manage ATM transaction profiles. Create custom profiles or
                    use presets to fine-tune cash demand predictions.
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2">
                {[
                    {
                        id: "all",
                        label: "All Profiles",
                        count: profiles.length,
                    },
                    {
                        id: "preset",
                        label: "Preset Profiles",
                        count: presetProfiles.length,
                    },
                    {
                        id: "custom",
                        label: "Custom Profiles",
                        count: customProfiles.length,
                    },
                ].map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setFilterType(filter.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                            filterType === filter.id
                                ? "bg-purple-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50 border"
                        }`}
                    >
                        {filter.label} ({filter.count})
                    </button>
                ))}
            </div>

            {/* Profiles Grid */}
            <div className="space-y-6 mb-8">
                {/* Preset Profiles */}
                {filterType !== "custom" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Preset Profiles ({presetProfiles.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {presetProfiles.map((profile) => {
                                const perf = calculatePerformance(
                                    profile.parameters
                                );
                                return (
                                    <div
                                        key={profile.name}
                                        className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition cursor-pointer"
                                        onClick={() =>
                                            setSelectedProfile(profile)
                                        }
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">
                                                    {profile.name}
                                                </h3>
                                                <div className="flex gap-3 mt-1 text-sm text-gray-600">
                                                    <span>CV: ~{perf.cv}%</span>
                                                    <span>
                                                        MAPE: {perf.mape}
                                                    </span>
                                                    <span
                                                        className={`font-medium ${
                                                            perf.quality ===
                                                            "excellent"
                                                                ? "text-green-600"
                                                                : perf.quality ===
                                                                  "good"
                                                                ? "text-blue-600"
                                                                : "text-yellow-600"
                                                        }`}
                                                    >
                                                        {perf.quality.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditor(null, profile);
                                                }}
                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                                                title="Clone this profile"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 text-xs text-gray-500">
                                            <span>
                                                Vol:{" "}
                                                {profile.parameters.base_volume}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Weekend:{" "}
                                                {
                                                    profile.parameters
                                                        .weekend_multiplier
                                                }
                                                x
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Used by: {profile.usage_count}{" "}
                                                ATMs
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Custom Profiles */}
                {filterType !== "preset" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Sliders className="h-5 w-5 text-purple-600" />
                            Custom Profiles ({customProfiles.length})
                        </h2>
                        {customProfiles.length === 0 ? (
                            <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
                                <p className="text-gray-600 mb-4">
                                    No custom profiles yet
                                </p>
                                <button
                                    onClick={() => openEditor()}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                >
                                    Create Your First Profile
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {customProfiles.map((profile) => {
                                    const perf = calculatePerformance(
                                        profile.parameters
                                    );
                                    return (
                                        <div
                                            key={profile.id}
                                            className="bg-white p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer"
                                            onClick={() =>
                                                setSelectedProfile(profile)
                                            }
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {profile.name}
                                                    </h3>
                                                    {profile.description && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {
                                                                profile.description
                                                            }
                                                        </p>
                                                    )}
                                                    <div className="flex gap-3 mt-1 text-sm text-gray-600">
                                                        <span>
                                                            CV: ~{perf.cv}%
                                                        </span>
                                                        <span>
                                                            MAPE: {perf.mape}
                                                        </span>
                                                        <span
                                                            className={`font-medium ${
                                                                perf.quality ===
                                                                "excellent"
                                                                    ? "text-green-600"
                                                                    : perf.quality ===
                                                                      "good"
                                                                    ? "text-blue-600"
                                                                    : "text-yellow-600"
                                                            }`}
                                                        >
                                                            {perf.quality.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditor(profile);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                                        title="Edit profile"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteProfile(
                                                                profile.id
                                                            );
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Delete profile"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-500">
                                                <span>
                                                    Vol:{" "}
                                                    {
                                                        profile.parameters
                                                            .base_volume
                                                    }
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Weekend:{" "}
                                                    {
                                                        profile.parameters
                                                            .weekend_multiplier
                                                    }
                                                    x
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Used by:{" "}
                                                    {profile.usage_count} ATMs
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    <Clock className="h-3 w-3 inline" />{" "}
                                                    {new Date(
                                                        profile.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Profile Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingProfile
                                    ? "Edit Profile"
                                    : "Create Custom Profile"}
                            </h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Profile Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={profileName}
                                        onChange={(e) =>
                                            setProfileName(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g., my_custom_mall"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Use Case
                                    </label>
                                    <input
                                        type="text"
                                        value={useCase}
                                        onChange={(e) =>
                                            setUseCase(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g., Shopping malls, retail centers"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    rows={2}
                                    placeholder="Describe this profile and when to use it..."
                                />
                            </div>

                            {/* Parameters */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Base Volume */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Base Volume (transactions/day)
                                    </label>
                                    <input
                                        type="number"
                                        value={baseVolume}
                                        onChange={(e) =>
                                            setBaseVolume(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        min="100"
                                        max="1000"
                                    />
                                </div>

                                {/* Withdrawal Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Withdrawal Range (USD)
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            value={withdrawalMin}
                                            onChange={(e) =>
                                                setWithdrawalMin(e.target.value)
                                            }
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="Min"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            value={withdrawalMax}
                                            onChange={(e) =>
                                                setWithdrawalMax(e.target.value)
                                            }
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="Max"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Peak Hours */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Peak Hours (click to toggle)
                                </label>
                                <div className="grid grid-cols-12 gap-2">
                                    {Array.from(
                                        { length: 24 },
                                        (_, i) => i
                                    ).map((hour) => (
                                        <button
                                            key={hour}
                                            onClick={() => togglePeakHour(hour)}
                                            className={`p-2 text-sm font-medium rounded transition ${
                                                peakHours.includes(hour)
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            {hour}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    Selected: {peakHours.length} hours{" "}
                                    {peakHours.length > 0 &&
                                        `(${peakHours.join(", ")})`}
                                </p>
                            </div>

                            {/* Sliders */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Weekend Multiplier */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Weekend Multiplier: {weekendMultiplier}x
                                    </label>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="2.0"
                                        step="0.1"
                                        value={weekendMultiplier}
                                        onChange={(e) =>
                                            setWeekendMultiplier(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0.2x (Weekday only)</span>
                                        <span>2.0x (Weekend heavy)</span>
                                    </div>
                                </div>

                                {/* Seasonality Factor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Seasonality Factor: {seasonalityFactor}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="1.4"
                                        step="0.1"
                                        value={seasonalityFactor}
                                        onChange={(e) =>
                                            setSeasonalityFactor(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0.8 (Low seasonal)</span>
                                        <span>1.4 (High seasonal)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Estimate */}
                            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Performance Estimates
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">
                                            Estimated CV
                                        </div>
                                        <div
                                            className={`text-2xl font-bold ${
                                                currentPerformance.quality ===
                                                "excellent"
                                                    ? "text-green-600"
                                                    : currentPerformance.quality ===
                                                      "good"
                                                    ? "text-blue-600"
                                                    : "text-yellow-600"
                                            }`}
                                        >
                                            ~{currentPerformance.cv}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">
                                            Expected MAPE
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {currentPerformance.mape}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">
                                            Quality
                                        </div>
                                        <div
                                            className={`text-lg font-bold uppercase ${
                                                currentPerformance.quality ===
                                                "excellent"
                                                    ? "text-green-600"
                                                    : currentPerformance.quality ===
                                                      "good"
                                                    ? "text-blue-600"
                                                    : "text-yellow-600"
                                            }`}
                                        >
                                            {currentPerformance.quality}
                                        </div>
                                    </div>
                                </div>
                                {currentPerformance.cv >= 45 && (
                                    <div className="mt-3 flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                                        <AlertCircle className="h-4 w-4 mt-0.5" />
                                        <span>
                                            High volatility detected. Consider
                                            adjusting weekend multiplier
                                            (0.7-1.3) and seasonality (0.9-1.1)
                                            for better accuracy.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={closeEditor}
                                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveProfile}
                                disabled={
                                    !profileName || peakHours.length === 0
                                }
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingProfile
                                    ? "Update Profile"
                                    : "Create Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Profile Details */}
            {selectedProfile && !showEditor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {selectedProfile.name}
                            </h2>
                            {selectedProfile.is_preset && (
                                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                                    Preset Profile
                                </span>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            {selectedProfile.description && (
                                <p className="text-gray-700">
                                    {selectedProfile.description}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">
                                        Base Volume:
                                    </span>
                                    <span className="ml-2 font-semibold">
                                        {selectedProfile.parameters.base_volume}{" "}
                                        trans/day
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">
                                        Peak Hours:
                                    </span>
                                    <span className="ml-2 font-semibold">
                                        {selectedProfile.parameters.peak_hours.join(
                                            ", "
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">
                                        Weekend Multiplier:
                                    </span>
                                    <span className="ml-2 font-semibold">
                                        {
                                            selectedProfile.parameters
                                                .weekend_multiplier
                                        }
                                        x
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">
                                        Seasonality Factor:
                                    </span>
                                    <span className="ml-2 font-semibold">
                                        {
                                            selectedProfile.parameters
                                                .seasonality_factor
                                        }
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-600">
                                        Withdrawal Range:
                                    </span>
                                    <span className="ml-2 font-semibold">
                                        $
                                        {
                                            selectedProfile.parameters
                                                .withdrawal_range[0]
                                        }{" "}
                                        - $
                                        {
                                            selectedProfile.parameters
                                                .withdrawal_range[1]
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Usage</h4>
                                {selectedProfile.usage_count > 0 ? (
                                    <div>
                                        <p className="text-sm text-gray-700 mb-2">
                                            This profile is currently used by{" "}
                                            <strong>
                                                {selectedProfile.usage_count}
                                            </strong>{" "}
                                            ATM(s):
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedProfile.atm_names &&
                                                selectedProfile.atm_names.map(
                                                    (atmName, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-2 py-1 bg-white border border-blue-300 rounded text-xs text-blue-700"
                                                        >
                                                            {atmName}
                                                        </span>
                                                    )
                                                )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        This profile is not currently used by
                                        any ATMs.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            {!selectedProfile.is_preset && (
                                <>
                                    <button
                                        onClick={() => {
                                            setSelectedProfile(null);
                                            openEditor(selectedProfile);
                                        }}
                                        className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedProfile(null);
                                            deleteProfile(selectedProfile.id);
                                        }}
                                        className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileManager;
