import React, { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";

const VerifyEmailPage = () => {
  const { axios } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        if (isMounted) {
          setStatus("expired");
        }
        return;
      }

      try {
        await axios.post(
          "/api/v1/users/verify-email",
          { token },
          {
            headers: {
              "x-no-loader": "true",
            },
          }
        );

        if (isMounted) {
          setStatus("success");
        }
      } catch (error) {
        if (isMounted) {
          setStatus("expired");
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [axios, searchParams]);

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center backdrop-blur-2xl px-4">
      <div className="w-full max-w-md border-2 bg-white/8 text-white border-gray-500 p-8 rounded-xl shadow-lg text-center flex flex-col gap-5">
        <img src={assets.logo_big} alt="WebChat" className="w-32 mx-auto" />
        {status === "loading" && (
          <>
            <h1 className="text-2xl font-semibold">Verifying Email</h1>
            <p className="text-gray-300">Please wait while we confirm your link.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-semibold text-emerald-300">Verification Successful</h1>
            <p className="text-gray-200">Your email has been confirmed. You can now log in to WebChat.</p>
            <Link to="/login" className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-2 rounded-md">
              Go to Login
            </Link>
          </>
        )}

        {status === "expired" && (
          <>
            <h1 className="text-2xl font-semibold text-rose-300">Link Expired</h1>
            <p className="text-gray-200">This verification link is invalid, expired, or has already been used.</p>
            <Link to="/login" className="bg-rose-600 hover:bg-rose-700 transition-colors text-white py-2 rounded-md">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
