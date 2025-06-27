import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase/firebaseConfig";
import { Link, useNavigate } from "react-router-dom";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Removed 'animate' state and its useEffect as it's not present in the desired Login page UI
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Save user to database
      await set(ref(database, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        isActive: true, // Ensure user is marked as active
      });

      alert("Verification link sent to your email. Please check and verify.");
      navigate("/verify-email");
    } catch (error: any) {
      alert("Registration failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans relative">
      <div className="flex bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full">
        {/* Left Section: Registration Form (styled like Login) */}
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Create your account
            </h2>
            <p className="text-gray-600 mb-8">Sign up to get started</p>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-6 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <button
              onClick={handleRegister}
              className="w-full py-3 rounded-md bg-blue-600 text-white font-semibold text-lg transition duration-300 hover:bg-blue-700"
            >
              Register
            </button>
            
            {/* Social login buttons can be added here if desired, like on Login page */}
            {/* <div className="mt-8 text-gray-500">
              <p className="mb-4">Or register with</p>
              <div className="flex justify-center space-x-4">
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/color/48/000000/google-logo.png" alt="Google" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/facebook-new.png" alt="Facebook" className="h-6 w-6" />
                </button>
              </div>
            </div> */}

            <p className="text-center mt-8 text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Right Section: Billing Software Image (same as Login's right section style) */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-700 p-10 flex flex-col items-center justify-center text-white text-center">
          <img
            src="https://www.pawartechnologyservices.com/images/log.png" // Your specified billing software image URL
            alt="Billing Software"
            className="w-full max-w-sm mb-6 object-contain"
          />
          {/* <h3 className="text-2xl font-bold mb-3">Efficient Billing Solutions</h3>
          <p className="mb-6 opacity-90 text-lg">
            Streamline your financial operations with our comprehensive billing management tools.
          </p> */}
          {/* You can add a "Learn more" button here if desired, similar to the login page */}
          {/* <button className="px-6 py-2 border border-white rounded-md text-white hover:bg-white hover:text-blue-600 transition-colors duration-200">
            Discover Features
          </button> */}
        </div>
      </div>

      {/* Footer (same as Login page) */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-500 text-sm">
        &copy; 2025. Your Company Name. All Rights Reserved.
      </div>
    </div>
  );
};

export default Register;