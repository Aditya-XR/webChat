import { createContext } from "react";
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

    const checkAuth = async () => {
        try{
            const { data } = await axios.get("/api/auth.check");
            if(data.success){
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        }catch(err){
            toast.error(err.message || "Authentication check failed");
        }
    }

//login function
    const login = async (state, credentials) => {
        try{
            const { data } = await axios.post("/api/auth/${state}", credentials);
            if(data.success){
                setToken(data.token);
                localStorage.setItem("token", data.token);
                setAuthUser(data.user);
                connectSocket(data.user);
                axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
                //axios.defaults.headers.common["token"] = data.token;
                toast.success("Login successful");
            }
            else{
                toast.error(data.message || "Login failed");
            }
        } catch(err){
            toast.error(err.message || "Login failed");
        }
    }
    

    //logout function
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        axios.defaults.headers.common["Authorization"] = "";
        //axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully");
        socket?.disconnect();
        setSocket(null);
    }

    //update profile function
    const updateProfile = async (body) => {
        try{
            const { data } = await axios.put("/api/auth/update-profile", body);
            if(data.success){
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            }
        }catch(err){
            toast.error("Failed to update profile");
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

         newSocket.on("getOnlineUsers", (users) => {
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
