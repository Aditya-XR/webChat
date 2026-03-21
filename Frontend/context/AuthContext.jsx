import { createContext, useEffect, useState } from "react";
import axios from "axios";
import {toast} from 'react-hot-toast';
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const AuthContext = createContext();
axios.defaults.baseURL = backendUrl;

export const AuthProvider = ({ children }) => {

    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    const setAuthenticatedSession = (user, accessToken) => {
        setToken(accessToken);
        localStorage.setItem("token", accessToken);
        setAuthUser(user);
        connectSocket(user);
        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    };

    const checkAuth = async () => {
        try{
            const { data } = await axios.get("/api/v1/users/me");
            if(data.success){
                setAuthUser(data.data);
                connectSocket(data.data);
            }
        }catch(err){
            if (token) {
                toast.error(err.response?.data?.message || err.message || "Authentication check failed");
            }
        }
    }

    //login function
    const login = async (state, credentials) => {
        const normalizedCredentials = {
            ...credentials,
            email: typeof credentials?.email === "string" ? credentials.email.trim() : credentials?.email,
            fullName: typeof credentials?.fullName === "string" ? credentials.fullName.trim() : credentials?.fullName,
        };

        try{
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
            if(data.success){
                const accessToken = data.data?.accessToken;
                const user = data.data?.user;
                setAuthenticatedSession(user, accessToken);
                toast.success("Login successful");
                return true;
            }

            toast.error(data.message || "Login failed");
            return false;
        } catch(err){
            toast.error(err.response?.data?.message || err.message || "Login failed");
            return false;
        }
    }
    

    //logout function
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        delete axios.defaults.headers.common["Authorization"];
        //axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully");
        socket?.disconnect();
        setSocket(null);
    }

    //update profile function
    const updateProfile = async (body) => {
        try{
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
            if(data.success){
                setAuthUser(data.data);
                toast.success("Profile updated successfully");
                return true;
            }
            return false;
        }catch(err){
            toast.error(err.response?.data?.message || "Failed to update profile");
            return false;
        }
    }

    // Function to connect to Socket.IO server
    const connectSocket = (userData) => {
        if(!userData || socket?.connected) return;
        const newSocket = io(backendUrl, {
            query: {
                userId: userData._id,
            }
        })
         newSocket.connect();
         setSocket(newSocket);

         newSocket.on("online-users", (users) => {
             setOnlineUsers(users);
         });
    }

// Set the token in axios headers on initial load
    useEffect(() => {
        if(token){
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            //axios.defaults.headers.common["token"] = token;
        }
        checkAuth();
    },[])

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
            login,
            logout,
            updateProfile,
    }
    
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
