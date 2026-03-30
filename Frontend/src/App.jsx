import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext.jsx";
import GlobalLoader from "./components/GlobalLoader.jsx";

const App = () => {
  const { authUser, loading } = useContext(AuthContext);
  const needsBioSetup = localStorage.getItem("needsBioSetup") === "true";

  return (
    <div className="bg-[url('/bgImage.svg')] bg-contain">
      <Toaster />
      <Routes>
        <Route path="/" element={authUser && !needsBioSetup ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser || needsBioSetup ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>
      {loading && <GlobalLoader />}
    </div>
  );
};

export default App;
