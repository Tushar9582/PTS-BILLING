import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth, database, googleProvider } from "../firebase/firebaseConfig";
import { ref, get, set } from "firebase/database";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Eye, EyeOff, ChevronLeft, Sun, Moon } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const [isDisabledDialogOpen, setIsDisabledDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Check screen size on component mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Detect if trial expired
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("reason") === "expired") {
      setTrialExpired(true);
      toast({
        title: "Trial Expired",
        description: "Your 15-day free trial has ended. Please subscribe to continue.",
        variant: "destructive",
      });
    }
  }, [location.search]);

  useEffect(() => {
    setAnimate(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsCheckingStatus(true);
        try {
          const isActive = await checkUserActiveStatus(user.uid);
          if (!isActive) {
            await signOut(auth);
            setIsDisabledDialogOpen(true);
            setShowLogin(true);
          } else {
            const businessRef = ref(database, `users/${user.uid}/business`);
            const snapshot = await get(businessRef);
            navigate(snapshot.exists() ? "/dashboard" : "/setup", { replace: true });
          }
        } catch (error) {
          console.error("Error checking user status:", error);
          setShowLogin(true);
        } finally {
          setIsCheckingStatus(false);
          setIsCheckingAuth(false);
        }
      } else {
        setIsCheckingAuth(false);
        setShowLogin(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const checkUserActiveStatus = async (userId: string) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        return false;
      }
      
      const userData = snapshot.val();
      
      // Check if business data exists and if active status is set
      if (userData.business && userData.business.active !== undefined) {
        return userData.business.active;
      }
      
      // If no business data or active status, assume inactive
      return false;
    } catch (error) {
      console.error("Error checking user status:", error);
      return false;
    }
  };

  // Improved trial status check
  const checkTrialStatus = (userId: string) => {
    try {
      const trialData = localStorage.getItem(`15day_trial_${userId}`);
      
      // If no trial data in localStorage, check if user is new
      if (!trialData) {
        return { expired: false, valid: false };
      }
      
      const { startTime, duration } = JSON.parse(trialData);
      const endTime = startTime + duration;
      const now = Date.now();
      
      return {
        expired: now >= endTime,
        valid: true,
        daysRemaining: Math.max(0, Math.ceil((endTime - now) / (1000 * 60 * 60 * 24)))
      };
    } catch (error) {
      console.error("Error checking trial status:", error);
      return { expired: false, valid: false };
    }
  };

  // Start trial timer for a user
  const startTrialTimer = (userId: string) => {
    const trialData = {
      startTime: Date.now(), // Start timer from login moment
      duration: 15 * 24 * 60 * 60 * 1000 // 15 days in milliseconds
    };
    localStorage.setItem(`15day_trial_${userId}`, JSON.stringify(trialData));
    
    // Also update in database for consistency
    const userRef = ref(database, `users/${userId}/business`);
    set(userRef, {
      active: true,
      trialStart: trialData.startTime,
      trialDuration: trialData.duration
    }).catch(error => {
      console.error("Error updating trial data in database:", error);
    });
    
    return trialData;
  };

  // Handle regular email/password login
  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    // Check if terms are accepted
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms and Conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      setIsCheckingStatus(true);

      // Check trial status from localStorage
      const trialStatus = checkTrialStatus(user.uid);
      
      // If no trial data exists, start the trial timer
      if (!trialStatus.valid) {
        startTrialTimer(user.uid);
      } else if (trialStatus.expired) {
        setTrialExpired(true);
        await signOut(auth);
        navigate("/login?reason=expired", { replace: true });
        setIsLoading(false);
        return;
      }

      // Check if business account is active
      const isActive = await checkUserActiveStatus(user.uid);
      setIsCheckingStatus(false);

      if (!isActive) {
        await signOut(auth);
        setIsDisabledDialogOpen(true);
        setIsLoading(false);
        return;
      }

      // Navigate based on setup status
      const businessRef = ref(database, `users/${user.uid}/business`);
      const snapshot = await get(businessRef);
      navigate(snapshot.exists() ? "/dashboard" : "/setup", { replace: true });
    } catch (error: any) {
      setIsCheckingStatus(false);
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In - Fixed for all devices
  const handleGoogleSignIn = async () => {
    // Check if terms are accepted for Google sign-in
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms and Conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setGoogleLoading(true);
    try {
      // For mobile devices, we might need to handle redirect instead of popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in database, if not create a new record
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        // Start trial timer for new users
        const trialData = startTrialTimer(user.uid);
        
        // Create new user in database with proper structure
        await set(ref(database, `users/${user.uid}`), {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          createdAt: Date.now(),
          provider: "google",
          // Add business data directly under user
          business: {
            active: true,
            trialStart: trialData.startTime,
            trialDuration: trialData.duration,
          }
        });
      } else {
        // For existing users, check if they have trial data
        const trialStatus = checkTrialStatus(user.uid);
        if (!trialStatus.valid) {
          // If no trial data exists, start it now
          startTrialTimer(user.uid);
        }
      }

      // Check trial status using the improved function
      const trialStatus = checkTrialStatus(user.uid);
      
      if (trialStatus.expired) {
        setTrialExpired(true);
        await signOut(auth);
        toast({
          title: "Trial Expired",
          description: "Your 15-day free trial has ended. Please subscribe to continue.",
          variant: "destructive",
        });
        setGoogleLoading(false);
        return;
      }

      // Check if business account is active
      const isActive = await checkUserActiveStatus(user.uid);
      
      if (!isActive) {
        await signOut(auth);
        setIsDisabledDialogOpen(true);
        setGoogleLoading(false);
        return;
      }

      // Navigate based on setup status
      const businessRef = ref(database, `users/${user.uid}/business`);
      const businessSnapshot = await get(businessRef);
      
      // For new Google sign-ins, business might not exist yet
      if (!businessSnapshot.exists()) {
        navigate("/setup", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in was canceled. Please try again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized for Google sign-in.";
      }
      
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email to receive a reset link.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Email Sent",
        description: "Password reset email sent! Check your inbox.",
      });
    } catch (error: any) {
      let errorMessage = "Failed to send password reset email";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isCheckingAuth || isCheckingStatus) {
    return (
      <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
        <Loader2 className={`h-12 w-12 animate-spin ${darkMode ? 'text-white' : 'text-black'}`} />
      </div>
    );
  }

  if (!showLogin) {
    return null;
  }

  // Theme classes
  const bgColor = darkMode ? 'bg-black' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-black';
  const inputBg = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const inputBorder = darkMode ? 'border-gray-700' : 'border-gray-300';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-gray-100';
  const secondaryText = darkMode ? 'text-gray-400' : 'text-gray-600';
  const primaryButtonBg = darkMode ? 'bg-white' : 'bg-black';
  const primaryButtonText = darkMode ? 'text-black' : 'text-white';
  const primaryButtonHover = darkMode ? 'hover:bg-gray-200' : 'hover:bg-gray-800';
  const logoBg = darkMode ? 'bg-gray-800' : 'bg-purple-100';

  // Mobile View
  if (isMobileView) {
    return (
      <div className={`min-h-screen ${bgColor} p-6 font-sans relative ${textColor}`}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => navigate(-1)} 
              className={`flex items-center ${textColor}`}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className={`${logoBg} p-4 rounded-full bg-gray-600`}>
              <img
                src="https://res.cloudinary.com/defxobnc3/image/upload/v1752132668/log_jiy9id.png"
                alt="Billing Software Logo"
                className="w-16 h-16"
              />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
          <p className={`text-center mb-8 ${secondaryText}`}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Show Trial Expired Banner */}
        {trialExpired && (
          <div className={`mb-6 p-3 rounded ${darkMode ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'} text-sm text-center`}>
            ⏳ Your 15-day free trial has expired. Please subscribe to continue.
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <input
              type="email"
              placeholder="Email address or mobile number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full ${textColor} p-4 ${inputBg} border ${inputBorder} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400`}
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full ${textColor} p-4 pr-12 ${inputBg} border ${inputBorder} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400`}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="terms-mobile"
              className={`rounded ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="terms-mobile" className={`text-sm ${secondaryText}`}>
              I agree to the{" "}
              <button
                type="button"
                className="text-blue-500 hover:text-blue-700 underline"
                onClick={() => setTermsDialogOpen(true)}
              >
                Terms and Conditions
              </button>
            </label>
          </div>
          
          <button
            onClick={handleForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-700"
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading || !termsAccepted}
          className={`w-full py-4 rounded-lg ${primaryButtonBg} ${primaryButtonText} font-semibold text-lg transition duration-300 mb-6 ${
            isLoading || !termsAccepted ? "opacity-70 cursor-not-allowed" : primaryButtonHover
          }`}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${bgColor} ${secondaryText}`}>Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || !termsAccepted}
          className={`w-full flex items-center justify-center gap-2 ${darkMode ? 'bg-gray-900' : 'bg-white'} ${textColor} font-medium py-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-300'} transition duration-300 mb-6 ${
            googleLoading || !termsAccepted ? "opacity-70 cursor-not-allowed" : darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"
          }`}
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
          {googleLoading ? "Signing in..." : "Sign in with Google"}
        </button>

        <p className={`text-center ${secondaryText} text-sm`}>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-purple-400 font-medium hover:text-purple-300 hover:underline"
            onClick={(e) => (isLoading || googleLoading) && e.preventDefault()}
          >
            Sign up
          </Link>
        </p>

        <p className="text-center mt-4 text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <button
            onClick={() => setTermsDialogOpen(true)}
            className="text-blue-500 hover:text-blue-700"
          >
            Terms and Conditions
          </button>
        </p>

        {/* Terms and Conditions Dialog */}
        <AlertDialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
          <AlertDialogContent className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} ${textColor} max-w-md mx-auto`}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Terms & Conditions</AlertDialogTitle>
              <AlertDialogDescription className={`${secondaryText} max-h-72 overflow-y-auto mt-4 text-sm space-y-3`}>
                <p>1. This is a sample billing software for demonstration purposes only.</p>
                <p>2. All user data is handled securely, but no guarantees are provided for data loss.</p>
                <p>3. You must not use this software for any illegal or unauthorized purpose.</p>
                <p>4. The company reserves the right to suspend accounts for policy violations.</p>
                <p>5. You agree to receive system notifications and updates.</p>
                <p>6. No responsibility is taken for misuse or incorrect billing amounts due to user error.</p>
                <p>7. By using this software, you acknowledge that you understand and accept these terms.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className={`${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                I Understand
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Disabled Account Dialog */}
        <AlertDialog open={isDisabledDialogOpen} onOpenChange={setIsDisabledDialogOpen}>
          <AlertDialogContent className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} ${textColor} max-w-md mx-auto`}>
            <AlertDialogHeader>
              <AlertDialogTitle>Account Disabled</AlertDialogTitle>
              <AlertDialogDescription className={secondaryText}>
                Your account has been deactivated by the administrator. Please contact support to reactivate your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className={`${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Desktop View
  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-gray-50'} p-4 font-sans relative`}>
      {/* Dark/Light Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className={`flex ${cardBg} rounded-xl shadow-lg overflow-hidden max-w-4xl w-full`}>
        {/* Left Section: Login Form */}
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${textColor} mb-2`}>Sign in</h2>

            {/* Show Trial Expired Banner */}
            {trialExpired && (
              <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'} text-sm text-center`}>
                ⏳ Your 15-day free trial has expired. Please subscribe to continue.
              </div>
            )}

            <input
              type="email"
              placeholder="Email address or mobile number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full ${textColor} p-3 mb-4 ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400`}
              disabled={isLoading}
            />

            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${textColor} p-3 pr-10 ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-4 flex items-start space-x-2 text-sm">
              <input
                type="checkbox"
                id="terms"
                className="mt-1"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="terms" className={secondaryText}>
                I agree to the{" "}
                <button
                  type="button"
                  className="underline text-blue-500 hover:text-blue-700"
                  onClick={() => setTermsDialogOpen(true)}
                >
                  Terms and Conditions
                </button>
              </label>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading || !termsAccepted}
              className={`w-full py-3 rounded-md ${primaryButtonBg} ${primaryButtonText} font-semibold text-lg transition duration-300 ${
                isLoading || !termsAccepted ? "opacity-70 cursor-not-allowed" : primaryButtonHover
              }`}
            >
              {isLoading ? "Signing in..." : "Next"}
            </button>

            <div className={secondaryText}>
              <p className="mb-4 text-center mt-8">Or sign in using</p>
              <div className="flex justify-center">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || !termsAccepted}
                  className={`flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-white'} ${textColor} font-semibold py-2 px-4 rounded-md border ${darkMode ? 'border-gray-600' : 'border-gray-300'} transition duration-300 ${
                    googleLoading || !termsAccepted ? "opacity-70 cursor-not-allowed" : darkMode ? "hover:bg-gray-600" : "hover:bg-gray-100"
                  }`}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      alt="Google logo"
                      className="w-5 h-5 mr-2"
                    />
                  )}
                  {googleLoading ? "Signing in..." : "Sign in with Google"}
                </button>
              </div>
            </div>

            <p className={`text-center mt-8 text-sm ${secondaryText}`}>
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-purple-400 hover:text-purple-300 hover:underline"
                onClick={(e) => (isLoading || googleLoading) && e.preventDefault()}
              >
                Sign up now
              </Link>
            </p>

            <p className={`text-center mt-4 text-sm ${secondaryText}`}>
              <button
                onClick={handleForgotPassword}
                className="text-blue-500 hover:underline"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className={`flex-1 ${darkMode ? 'bg-gray-900' : 'bg-white-600'} p-10 flex flex-col items-center justify-center text-gray text-center`}>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-800'} p-6 rounded-full mb-6`}>
            <img
              src="https://res.cloudinary.com/defxobnc3/image/upload/v1752132668/log_jiy9id.png"
              alt="Billing Software"
              className="w-24 md:w-28"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-400 mb-3">Billing Software</h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Create professional invoices in seconds—get paid faster with automated reminders and online payments
          </p>
        </div>
      </div>

      {/* Disabled Account Dialog */}
      <AlertDialog open={isDisabledDialogOpen} onOpenChange={setIsDisabledDialogOpen}>
        <AlertDialogContent className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} ${textColor}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Disabled</AlertDialogTitle>
            <AlertDialogDescription className={secondaryText}>
              Your account has been deactivated by the administrator. Please contact support to reactivate your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className={`${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms and Conditions Dialog */}
      <AlertDialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <AlertDialogContent className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} ${textColor} max-w-2xl`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Terms & Conditions</AlertDialogTitle>
            <AlertDialogDescription className={`${secondaryText} max-h-72 overflow-y-auto mt-4 text-sm space-y-3`}>
              <p>1. This is a sample billing software for demonstration purposes only.</p>
              <p>2. All user data is handled securely, but no guarantees are provided for data loss.</p>
              <p>3. You must not use this software for any illegal or unauthorized purpose.</p>
              <p>4. The company reserves the right to suspend accounts for policy violations.</p>
              <p>5. You agree to receive system notifications and updates.</p>
              <p>6. No responsibility is taken for misuse or incorrect billing amounts due to user error.</p>
              <p>7. By using this software, you acknowledge that you understand and accept these terms.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className={`${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;