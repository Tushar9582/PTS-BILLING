import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification, reload } from "firebase/auth";

const VerifyEmail: React.FC = () => {
  const [isSent, setIsSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
      setIsSent(true);
      alert("Verification email has been resent. Please check your inbox.");
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      alert("Email verified successfully!");
      navigate("/setup");
    } else {
      alert("Email not verified yet. Please check your inbox.");
    }
    setChecking(false);
  };

  useEffect(() => {
    // If user is already verified and navigates here accidentally
    const checkVerified = async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          navigate("/setup");
        }
      }
    };
    checkVerified();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-[#111111] bg-opacity-95 border border-[#333] shadow-2xl rounded-2xl p-10 w-full max-w-md text-center text-white">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">
          Verify Your Email
        </h2>
        <p className="mb-4 text-gray-300">
          A verification link has been sent to your email address.
          <br />
          Please check your inbox and verify to continue.
        </p>

        <button
          onClick={handleResendVerification}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-3 rounded-md transition duration-300 mb-3"
        >
          Resend Verification Email
        </button>

        <button
          onClick={handleCheckVerification}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded-md transition duration-300"
          disabled={checking}
        >
          {checking ? "Checking..." : "I Have Verified My Email"}
        </button>

        {isSent && (
          <p className="mt-4 text-sm text-green-400">
            Verification email resent successfully.
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
