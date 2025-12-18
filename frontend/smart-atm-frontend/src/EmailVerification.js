import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

const EmailVerification = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [message, setMessage] = useState("");

    const API_BASE =
        process.env.REACT_APP_API_URL || "http://localhost:5000/api";

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setStatus("error");
            setMessage(
                "Invalid verification link. Please check your email for the correct link."
            );
            return;
        }

        verifyEmail(token);
    }, [searchParams]);

    const verifyEmail = async (token) => {
        try {
            const response = await fetch(`${API_BASE}/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus("success");
                setMessage(data.message || "Email verified successfully!");
                // Redirect to login after 3 seconds
                setTimeout(() => navigate("/"), 3000);
            } else {
                setStatus("error");
                setMessage(
                    data.error ||
                        "Verification failed. The link may have expired."
                );
            }
        } catch (error) {
            console.error("Verification error:", error);
            setStatus("error");
            setMessage("Failed to verify email. Please try again later.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* Status Icon */}
                    <div className="mb-6">
                        {status === "verifying" && (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                                <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                            </div>
                        )}
                        {status === "success" && (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                        )}
                        {status === "error" && (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                                <XCircle className="w-10 h-10 text-red-600" />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {status === "verifying" && "Verifying Your Email"}
                        {status === "success" && "Email Verified!"}
                        {status === "error" && "Verification Failed"}
                    </h2>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        {status === "verifying" &&
                            "Please wait while we verify your email address..."}
                        {status === "success" && message}
                        {status === "error" && message}
                    </p>

                    {/* Action Buttons */}
                    {status === "success" && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500">
                                Redirecting to login in 3 seconds...
                            </p>
                            <button
                                onClick={() => navigate("/")}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Go to Login Now
                            </button>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate("/")}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Back to Login
                            </button>
                            <p className="text-sm text-gray-500">
                                You can request a new verification email from
                                the login page
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;
