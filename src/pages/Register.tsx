import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database, googleProvider } from "../firebase/firebaseConfig";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react"; 

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [isMobile, setIsMobile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

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

  // Check for saved theme preference or respect OS preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Apply theme class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('preferredTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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

    // First name validation
    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Last name validation
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

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

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: countryCode + mobileNumber,
        countryCode: countryCode,
        mobileDigits: mobileNumber,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        isActive: true,
        preferredTheme: darkMode ? "dark" : "light",
        business: {
          active: true,
          trialStart: Date.now(),
          trialDuration: 15 * 24 * 60 * 60 * 1000
        }
      });

      // Start trial timer
      localStorage.setItem(`15day_trial_${user.uid}`, JSON.stringify({
        startTime: Date.now(),
        duration: 15 * 24 * 60 * 60 * 1000
      }));

      navigate("/setup", { replace: true });
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

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in database, if not create a new record
      const userRef = ref(database, `users/${user.uid}`);
      
      // Start trial timer for new users
      localStorage.setItem(`15day_trial_${user.uid}`, JSON.stringify({
        startTime: Date.now(),
        duration: 15 * 24 * 60 * 60 * 1000
      }));

      // Create new user in database with proper structure
      await set(ref(database, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ')[1] || '',
        photoURL: user.photoURL,
        createdAt: Date.now(),
        provider: "google",
        emailVerified: user.emailVerified,
        isActive: true,
        preferredTheme: darkMode ? "dark" : "light",
        // Add business data directly under user
        business: {
          active: true,
          trialStart: Date.now(),
          trialDuration: 15 * 24 * 60 * 60 * 1000
        }
      });

      navigate("/setup", { replace: true });
    } catch (error: any) {
      console.error("Google Sign-Up Error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-up was canceled. Please try again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      alert(errorMessage);
    } finally {
      setGoogleLoading(false);
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
    const value = e.target.value.replace(/\D/g, '');
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4 font-sans relative overflow-hidden">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 z-10"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden w-full max-w-md max-h-[90vh]">
          {/* Top Section: Image for Mobile */}
          
          {/* Bottom Section: Registration Form */}
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto scrollbar-hide">
            <div>
              <div className="flex justify-center mb-4">
                <img
                  src="/8.png"
                  alt="Billing Software"
                  className="w-16 h-16"
                />
              </div>
              
              <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-2">Create Account</h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4 text-sm">Join Pulse Billing to manage your customers</p>
              
              <p className="text-center text-green-500 mb-4 font-medium text-sm">
                Start your 15-day free trial today!
              </p>

              <button
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-lg border border-gray-300 dark:border-gray-600 transition duration-300 mb-4 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <img
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google logo"
                    className="w-4 h-4"
                  />
                )}
                {googleLoading ? "Signing up..." : "Sign up with Google"}
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={handleInputChange(setFirstName, 'firstName')}
                      className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                      disabled={isSubmitting}
                    />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={handleInputChange(setLastName, 'lastName')}
                      className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                      disabled={isSubmitting}
                    />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={handleInputChange(setEmail, 'email')}
                    className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={handleInputChange(setPassword, 'password')}
                    className="w-full text-gray-800 dark:text-white p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: "" }));
                      }
                    }}
                    className="w-full text-gray-800 dark:text-white p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="w-1/4 p-3 bg-white-600 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="+1">+1</option>
                    <option value="+91">+91</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={mobileNumber}
                    onChange={handleMobileNumberChange}
                    className="flex-1 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                    disabled={isSubmitting}
                    maxLength={10}
                  />
                </div>
                {errors.mobileNumber && <p className="text-xs text-red-500 mt-1">{errors.mobileNumber}</p>}
              </div>

              <button
                onClick={handleRegister}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-md bg-purple-600 text-white font-semibold transition duration-300 shadow-md text-sm ${
                  isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-purple-700"
                }`}
              >
                {isSubmitting ? "Creating Account..." : "Start Free Trial"}
              </button>

              <p className="text-center mt-4 text-xs text-gray-600 dark:text-gray-300">
                Already have an account?{" "}
                <Link to="/login" className="text-purple-600 dark:text-purple-400 hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Custom CSS to hide scrollbars */}
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4 font-sans relative overflow-hidden">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 z-10"
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-4xl w-full max-h-[90vh]">
        {/* Left Section: Registration Form */}
        <div className="flex-1 p-10 flex flex-col justify-between overflow-y-auto scrollbar-hide">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Create Account</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Join Pulse Billing to manage your customers</p>
            
            <p className="text-green-500 mb-6 font-medium">
              Start your 15-day free trial today!
            </p>

            <button
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-lg border border-gray-300 dark:border-gray-600 transition duration-300 mb-6 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google logo"
                  className="w-5 h-5"
                />
              )}
              {googleLoading ? "Signing up..." : "Sign up with Google"}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={handleInputChange(setFirstName, 'firstName')}
                    className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                    disabled={isSubmitting}
                  />
                  {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={handleInputChange(setLastName, 'lastName')}
                    className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                    disabled={isSubmitting}
                  />
                  {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={handleInputChange(setEmail, 'email')}
                  className="w-full text-gray-800 dark:text-white p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={handleInputChange(setPassword, 'password')}
                  className="w-full text-gray-800 dark:text-white p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  className="w-full text-gray-800 dark:text-white p-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={handleCountryCodeChange}
                  className="w-1/4 p-3 bg-white-600 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="+1">+1</option>
                  <option value="+91">+91</option>
                  <option value="+44">+44</option>
                </select>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={mobileNumber}
                  onChange={handleMobileNumberChange}
                  className="flex-1 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-400"
                  disabled={isSubmitting}
                  maxLength={10}
                />
              </div>
              {errors.mobileNumber && <p className="text-sm text-red-500 mt-1">{errors.mobileNumber}</p>}
            </div>

            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-md bg-purple-600 text-white font-semibold text-lg transition duration-300 shadow-md ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-purple-700"
              }`}
            >
              {isSubmitting ? "Creating Account..." : "Start Free Trial"}
            </button>

            <p className="text-center mt-8 text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <Link to="/login" className="text-purple-600 dark:text-purple-400 hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>

        {/* Right Section: Billing Software Image */}
        <div className="flex-1 bg-gradient-to-br  p-10 flex flex-col items-center justify-center text-center">
          <img
            src="/8.png"
            alt="Billing Software"
            className="w-full max-w-sm mb-6 object-contain rounded-[10px]"
          />
        </div>
      </div>

      {/* Custom CSS to hide scrollbars */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Register;