// components/AdminProtectedRoute.tsx
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, database } from "@/firebase/firebaseConfig";
import { onValue, ref } from "firebase/database";
import { JSX, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

const AdminProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.role === "admin") {
          setIsAdmin(true);
        } else {
          toast.error("Access denied: Admins only.");
          setIsAdmin(false);
        }
      });
    }
  }, [user]);

  if (loading || (user && isAdmin === null)) return null;

  if (!user || isAdmin === false) return <Navigate to="/login" replace />;

  return children;
};

export default AdminProtectedRoute;
