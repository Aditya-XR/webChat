import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { toast } from "react-hot-toast";


export const ChatContext = createContext();
 

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const {socket, axios} = useContext(AuthContext);

    //function to get all users from backend
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/v1/messages/getUsers");
            const fetchedUsers = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.users)
                    ? data.users
                    : [];

            setUsers(fetchedUsers);
            setUnseenMessages(data?.unseenMessages || {});
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to fetch users");
        }
    }

    //function to get messages for a selected user
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/v1/messages/messages/${userId}`);
            if (data.success) {
                setMessages(data.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to fetch messages");
        }
    };

    //function to send message to a selected user
    const sendMessage = async (userId, text = "", image = null) => {
        try {
            const formData = new FormData();
            const normalizedText = typeof text === "string" ? text : "";

            if (normalizedText) {
                formData.append("text", normalizedText);
            }

            if (image instanceof File) {
                formData.append("image", image);
            }

            const { data } = await axios.post(
                `/api/v1/messages/send-message/${userId}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            if (data.success) {
                // Handle successful message sending
                const newMessage = data.data;
                setMessages(prevMessages => [...prevMessages, newMessage]);
                socket.emit("new-message", { to: userId, message: newMessage });
                return true;
            }

            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to send message");
            return false;
        }
    };

    //function to subscribe to socket events for real-time updates
    const subscribeToMessage = async () => {
        if(!socket) return;

        socket.on("newMessage", (newMessage) => {
            if(selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                axios.put(`/api/v1/messages/mark-as-seen/${newMessage._id}`);
            }else{
                setUnseenMessages((prevUnseenMessages) =>({
                    ...prevUnseenMessages,
                    [newMessage.senderId]: (prevUnseenMessages[newMessage.senderId] || 0) + 1
                }))
            }
        })
    }

    //function to unsubscribe from socket events to prevent memory leaks
    const unsubscribeFromMessage = () => {
        if(socket){
            socket.off("newMessage");
        }
    }

    useEffect(() =>{
        subscribeToMessage();
        return () => {
            unsubscribeFromMessage();
        }
    }, [socket, selectedUser])


    const value = {
        messages,
        setMessages,
        users,
        setUsers,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        getUsers,
        getMessages,
        sendMessage,
        subscribeToMessage,
        unsubscribeFromMessage
    }

    return (
     <ChatContext.Provider value={value}>
        {children}
    </ChatContext.Provider>
    )
}
