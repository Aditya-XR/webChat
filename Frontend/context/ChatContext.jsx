import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { toast } from "react-hot-toast";


export const ChatContext = createContext();
 

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const {socket, axios, authUser} = useContext(AuthContext);

    const applyMessageUpdate = (updatedMessage) => {
        if (!updatedMessage?._id) return;

        setMessages((prevMessages) => {
            let didUpdate = false;

            const nextMessages = prevMessages.map((message) => {
                if (message._id !== updatedMessage._id) {
                    return message;
                }

                didUpdate = true;
                return {
                    ...message,
                    ...updatedMessage,
                };
            });

            return didUpdate ? nextMessages : prevMessages;
        });
    };

    const buildOptimisticDeletedMessage = (message) => ({
        ...message,
        text: "",
        image: "",
        isDeleted: true,
        deletedAt: message?.deletedAt || new Date().toISOString(),
        deletedBy: authUser?._id || message?.deletedBy || null,
    });

    //function to get all users from backend
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/v1/messages/getUsers", {
                headers: { "x-no-loader": "true" }
            });
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
            const { data } = await axios.get(`/api/v1/messages/messages/${userId}`, {
                headers: { "x-no-loader": "true" }
            });
            if (data.success) {
                setMessages(data.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to fetch messages");
        }
    };

    //function to send message to a selected user
    const sendMessage = async (userId, text = "", image = null) => {
        const tempId = `temp_${Date.now()}`;
        let localImageUrl = "";

        if (image instanceof File) {
            localImageUrl = URL.createObjectURL(image);
        }

        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,
            receiverId: userId,
            text,
            image: localImageUrl,
            createdAt: new Date().toISOString(),
            seen: false,
            status: "sending"
        };

        // Instantly append optimistic message
        setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

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
                        "x-no-loader": "true"
                    },
                }
            );
            if (data.success) {
                const newMessage = data.data;
                // Replace the temporary message with the real one
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg._id === tempId ? newMessage : msg
                    )
                );
                socket?.emit("new-message", { to: userId, message: newMessage });
                return true;
            }

            // If success is false
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg._id === tempId ? { ...msg, status: "failed" } : msg
                )
            );
            return false;
        } catch (error) {
            // Mark as failed
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg._id === tempId ? { ...msg, status: "failed" } : msg
                )
            );
            toast.error(error.response?.data?.message || error.message || "Failed to send message");
            return false;
        }
    };

    const deleteMessage = async (messageId) => {
        const existingMessage = messages.find((message) => message._id === messageId);

        if (!existingMessage) {
            return false;
        }

        const optimisticMessage = buildOptimisticDeletedMessage(existingMessage);
        applyMessageUpdate(optimisticMessage);

        try {
            const { data } = await axios.put(
                `/api/v1/messages/delete-message/${messageId}`,
                {},
                {
                    headers: { "x-no-loader": "true" }
                }
            );

            if (data.success) {
                applyMessageUpdate(data.data);
                return true;
            }

            applyMessageUpdate(existingMessage);
            return false;
        } catch (error) {
            applyMessageUpdate(existingMessage);
            toast.error(error.response?.data?.message || error.message || "Failed to delete message");
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
                axios.put(`/api/v1/messages/mark-as-seen/${newMessage._id}`, {}, {
                    headers: { "x-no-loader": "true" }
                });
            }else{
                setUnseenMessages((prevUnseenMessages) =>({
                    ...prevUnseenMessages,
                    [newMessage.senderId]: (prevUnseenMessages[newMessage.senderId] || 0) + 1
                }))
            }
        });

        socket.on("messageDeleted", (deletedMessage) => {
            applyMessageUpdate(deletedMessage);
        });

        socket.on("messageSeen", ({ messageId, receiverId }) => {
            if (selectedUser && String(selectedUser._id) === String(receiverId)) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg._id === messageId ? { ...msg, seen: true } : msg
                    )
                );
            }
        });

        socket.on("messagesSeenAll", ({ senderId, receiverId }) => {
            if (selectedUser && String(selectedUser._id) === String(receiverId)) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        String(msg.receiverId) === String(receiverId) ? { ...msg, seen: true } : msg
                    )
                );
            }
        });
    }

    //function to unsubscribe from socket events to prevent memory leaks
    const unsubscribeFromMessage = () => {
        if(socket){
            socket.off("newMessage");
            socket.off("messageDeleted");
            socket.off("messageSeen");
            socket.off("messagesSeenAll");
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
        deleteMessage,
        subscribeToMessage,
        unsubscribeFromMessage
    }

    return (
     <ChatContext.Provider value={value}>
        {children}
    </ChatContext.Provider>
    )
}
