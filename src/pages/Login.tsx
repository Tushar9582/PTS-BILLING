import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, database } from "../firebase/firebaseConfig";
import { ref, get } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
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
import { Loader2 } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const [isDisabledDialogOpen, setIsDisabledDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

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
  console.log(`🔍 Checking active status for user: ${userId}`);
  try {
    const userRef = ref(database, `users/${userId}/business/active`);
    console.log(`📡 Firebase reference path: users/${userId}/business/active`);

    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const isActive = snapshot.val();
      console.log(`✅ User active status found: ${isActive}`);
      return isActive;
    } else {
      console.log('⚠️ No active status found. Defaulting to false.');
      return false;
    }
  } catch (error) {
    console.error("❌ Error checking user status:", error);
    return false;
  }
};


  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      setIsCheckingStatus(true);
      const isActive = await checkUserActiveStatus(user.uid);
      setIsCheckingStatus(false);

      if (!isActive) {
        await signOut(auth);
        setIsDisabledDialogOpen(true);
        setIsLoading(false);
        return;
      }

      const businessRef = ref(database, `users/${user.uid}/business`);
      const snapshot = await get(businessRef);
      navigate(snapshot.exists() ? "/dashboard" : "/setup", { replace: true });
    } catch (error: any) {
      setIsCheckingStatus(false);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isCheckingAuth || isCheckingStatus) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!showLogin) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans relative">
      {/* Background elements if needed, keeping it minimal as per Zoho image */}

      <div className="flex bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full">
        {/* Left Section: Login Form */}
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            {/* <div className="flex items-center mb-10">
              <img
                src="/zoho-logo.png" // Replace with your Zoho-like logo path
                alt="Zoho Logo"
                className="h-8 mr-2"
              />
              <span className="text-xl font-semibold text-gray-800">ZOHO</span>
            </div> */}

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Sign in
            </h2>
            {/* <p className="text-gray-600 mb-8">to access Zoho Home</p> */}

            <input
              type="email"
              placeholder="Email address or mobile number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-black p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />

            {/* Password input field, kept visible for existing logic. Zoho shows this later. */}
            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-black p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`w-full py-3 rounded-md bg-blue-600 text-white font-semibold text-lg transition duration-300 ${
                isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Signing in..." : "Next"}
            </button>

            {/* "Try smart sign-in" button */}
            {/* <button className="flex items-center justify-center w-full py-2 mt-4 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              Try smart sign-in
            </button> */}

            <div className="mt-8 text-gray-500">
              <p className="mb-4">Sign in using</p>
              <div className="flex justify-center space-x-4">
                {/* Social Login Icons - Placeholder SVGs or Images */}
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/color/48/000000/google-logo.png" alt="Google" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/facebook-new.png" alt="Facebook" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/linkedin.png" alt="LinkedIn" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/twitter.png" alt="Twitter" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/mac-os.png" alt="Apple" className="h-6 w-6" />
                </button>
                <button className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-100">
                  <img src="https://img.icons8.com/ios-filled/50/000000/github.png" alt="Github" className="h-6 w-6" />
                </button>
              </div>
            </div>

            <p className="text-center mt-8 text-sm text-gray-600">
              Don't have a Zoho account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:underline"
                onClick={(e) => isLoading && e.preventDefault()}
              >
                Sign up now
              </Link>
            </p>
          </div>
        </div>

        {/* Right Section: Passwordless Sign-in */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-700 p-10 flex flex-col items-center justify-center text-white text-center">
         <img
  src="https://www.pawartechnologyservices.com/images/log.png"
  alt="Passwordless Sign-in"
  className="w-32 md:w-40 mb-6"
/>

          <h3 className="text-xl font-bold mb-3">Billing Software</h3>
          <p className="mb-6 opacity-90">
           Create professional invoices in seconds—get paid faster with automated reminders and online payments
          </p>
          {/* <button className="px-6 py-2 border border-white rounded-md text-white hover:bg-white hover:text-blue-600 transition-colors duration-200">
            Learn more
          </button> */}
        </div>
      </div>

      {/* Disabled Account Dialog */}
      <AlertDialog open={isDisabledDialogOpen} onOpenChange={setIsDisabledDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Disabled</AlertDialogTitle>
            <AlertDialogDescription>
              Your account has been deactivated by the administrator. Please contact support to reactivate your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;