import { Navigate } from "react-router-dom";

// Using React.ReactNode allows the route to wrap both single elements and Layouts (like MainLayout)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  
  // MERGED: Currently set to true as per your logic to allow development 
  // Change this to localStorage.getItem('isAuthenticated') === 'true' when ready for real auth
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;