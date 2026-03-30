import { createContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;
const backendUrl = typeof rawBackendUrl === "string"
    ? rawBackendUrl.replace(/\/+$/, "")
    : "";

export const AuthContext = createContext();

if (backendUrl) {
    axios.defaults.baseURL = backendUrl;
}

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(false);
    const activeRequestsCountRef = useRef(0);
    const loaderTimeoutRef = useRef(null);

    const clearAuthenticatedSession = () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        delete axios.defaults.headers.common["Authorization"];
        socket?.disconnect();
        setSocket(null);
    };

    const setAuthenticatedSession = (user, accessToken) => {
        setToken(accessToken);
        localStorage.setItem("token", accessToken);
        setAuthUser(user);
        connectSocket(user);
        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    };

    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/v1/users/me");
            if (data.success) {
                setAuthUser(data.data);
                connectSocket(data.data);
            }
        } catch (err) {
            const statusCode = err.response?.status;

            if (statusCode === 401) {
                clearAuthenticatedSession();
                toast.error(err.response?.data?.message || "Session expired. Please login again.");
                return;
            }

            if (token) {
                toast.error(err.response?.data?.message || err.message || "Authentication check failed");
            }
        }
    };

    //login function
    const login = async (state, credentials) => {
        if (loading || activeRequestsCountRef.current > 0) return false;

        const normalizedCredentials = {
            ...credentials,
            email: typeof credentials?.email === "string" ? credentials.email.trim() : credentials?.email,
            fullName: typeof credentials?.fullName === "string" ? credentials.fullName.trim() : credentials?.fullName,
        };

        try {
            if (state === "Sign up") {
                const signUpResponse = await axios.post("/api/v1/users/signUp", normalizedCredentials);
                if (!signUpResponse.data.success) {
                    toast.error(signUpResponse.data.message || "Signup failed");
                    return false;
                }

                const loginResponse = await axios.post("/api/v1/users/login", {
                    email: normalizedCredentials.email,
                    password: normalizedCredentials.password,
                });

                if (!loginResponse.data.success) {
                    toast.error(loginResponse.data.message || "Login failed");
                    return false;
                }

                const accessToken = loginResponse.data.data?.accessToken;
                const user = loginResponse.data.data?.user;
                localStorage.setItem("needsBioSetup", "true");
                setAuthenticatedSession(user, accessToken);
                toast.success(signUpResponse.data.message || "Signup successful");
                return true;
            }

            const { data } = await axios.post("/api/v1/users/login", normalizedCredentials);
            if (data.success) {
                const accessToken = data.data?.accessToken;
                const user = data.data?.user;
                setAuthenticatedSession(user, accessToken);
                toast.success("Login successful");
                return true;
            }

            toast.error(data.message || "Login failed");
            return false;
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Login failed");
            return false;
        }
    };

    //logout function
    const logout = () => {
        clearAuthenticatedSession();
        toast.success("Logged out successfully");
    };

    //update profile function
    const updateProfile = async (body) => {
        if (loading || activeRequestsCountRef.current > 0) return false;

        try {
            const hasProfilePic = body?.profilePic instanceof File;
            let payload = body;
            let config = {};

            if (hasProfilePic) {
                payload = new FormData();
                if (body.fullName !== undefined) payload.append("fullName", body.fullName);
                if (body.bio !== undefined) payload.append("bio", body.bio);
                payload.append("profilePic", body.profilePic);
                config.headers = {
                    "Content-Type": "multipart/form-data",
                };
            }

            const { data } = await axios.put("/api/v1/users/update-profile", payload, config);
            if (data.success) {
                setAuthUser(data.data);
                toast.success("Profile updated successfully");
                return true;
            }
            return false;
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
            return false;
        }
    };

    // Function to connect to Socket.IO server
    const connectSocket = (userData) => {
        if (!backendUrl || !userData || socket?.connected) return;
        const newSocket = io(backendUrl, {
            query: {
                userId: userData._id,
            },
        });
        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("online-users", (users) => {
            setOnlineUsers(users);
        });
    };

    useEffect(() => {
        const clearLoaderTimeout = () => {
            if (loaderTimeoutRef.current) {
                clearTimeout(loaderTimeoutRef.current);
                loaderTimeoutRef.current = null;
            }
        };

        const shouldSkipLoader = (headers) => {
            if (!headers) return false;

            const headerValue =
                typeof headers.get === "function"
                    ? headers.get("x-no-loader")
                    : headers["x-no-loader"] ?? headers["X-No-Loader"];

            return headerValue === true || headerValue === "true";
        };

        const removeSkipLoaderHeader = (headers) => {
            if (!headers) return;

            if (typeof headers.delete === "function") {
                headers.delete("x-no-loader");
                return;
            }

            delete headers["x-no-loader"];
            delete headers["X-No-Loader"];
        };

        const finishTrackedRequest = (config) => {
            if (!config?._shouldTrackLoader) return;

            activeRequestsCountRef.current = Math.max(0, activeRequestsCountRef.current - 1);

            if (activeRequestsCountRef.current === 0) {
                clearLoaderTimeout();
                setLoading(false);
            }
        };

        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                const skipLoader = shouldSkipLoader(config.headers);
                config._shouldTrackLoader = !skipLoader;
                removeSkipLoaderHeader(config.headers);

                if (!skipLoader) {
                    activeRequestsCountRef.current += 1;

                    if (activeRequestsCountRef.current === 1) {
                        clearLoaderTimeout();
                        loaderTimeoutRef.current = setTimeout(() => {
                            setLoading(true);
                            loaderTimeoutRef.current = null;
                        }, 200);
                    }
                }

                return config;
            },
            (error) => {
                finishTrackedRequest(error.config);
                return Promise.reject(error);
            },
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => {
                finishTrackedRequest(response.config);
                return response;
            },
            (error) => {
                finishTrackedRequest(error.config);
                return Promise.reject(error);
            },
        );

        return () => {
            clearLoaderTimeout();
            activeRequestsCountRef.current = 0;
            setLoading(false);
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    // Set the token in axios headers on initial load
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            //axios.defaults.headers.common["token"] = token;
        }
        checkAuth();
    }, []);

    const value = {
        axios,
        token,
        setToken,
        authUser,
        setAuthUser,
        onlineUsers,
        setOnlineUsers,
        socket,
        setSocket,
        loading,
        setLoading,
        login,
        logout,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
