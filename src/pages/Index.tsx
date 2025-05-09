
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";

const Index = () => {
  const navigate = useNavigate();
  const { isConfigured } = useBilling();
  
  useEffect(() => {
    if (isConfigured) {
      navigate('/dashboard');
    } else {
      navigate('/setup');
    }
  }, [isConfigured, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Redirecting...</p>
    </div>
  );
};

export default Index;
