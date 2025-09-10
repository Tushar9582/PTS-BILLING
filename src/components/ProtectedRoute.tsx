// src/routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { JSX, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import Subscription from "@/pages/Subscription"; // Import your Subscription component

interface Props {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: Props) => {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);

      if (user && user.emailVerified) {
        setIsVerified(true);

        const userId = user.uid;
        const subscriptionPlan = localStorage.getItem("subscriptionPlan");
        const trialData = localStorage.getItem(`2min_trial_${userId}`);

        if (!subscriptionPlan) {
          // agar trial data hai toh check kare expire hua ya nahi
          if (trialData) {
            const { startTime, duration } = JSON.parse(trialData);
            const endTime = startTime + duration;
            if (Date.now() > endTime) {
              // trial expire
              setShowSubscription(true);
            }
          } else {
            // naya user hai → Subscription khula rahe (Subscription.tsx khud trial start karega)
            setShowSubscription(true);
          }
        }
      } else {
        setIsVerified(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!isVerified) {
    return <Navigate to="/login" replace />;
  }

  if (showSubscription) {
    return (
      <>
        <Subscription
          open={true}
          onClose={() => {
            setShowSubscription(false);
          }}
        />
        {children}
      </>
    );
  }

  return children;
};

export default ProtectedRoute;
