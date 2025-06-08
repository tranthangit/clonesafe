import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import SplashScreen from "./components/SplashScreen";
import Home from "./pages/Home";
import Map from "./pages/Map";
import Community from "./pages/Community";
import HashtagPage from "./pages/HashtagPage";
import SupportPoints from "./pages/SupportPoints";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSOSRequests from "./pages/admin/AdminSOSRequests";
import AdminSupportPoints from "./pages/admin/AdminSupportPoints";
import AdminCommunity from "./pages/admin/AdminCommunity";
import UserProfile from "./pages/UserProfile";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const isMobile = useIsMobile();
  const [showSplash, setShowSplash] = useState(true);
  // Show splash screen on every app load on mobile
  const shouldShowSplash = isMobile && showSplash;

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              {shouldShowSplash ? (
                <SplashScreen onFinish={() => setShowSplash(false)} />
              ) : (
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="sos-requests" element={<AdminSOSRequests />} />
                    <Route path="support-points" element={<AdminSupportPoints />} />
                    <Route path="community" element={<AdminCommunity />} />
                    <Route path="admins" element={<AdminUsers />} />
                    <Route path="settings" element={<Profile />} />
                  </Route>
                  
                  {/* User Routes */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Map />} />
                    <Route path="home" element={<Home />} />
                    <Route path="map" element={<Map />} />
                    <Route path="community" element={<Community />} />
                    <Route path="support-points" element={<SupportPoints />} />
                    <Route path="hashtag/:hashtag" element={<HashtagPage />} />
                    <Route path="history" element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    } />
                    <Route path="profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="profile/:userId" element={
                      <ProtectedRoute>
                        <UserProfile />
                      </ProtectedRoute>
                    } />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              )}
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;