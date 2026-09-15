import Message from "../models/messages.model.js";
import User from "../models/user.model.js";
import Contact from "../models/contact.model.js";
import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getIo, userSocketMap } from "../socket.js";

const sanitizeMessageForClient = (message) => {
    if (!message) return message;

    const plainMessage =
        typeof message.toObject === "function"
            ? message.toObject()
            : { ...message };

    if (plainMessage.isDeleted) {
        plainMessage.text = "";
        plainMessage.image = "";
    }

    return plainMessage;
};

const getUsersForSidebar = asyncHandler(async (req, res) => {
    const userId = req.user._id; // need to add auth middleware to get user from token
    const filteredUser = await User.find({_id: {$ne: userId}}).select("-password -refreshToken");
    
    //count unseen messages for each user
    //the below code can be optimized further using aggregation pipeline
    const userId = req.user._id;

    // Find all accepted or blocked contacts for this user
    const contacts = await Contact.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: { $in: ["accepted", "blocked"] },
    })
        .populate("requester", "fullName email profilePic bio")
        .populate("recipient", "fullName email profilePic bio")
        .sort({ updatedAt: -1 });

    const contactUsers = [];
    const unseenMessages = {};
    const promises = filteredUser.map(async (user) =>{
        const messages = await Message.find({
            senderId: user._id, 

    for (const contact of contacts) {
        const isRequester = contact.requester._id.equals(userId);
        const otherUserDoc = isRequester ? contact.recipient : contact.requester;

        if (!otherUserDoc) continue;

        const otherUser = otherUserDoc.toObject();
        otherUser.contactId = contact._id;
        otherUser.contactStatus = contact.status;
        otherUser.isBlocked = contact.status === "blocked";
        otherUser.blockedBy = contact.blockedBy;
        otherUser.isBlockedByMe = contact.status === "blocked" && Boolean(contact.blockedBy?.equals(userId));
        otherUser.isBlockedByOther = contact.status === "blocked" && !contact.blockedBy?.equals(userId);

        // Count unseen messages sent by otherUser to me
        const unseenCount = await Message.countDocuments({
            senderId: otherUser._id,
            receiverId: userId,
            seen: false});
        if(messages.length > 0){
            unseenMessages[user._id] = messages.length;
            seen: false,
        });

        if (unseenCount > 0) {
            unseenMessages[otherUser._id] = unseenCount;
        }
    });
    await Promise.all(promises);

    const response = new ApiResponse(200, filteredUser, "Sidebar users fetched successfully");
        contactUsers.push(otherUser);
    }

    const response = new ApiResponse(200, contactUsers, "Sidebar contacts fetched successfully");
    response.unseenMessages = unseenMessages;

    return res.status(200).json(response);
});

const getMessages = asyncHandler(async(req, res) => {
    const myId = req.user._id; // added by verifyJWT
    const selectedUserId = req.params.id; // comes from route: /messages/:id

    if (!selectedUserId) {
        throw new ApiError(400, "User id is required in params");
    }

    const contact = await Contact.findRelationship(myId, selectedUserId);

    //mark messages as seen (only those sent by selected user to me)
    const result = await Message.updateMany(
        { senderId: selectedUserId, receiverId: myId, seen: false },
        { $set: { seen: true } }
    );

    if (result.modifiedCount > 0) {
        // Notify the selected user (the sender of these messages) that they are read
        const senderSocketId = userSocketMap[selectedUserId.toString()];
        if (senderSocketId) {
            getIo().to(senderSocketId).emit("messagesSeenAll", { senderId: selectedUserId, receiverId: myId });
        }
    }

    //get all messages between me and selected user
    const messages = await Message.find({
        $or: [
            { senderId: myId, receiverId: selectedUserId },
            { senderId: selectedUserId, receiverId: myId }
        ]
    }).sort({ createdAt: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, messages.map(sanitizeMessageForClient), "Messages fetched successfully"));
    const relationship = contact
        ? {
            status: contact.status,
            blockedBy: contact.blockedBy,
            contactId: contact._id,
            isBlockedByMe: contact.status === "blocked" && Boolean(contact.blockedBy?.equals(myId)),
            isBlockedByOther: contact.status === "blocked" && !contact.blockedBy?.equals(myId),
        }
        : {
            status: "none",
            blockedBy: null,
            contactId: null,
            isBlockedByMe: false,
            isBlockedByOther: false,
        };

    const response = new ApiResponse(200, messages.map(sanitizeMessageForClient), "Messages fetched successfully");
    response.relationship = relationship;

    return res.status(200).json(response);
});

//api to mark messages as seen when user opens the chat, this will be called from frontend when user opens the chat with a particular user
const markMessagesAsSeen = asyncHandler(async(req, res) => {
    const {id} = req.params; //id of the message to be marked as seen
    const message = await Message.findById(id);
    if (message && !message.seen) {
        message.seen = true;
        await message.save();

        // Notify the sender that this message was seen
        const senderSocketId = userSocketMap[message.senderId.toString()];
        if (senderSocketId) {
            getIo().to(senderSocketId).emit("messageSeen", { messageId: message._id, receiverId: message.receiverId });
        }
    }
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Messages marked as seen"));
});

//send message to selected user, this will be called from frontend when user sends a message to a particular user
const sendMessage = asyncHandler(async(req, res) => {
    const {text} = req.body;
    const receiverId = req.params.id; //id of the user to whom message is to be sent
    const senderId = req.user._id; // auth middleware will add the user to req, so we can get sender id from there
    const localFilePath = req.file?.path;

    // Verify contact relationship
    const contact = await Contact.findRelationship(senderId, receiverId);

    if (!contact || contact.status === "pending" || contact.status === "rejected") {
        throw new ApiError(403, "You can only message accepted contacts. Please send a chat invitation first.");
    }

    if (contact.status === "blocked") {
        if (contact.blockedBy && contact.blockedBy.equals(senderId)) {
            throw new ApiError(403, "You have blocked this contact. Unblock them to send messages.");
        } else {
            throw new ApiError(403, "You cannot send messages to this contact because you have been blocked.");
        }
    }

    //uplode image if exists and get the url
    let imageUrl = "";
    if(localFilePath){
        const uploadedImageUrl = await uploadOnCloudinary(localFilePath);
        if(!uploadedImageUrl){
            throw new ApiError(500, "Error uploading message image to cloudinary");
        }
        imageUrl = uploadedImageUrl;
    }

    if (req.isTimedOut?.()) {
        return;
    }

    const newMessage = await Message.create({
        senderId,
        receiverId,
        text,
        image: imageUrl
    });

    if (req.isTimedOut?.()) {
        return;
    }

    // Update contact updatedAt timestamp so recent conversations stay on top
    contact.updatedAt = new Date();
    await contact.save();

    //emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
        getIo().to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, newMessage, "Message sent successfully"));

});

const deleteMessage = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const messageId = req.params.id;

    const message = await Message.findOne({
        _id: messageId,
        senderId,
    });

    if (!message) {
        throw new ApiError(404, "Message not found or not deletable");
    }

    if (message.isDeleted) {
        return res
            .status(200)
            .json(new ApiResponse(200, sanitizeMessageForClient(message), "Message deleted successfully"));
    }

    message.isDeleted = true;
    message.text = null;
    message.image = null;
    message.deletedAt = new Date();
    message.deletedBy = senderId;
    await message.save();

    const sanitizedMessage = sanitizeMessageForClient(message);
    const io = getIo();
    const receiverSocketId = userSocketMap[message.receiverId.toString()];
    const senderSocketId = userSocketMap[senderId.toString()];

    if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", sanitizedMessage);
    }

    if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", sanitizedMessage);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, sanitizedMessage, "Message deleted successfully"));
});


export{
    getUsersForSidebar,
    getMessages,
    markMessagesAsSeen,
    sendMessage,
    deleteMessage
}
