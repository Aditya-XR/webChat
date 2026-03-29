import Message from "../models/messages.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getIo, userSocketMap } from "../socket.js";

const getUsersForSidebar = asyncHandler(async (req, res) => {
    const userId = req.user._id; // need to add auth middleware to get user from token
    const filteredUser = await User.find({_id: {$ne: userId}}).select("-password -refreshToken");
    
    //count unseen messages for each user
    //the below code can be optimized further using aggregation pipeline
    const unseenMessages = {};
    const promises = filteredUser.map(async (user) =>{
        const messages = await Message.find({
            senderId: user._id, 
            receiverId: userId,
            seen: false});
        if(messages.length > 0){
            unseenMessages[user._id] = messages.length;
        }
    });
    await Promise.all(promises);

    const response = new ApiResponse(200, filteredUser, "Sidebar users fetched successfully");
    response.unseenMessages = unseenMessages;

    return res.status(200).json(response);
});

const getMessages = asyncHandler(async(req, res) => {
    const myId = req.user._id; // added by verifyJWT
    const selectedUserId = req.params.id; // comes from route: /messages/:id

    if (!selectedUserId) {
        throw new ApiError(400, "User id is required in params");
    }

    //mark messages as seen (only those sent by selected user to me)
    await Message.updateMany(
        { senderId: selectedUserId, receiverId: myId, seen: false },
        { $set: { seen: true } }
    );
//get all messages between me and selected user
    const messages = await Message.find({
        $or: [
            { senderId: myId, receiverId: selectedUserId },
            { senderId: selectedUserId, receiverId: myId }
        ]
    }).sort({ createdAt: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, messages, "Messages fetched successfully"));
});

//api to mark messages as seen when user opens the chat, this will be called from frontend when user opens the chat with a particular user
const markMessagesAsSeen = asyncHandler(async(req, res) => {
    const {id} = req.params; //id of the user whose messages are to be marked as seen
    await Message.findByIdAndUpdate(id, {seen: true});
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

    //emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
        getIo().to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, newMessage, "Message sent successfully"));

});


export{
    getUsersForSidebar,
    getMessages,
    markMessagesAsSeen,
    sendMessage
}
