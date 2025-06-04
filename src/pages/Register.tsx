import React, { useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase/firebaseConfig";
import { Link, useNavigate } from "react-router-dom";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Wait for Firebase to confirm auth before writing to database
      onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.uid === user.uid) {
          await set(ref(database, `users/${user.uid}`), {
            uid: user.uid,
            email: user.email,
            createdAt: new Date().toISOString(),
          });

          alert("User registered!");
          navigate("/setup");
        }
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-200">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-semibold text-center mb-6 text-purple-700">Register</h2>
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
          onClick={handleRegister}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md transition duration-300"
        >
          Sign Up
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
