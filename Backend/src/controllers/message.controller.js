import Message from "../models/messages.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asynchHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { io, userSocketMap } from "../server.js";

const getUsersFroSidebar = asyncHandler(async (req, res) => {
    const userId = req.user._id; // need to add auth middleware to get user from token
    const filteredUser = await User.find({_id: {$ne: userId}}).select("-password -refreshToken");
    
    //cout unseen messages for each user
    //the below code can be optimized further using aggregation pipeline
    const unseenMessages = {};
    const promises = filteredUser.map(async (user) =>{
        const messages = await Message.find({senderId: user._id, receiverId: userId, seen: false});
        if(messages.length > 0){
            unseenMessages[user._id] = messages.length;
        }
    });
    await Promise.all(promises);
    res.status(200)
    .json({users: filteredUser, unseenMessages});   
});

const getMessages = asyncHandler(async(req, res) => {
    
    const myId = req.user._id; // need to add auth middleware to get user from token

    const messages = await Message.find({
        $or: [
            {senderId: myId, receiverId: selectedUserId},
            {senderId: selectedUserId, receiverId: myId}
        ]
    })

    //mark messages as seen
    await Message.updateMany({senderId: selectedUserId, receiverId: myId}, {seen: true});

    res.status(200).json(messages);
});

//api to mark messages as seen when user opens the chat, this will be called from frontend when user opens the chat with a particular user
const markMessagesAsSeen = asyncHandler(async(req, res) => {
    const {id} = req.params; //id of the user whose messages are to be marked as seen
    await Message.findByIdAndUpdate(id, {seen: true});
    res.status(200).json({message: "Messages marked as seen"});
});

//send message to selected user, this will be called from frontend when user sends a message to a particular user
const sendMessage = asyncHandler(async(req, res) => {
    const {text, image} = req.body;
    const receiverId = req.params.id; //id of the user to whom message is to be sent
    const senderId = req.user._id; // need to add auth middleware to get user from token

    //uplode image if exists and get the url
    let imageUrl = "";
    if(image){
        const uploadedImageUrl = await uploadOnCloudinary(image);
        imageUrl = uploadedImageUrl.secure_url;
    }

    const newMessage = await Message.create({
        senderId,
        receiverId,
        text,
        image: imageUrl
    })

    //emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
        io.to(receiverSocketId).emit("new-message", newMessage);
    }

    res.status(201).json(newMessage);

});


export{
    getUsersFroSidebar,
    getMessages,
    markMessagesAsSeen,
    sendMessage
}
