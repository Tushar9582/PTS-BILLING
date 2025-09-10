// src/pages/Subscription.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  Check,
  Clock,
  Zap,
  Crown,
  Building,
  Gift,
} from "lucide-react";
import { auth } from "@/firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  popular?: boolean;
  icon: React.ReactNode;
}

interface SubscriptionProps {
  open: boolean;
  onClose: () => void;
  isTrial?: boolean;
  expired?: boolean;
  daysRemaining?: number;
}

const Subscription: React.FC<SubscriptionProps> = ({
  open,
  onClose,
  isTrial,
  expired,
  daysRemaining,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showPopup, setShowPopup] = useState(open);
  const [trialUsed, setTrialUsed] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [trialExpired, setTrialExpired] = useState(false);

  const navigate = useNavigate();

  const plans: Plan[] = [
    {
      id: "15day",
      name: "15-Day Free Trial",
      price: "Free for 15 Days",
      features: [
        "All Premium Features",
        "Full Access",
        "No Credit Card Required",
        "Cancel Anytime",
      ],
      popular: true,
      icon: <Gift className="h-5 w-5 text-pink-500" />,
    },
    {
      id: "basic",
      name: "Basic Café Plan",
      price: "₹799 / month",
      features: [
        "Unlimited Billing",
        "Basic Reports",
        "Email Support",
        "1 Cashier User",
        "Simple Café Menu Management",
      ],
      icon: <Zap className="h-5 w-5 text-green-500" />,
    },
    {
      id: "pro",
      name: "Pro Café Plan",
      price: "₹1499 / month",
      features: [
        "Everything in Basic",
        "Advanced Sales & Stock Reports",
        "Priority Support",
        "Multi-user (up to 5)",
        "KOT & Table Management",
        "Mobile App Access",
      ],
      recommended: true,
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
    },
    {
      id: "enterprise",
      name: "Enterprise Café Plan",
      price: "₹3499 / month",
      features: [
        "All Features",
        "24/7 Priority Support",
        "Custom Modules",
        "Unlimited Users",
        "Custom Branding",
        "Chain Café / Franchise Support",
      ],
      icon: <Building className="h-5 w-5 text-indigo-500" />,
    },
  ];

  // Load trial info from localStorage
  useEffect(() => {
    const userId = auth.currentUser?.uid || "guest";
    const trialData = localStorage.getItem(`15day_trial_${userId}`);

    if (trialData) {
      const { startTime, duration } = JSON.parse(trialData);
      const endTime = startTime + duration;
      const now = Date.now();

      if (now < endTime) {
        const daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(daysLeft);
        setTrialUsed(true);
        setTrialExpired(false);
        setShowPopup(false); // Don't show popup while trial is active
      } else {
        setTrialDaysLeft(0);
        setTrialUsed(true);
        setTrialExpired(true);
        setShowPopup(true);
      }
    } else {
      // If no trial data exists, start the trial now
      const startTime = Date.now();
      const duration = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
      const trialData = { startTime, duration };
      
      localStorage.setItem(`15day_trial_${userId}`, JSON.stringify(trialData));
      
      const daysLeft = 15;
      setTrialDaysLeft(daysLeft);
      setTrialUsed(true);
      setTrialExpired(false);
      setShowPopup(false); // Don't show popup when trial just started
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleClose = async () => {
    setShowPopup(false);
    onClose();
    await handleLogout();
  };

  const handleSubscribe = () => {
    if (!selectedPlan) {
      alert("Please select a subscription plan.");
      return;
    }
    if (selectedPlan === "15day") {
      // Start 15-day trial
      const userId = auth.currentUser?.uid || "guest";
      const startTime = Date.now();
      const duration = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
      const trialData = { startTime, duration };
      
      localStorage.setItem(`15day_trial_${userId}`, JSON.stringify(trialData));
      
      setTrialDaysLeft(15);
      setTrialUsed(true);
      setTrialExpired(false);
      setShowPopup(false);
      onClose();
      navigate("/dashboard");
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = () => {
    if (!paymentMethod) {
      alert("Please selected a payment method.");
      return;
    }
    localStorage.setItem("subscriptionPlan", selectedPlan!);
    alert(`You have successfully subscribed with ${paymentMethod} payment!`);
    setShowPopup(false);
    onClose();
    navigate("/dashboard");
  };

  // Floating timer for trial countdown
  if (trialUsed && trialDaysLeft > 0 && !trialExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 right-4 shadow-lg rounded-lg px-4 py-2 text-sm flex items-center gap-2 z-40 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold"
      >
        <Clock className="h-4 w-4 text-yellow-300" />
        {`Trial: ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="text-white hover:bg-purple-800"
        >
          <X size={18} />
        </Button>
      </motion.div>
    );
  }

  if (!open && !showPopup) return null;

  return (
    <AnimatePresence>
      {(open || showPopup) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-black/80 via-black/70 to-black/90 z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-6xl shadow-2xl rounded-2xl overflow-hidden relative bg-white"
          >
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full h-8 w-8 hover:bg-red-100"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            <CardContent className="p-8">
              {/* Trial Info */}
              {trialUsed && trialDaysLeft > 0 && !trialExpired && (
                <div className="text-center mb-6">
                  <p className="text-gray-700 text-lg">
                    ⏳ You have{" "}
                    <span className="font-bold text-indigo-600">
                      {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
                    </span>{" "}
                    remaining in your free trial
                  </p>
                </div>
              )}

              {trialExpired ? (
                <>
                  <div className="text-center mb-10">
                    <h2 className="text-4xl font-extrabold text-red-600 drop-shadow-lg">
                      ☕ Trial Expired
                    </h2>
                    <p className="text-gray-700 mt-3 text-lg leading-relaxed">
                      Your 15-day free trial has ended.  
                      <span className="font-semibold text-indigo-600"> Subscribe now </span>  
                      to continue using your{" "}
                      <span className="font-bold text-orange-600">Cafe Billing Software</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans
                      .filter((p) => p.id !== "15day")
                      .map((plan) => (
                        <motion.div
                          whileHover={{ scale: 1.05, y: -4 }}
                          key={plan.id}
                          className={`border-2 rounded-2xl p-6 cursor-pointer transition-all relative shadow-md ${
                            selectedPlan === plan.id
                              ? "border-indigo-500 shadow-xl"
                              : "border-gray-200"
                          } ${
                            plan.recommended
                              ? "bg-gradient-to-br from-indigo-50 via-white to-white"
                              : "bg-white"
                          }`}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.recommended && (
                            <span className="absolute top-2 right-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full shadow">
                              ⭐ Best for Cafes
                            </span>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            {plan.icon}
                            <h3 className="font-bold text-xl text-gray-800">{plan.name}</h3>
                          </div>
                          <p className="text-indigo-700 font-bold mb-3 text-lg">
                            {plan.price}
                          </p>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {plan.features.map((f, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2"
                              >
                                <Check className="h-4 w-4 text-green-500" /> {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            className={`mt-6 w-full py-2 rounded-lg font-semibold transition ${
                              selectedPlan === plan.id
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            }`}
                          >
                            {selectedPlan === plan.id
                              ? "✔ Selected"
                              : "Choose Plan"}
                          </Button>
                        </motion.div>
                      ))}
                  </div>

                  <div className="mt-10 flex justify-center">
                    <Button
                      onClick={handleSubscribe}
                      className="px-10 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 rounded-xl shadow-lg text-white"
                    >
                      Continue →
                    </Button>
                  </div>
                </>
              ) : (
                // Show subscription options for users who haven't started trial
                !trialUsed && (
                  <>
                    <div className="text-center mb-10">
                      <h2 className="text-4xl font-extrabold text-indigo-600 drop-shadow-lg">
                        ☕ Start Your 15-Day Free Trial
                      </h2>
                      <p className="text-gray-700 mt-3 text-lg leading-relaxed">
                        Get full access to all premium features for 15 days, no credit card required.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {plans.map((plan) => (
                        <motion.div
                          whileHover={{ scale: 1.05, y: -4 }}
                          key={plan.id}
                          className={`border-2 rounded-2xl p-6 cursor-pointer transition-all relative shadow-md ${
                            selectedPlan === plan.id
                              ? "border-indigo-500 shadow-xl"
                              : "border-gray-200"
                          } ${
                            plan.recommended || plan.popular
                              ? "bg-gradient-to-br from-indigo-50 via-white to-white"
                              : "bg-white"
                          }`}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.popular && (
                            <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-600 to-red-600 text-white text-xs px-3 py-1 rounded-full shadow">
                              Popular
                            </span>
                          )}
                          {plan.recommended && (
                            <span className="absolute top-2 right-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full shadow">
                              ⭐ Recommended
                            </span>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            {plan.icon}
                            <h3 className="font-bold text-xl text-gray-800">{plan.name}</h3>
                          </div>
                          <p className="text-indigo-700 font-bold mb-3 text-lg">
                            {plan.price}
                          </p>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {plan.features.map((f, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2"
                              >
                                <Check className="h-4 w-4 text-green-500" /> {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            className={`mt-6 w-full py-2 rounded-lg font-semibold transition ${
                              selectedPlan === plan.id
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            }`}
                          >
                            {selectedPlan === plan.id
                              ? "✔ Selected"
                              : plan.id === "15day" 
                                ? "Start Free Trial" 
                                : "Choose Plan"}
                          </Button>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-10 flex justify-center">
                      <Button
                        onClick={handleSubscribe}
                        className="px-10 py-3 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 rounded-xl shadow-lg text-white"
                      >
                        {selectedPlan === "15day" ? "Start Free Trial →" : "Continue →"}
                      </Button>
                    </div>
                  </>
                )
              )}
            </CardContent>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Subscription;