
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-billing-background">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-billing-primary">404</h1>
        <h2 className="text-3xl font-bold text-billing-dark mt-4">Page Not Found</h2>
        <p className="text-billing-secondary mt-2 mb-6">
          Sorry, the page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
