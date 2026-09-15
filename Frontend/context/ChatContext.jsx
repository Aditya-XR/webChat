import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { toast } from "react-hot-toast";


export const ChatContext = createContext();
 

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
    const [activeRelationship, setActiveRelationship] = useState(null);

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
    //function to get all accepted contacts from backend
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
            toast.error(error.response?.data?.message || error.message || "Failed to fetch contacts");
        }
    }

    //function to get pending requests (incoming and outgoing)
    const getPendingRequests = async () => {
        try {
            const { data } = await axios.get("/api/v1/contacts/requests", {
                headers: { "x-no-loader": "true" }
            });
            if (data.success) {
                setPendingRequests(data.data || { incoming: [], outgoing: [] });
            }
        } catch (error) {
            console.error("Failed to fetch pending requests", error);
        }
    };

    //function to search registered users for invitations
    const searchUsers = async (query) => {
        try {
            const { data } = await axios.get(`/api/v1/contacts/search?q=${encodeURIComponent(query)}`, {
                headers: { "x-no-loader": "true" }
            });
            return data?.data || [];
        } catch (error) {
            toast.error(error.response?.data?.message || "Search failed");
            return [];
        }
    };

    //function to send a chat invitation
    const sendInvite = async (recipientId) => {
        try {
            const { data } = await axios.post(`/api/v1/contacts/invite/${recipientId}`);
            if (data.success) {
                toast.success(data.message || "Invitation sent successfully");
                getPendingRequests();
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to send invitation");
            return false;
        }
    };

    //function to accept a chat invitation
    const acceptInvite = async (contactId) => {
        try {
            const { data } = await axios.put(`/api/v1/contacts/accept/${contactId}`);
            if (data.success) {
                toast.success("Invitation accepted! Added to contacts.");
                getUsers();
                getPendingRequests();
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to accept invitation");
            return false;
        }
    };

    //function to decline/cancel an invitation
    const rejectInvite = async (contactId) => {
        try {
            const { data } = await axios.delete(`/api/v1/contacts/reject/${contactId}`);
            if (data.success) {
                toast.success("Invitation removed");
                getPendingRequests();
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to remove invitation");
            return false;
        }
    };

    //function to block a user
    const blockContact = async (userId) => {
        try {
            const { data } = await axios.post(`/api/v1/contacts/block/${userId}`);
            if (data.success) {
                toast.success("User blocked");
                getUsers();
                if (selectedUser && selectedUser._id === userId) {
                    setSelectedUser((prev) => ({
                        ...prev,
                        isBlocked: true,
                        isBlockedByMe: true,
                        isBlockedByOther: false,
                        blockedBy: authUser?._id,
                    }));
                    setActiveRelationship({
                        status: "blocked",
                        isBlockedByMe: true,
                        isBlockedByOther: false,
                        blockedBy: authUser?._id,
                    });
                }
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to block user");
            return false;
        }
    };

    //function to unblock a user
    const unblockContact = async (userId) => {
        try {
            const { data } = await axios.post(`/api/v1/contacts/unblock/${userId}`);
            if (data.success) {
                toast.success("User unblocked");
                getUsers();
                if (selectedUser && selectedUser._id === userId) {
                    setSelectedUser((prev) => ({
                        ...prev,
                        isBlocked: false,
                        isBlockedByMe: false,
                        isBlockedByOther: false,
                        blockedBy: null,
                    }));
                    setActiveRelationship({
                        status: "accepted",
                        isBlockedByMe: false,
                        isBlockedByOther: false,
                        blockedBy: null,
                    });
                }
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to unblock user");
            return false;
        }
    };

    //function to get messages for a selected user
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/v1/messages/messages/${userId}`, {
                headers: { "x-no-loader": "true" }
            });
            if (data.success) {
                setMessages(data.data);
                setActiveRelationship(data.relationship || null);
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

        // Contact event listeners
        socket.on("contactRequestReceived", (contact) => {
            const senderName = contact?.requester?.fullName || "A user";
            toast(`💬 ${senderName} sent you a chat invitation!`, {
                duration: 5000,
                icon: "👋",
            });
            getPendingRequests();
        });

        socket.on("contactRequestAccepted", (contact) => {
            const otherName =
                contact?.requester?._id === authUser?._id
                    ? contact?.recipient?.fullName
                    : contact?.requester?.fullName;

            toast.success(`${otherName || "User"} accepted your chat invitation!`);
            getUsers();
            getPendingRequests();
        });

        socket.on("contactRequestRejected", () => {
            getPendingRequests();
        });

        socket.on("contactBlocked", ({ userId, blockedBy }) => {
            getUsers();
            if (selectedUser && (selectedUser._id === userId || selectedUser._id === blockedBy)) {
                const isByMe = String(blockedBy) === String(authUser?._id);
                setSelectedUser((prev) => prev ? {
                    ...prev,
                    isBlocked: true,
                    isBlockedByMe: isByMe,
                    isBlockedByOther: !isByMe,
                    blockedBy,
                } : null);
                setActiveRelationship({
                    status: "blocked",
                    isBlockedByMe: isByMe,
                    isBlockedByOther: !isByMe,
                    blockedBy,
                });
            }
        });

        socket.on("contactUnblocked", ({ userId }) => {
            getUsers();
            if (selectedUser && selectedUser._id === userId) {
                setSelectedUser((prev) => prev ? {
                    ...prev,
                    isBlocked: false,
                    isBlockedByMe: false,
                    isBlockedByOther: false,
                    blockedBy: null,
                } : null);
                setActiveRelationship({
                    status: "accepted",
                    isBlockedByMe: false,
                    isBlockedByOther: false,
                    blockedBy: null,
                });
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
            socket.off("contactRequestReceived");
            socket.off("contactRequestAccepted");
            socket.off("contactRequestRejected");
            socket.off("contactBlocked");
            socket.off("contactUnblocked");
        }
    }

    useEffect(() =>{
        subscribeToMessage();
        return () => {
            unsubscribeFromMessage();
        }
    }, [socket, selectedUser])
    }, [socket, selectedUser, authUser])

    useEffect(() => {
        if (authUser) {
            getPendingRequests();
        }
    }, [authUser]);

    const value = {
        messages,
        setMessages,
        users,
        setUsers,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        pendingRequests,
        setPendingRequests,
        activeRelationship,
        setActiveRelationship,
        getUsers,
        getPendingRequests,
        searchUsers,
        sendInvite,
        acceptInvite,
        rejectInvite,
        blockContact,
        unblockContact,
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
