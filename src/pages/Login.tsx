import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "../firebase/firebaseConfig"; // ✅ Import database
import { ref, get } from "firebase/database"; // ✅ Import get and ref
import { useNavigate, Link } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Check if business info exists
      const businessRef = ref(database, `users/${user.uid}/business`);
      const snapshot = await get(businessRef);

      alert("Login successful!");

      if (snapshot.exists()) {
        navigate("/dashboard"); // ✅ Business is set, go to dashboard
      } else {
        navigate("/setup"); // 🚧 Business not set, go to setup page
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-semibold text-center mb-6 text-blue-600">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 text-black"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 text-black"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition duration-300"
        >
          Login
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
