import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase/firebaseConfig";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react"; // Import the eye icons

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1"); // Default country code
  const [isMobile, setIsMobile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // Check system dark/light mode preference
  useEffect(() => {
    const checkDarkMode = () => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    };

    checkDarkMode();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Check screen size on component mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength("");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const strengthPoints = [
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isLongEnough
    ].filter(Boolean).length;

    switch (strengthPoints) {
      case 5:
        setPasswordStrength("Very Strong");
        break;
      case 4:
        setPasswordStrength("Strong");
        break;
      case 3:
        setPasswordStrength("Medium");
        break;
      case 2:
        setPasswordStrength("Weak");
        break;
      default:
        setPasswordStrength("Very Weak");
    }
  }, [password]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      newErrors.password = "Password must contain uppercase, lowercase, numbers and special characters";
    }

    // Mobile number validation
    const fullMobileNumber = countryCode + mobileNumber;
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobileNumber)) {
      newErrors.mobileNumber = "Please enter a valid 10-digit mobile number";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(fullMobileNumber)) {
      newErrors.mobileNumber = "Please enter a valid mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
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
        mobileNumber: countryCode + mobileNumber, // Save with country code
        countryCode: countryCode,
        mobileDigits: mobileNumber,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        isActive: true,
        preferredTheme: isDarkMode ? "dark" : "light"
      });

      alert("Verification link sent to your email. Please check and verify.");
      navigate("/verify-email");
    } catch (error: any) {
      let errorMessage = "Registration failed";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email address is already in use";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak";
      } else {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: "" }));
      }
    };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    if (value.length <= 10) {
      setMobileNumber(value);
      if (errors.mobileNumber) {
        setErrors(prev => ({ ...prev, mobileNumber: "" }));
      }
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case "Very Weak": return "text-red-500";
      case "Weak": return "text-red-400";
      case "Medium": return "text-yellow-500";
      case "Strong": return "text-green-500";
      case "Very Strong": return "text-green-600";
      default: return "text-gray-500";
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 dark:from-gray-900 dark:to-gray-800 p-4 font-sans">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header with logo */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-gray-800 dark:to-gray-700 p-6 flex justify-center">
            <img
              src="https://res.cloudinary.com/defxobnc3/image/upload/v1752132668/log_jiy9id.png"
              alt="Billing Software"
              className="h-16 object-contain"
            />
          </div>
          
          {/* Form section */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Create Account
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">Sign up to get started</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleInputChange(setEmail, 'email')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password (min 8 characters)"
                    value={password}
                    onChange={handleInputChange(setPassword, 'password')}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                {password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Password strength:</span>
                      <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                        {passwordStrength}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          passwordStrength === "Very Weak" ? "bg-red-500 w-1/5" :
                          passwordStrength === "Weak" ? "bg-red-400 w-2/5" :
                          passwordStrength === "Medium" ? "bg-yellow-500 w-3/5" :
                          passwordStrength === "Strong" ? "bg-green-500 w-4/5" :
                          passwordStrength === "Very Strong" ? "bg-green-600 w-full" :
                          "bg-gray-200 dark:bg-gray-700 w-0"
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Must include: uppercase, lowercase, numbers, and special characters (!@#$%^&*)
                </p>
              </div>
              
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="w-1/4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+86">+86 (CN)</option>
                    {/* Add more country codes as needed */}
                  </select>
                  <input
                    id="mobile"
                    type="tel"
                    placeholder="10-digit number"
                    value={mobileNumber}
                    onChange={handleMobileNumberChange}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    maxLength={10}
                  />
                </div>
                {errors.mobileNumber && <p className="text-sm text-red-500 mt-1">{errors.mobileNumber}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your 10-digit mobile number
                </p>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full py-3 mt-6 rounded-lg bg-blue-600 text-white font-semibold text-lg transition duration-300 hover:bg-blue-700 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Account..." : "Register"}
            </button>

            <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Login here
              </Link>
            </p>
          </div>
          
          {/* Footer */}
          <div className="p-4 bg-gray-100 dark:bg-gray-700 text-center text-gray-500 dark:text-gray-400 text-xs">
            &copy; 2025. Your Company Name. All Rights Reserved.
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans relative">
      <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-4xl w-full">
        {/* Left Section: Registration Form */}
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Create your account
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Sign up to get started</p>

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email address *"
                  value={email}
                  onChange={handleInputChange(setEmail, 'email')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create Password * (min 8 characters)"
                    value={password}
                    onChange={handleInputChange(setPassword, 'password')}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                {password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Password strength:</span>
                      <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                        {passwordStrength}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          passwordStrength === "Very Weak" ? "bg-red-500 w-1/5" :
                          passwordStrength === "Weak" ? "bg-red-400 w-2/5" :
                          passwordStrength === "Medium" ? "bg-yellow-500 w-3/5" :
                          passwordStrength === "Strong" ? "bg-green-500 w-4/5" :
                          passwordStrength === "Very Strong" ? "bg-green-600 w-full" :
                          "bg-gray-200 dark:bg-gray-700 w-0"
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Must include: uppercase, lowercase, numbers, and special characters (!@#$%^&*)
                </p>
              </div>
              
              <div>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="w-1/4 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+86">+86 (CN)</option>
                    {/* Add more country codes as needed */}
                  </select>
                  <input
                    type="tel"
                    placeholder="10-digit Mobile Number *"
                    value={mobileNumber}
                    onChange={handleMobileNumberChange}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    maxLength={10}
                  />
                </div>
                {errors.mobileNumber && <p className="text-sm text-red-500 mt-1">{errors.mobileNumber}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your 10-digit mobile number
                </p>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full py-3 rounded-md bg-blue-600 text-white font-semibold text-lg transition duration-300 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? "Creating Account..." : "Register"}
            </button>

            <p className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Right Section: Billing Software Image */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-700 dark:from-gray-800 dark:to-gray-700 p-10 flex flex-col items-center justify-center text-white text-center">
          <img
            src="https://res.cloudinary.com/defxobnc3/image/upload/v1752132668/log_jiy9id.png"
            alt="Billing Software"
            className="w-full max-w-sm mb-6 object-contain"
          />
          <h3 className="text-xl font-semibold mb-2">Professional Billing Software</h3>
          <p className="text-sm opacity-90">Manage your business invoices and payments efficiently</p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-500 dark:text-gray-400 text-sm">
        &copy; 2025. Your Company Name. All Rights Reserved.
      </div>
    </div>
  );
};

export default Register;