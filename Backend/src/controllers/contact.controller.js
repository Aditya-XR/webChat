import Contact from "../models/contact.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getIo, userSocketMap } from "../socket.js";

const searchUsers = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!query) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "Empty search query"));
    }

    // Find verified users matching name or email, excluding current user
    const users = await User.find({
        _id: { $ne: myId },
        isVerified: true,
        $or: [
            { fullName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    })
        .select("fullName email profilePic bio")
        .limit(20);

    // Retrieve all relationships for current user
    const relationships = await Contact.find({
        $or: [{ requester: myId }, { recipient: myId }],
    });

    const relationshipMap = new Map();
    relationships.forEach((rel) => {
        const otherId = rel.requester.equals(myId)
            ? rel.recipient.toString()
            : rel.requester.toString();

        relationshipMap.set(otherId, rel);
    });

    const formattedUsers = users.map((user) => {
        const rel = relationshipMap.get(user._id.toString());
        let relationshipStatus = "none";
        let contactId = null;
        let blockedBy = null;

        if (rel) {
            contactId = rel._id;
            blockedBy = rel.blockedBy;
            if (rel.status === "accepted") {
                relationshipStatus = "accepted";
            } else if (rel.status === "blocked") {
                relationshipStatus = "blocked";
            } else if (rel.status === "pending") {
                relationshipStatus = rel.requester.equals(myId)
                    ? "pending_sent"
                    : "pending_received";
            }
        }

        return {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
            bio: user.bio,
            relationshipStatus,
            contactId,
            blockedBy,
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedUsers, "Users searched successfully"));
});

const sendInvite = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { recipientId } = req.params;

    if (!recipientId) {
        throw new ApiError(400, "Recipient ID is required");
    }

    if (myId.toString() === recipientId.toString()) {
        throw new ApiError(400, "You cannot invite yourself");
    }

    const recipient = await User.findById(recipientId).select("fullName email profilePic bio isVerified");
    if (!recipient || !recipient.isVerified) {
        throw new ApiError(404, "Recipient user not found or not verified");
    }

    let contact = await Contact.findRelationship(myId, recipientId);

    if (contact) {
        if (contact.status === "accepted") {
            throw new ApiError(400, "User is already in your contacts");
        }

        if (contact.status === "blocked") {
            throw new ApiError(403, "Cannot send an invite to a blocked contact");
        }

        if (contact.status === "pending") {
            if (contact.requester.equals(myId)) {
                throw new ApiError(400, "Invitation already sent and pending");
            } else {
                // If the other user already sent an invite, auto-accept it
                contact.status = "accepted";
                await contact.save();

                const populated = await Contact.findById(contact._id)
                    .populate("requester", "fullName email profilePic bio")
                    .populate("recipient", "fullName email profilePic bio");

                // Emit event to both sockets
                const requesterSocketId = userSocketMap[contact.requester.toString()];
                const recipientSocketId = userSocketMap[contact.recipient.toString()];

                if (requesterSocketId) {
                    getIo().to(requesterSocketId).emit("contactRequestAccepted", populated);
                }
                if (recipientSocketId) {
                    getIo().to(recipientSocketId).emit("contactRequestAccepted", populated);
                }

                return res
                    .status(200)
                    .json(new ApiResponse(200, populated, "Contact request accepted"));
            }
        }

        if (contact.status === "rejected") {
            contact.requester = myId;
            contact.recipient = recipientId;
            contact.status = "pending";
            contact.blockedBy = null;
            await contact.save();
        }
    } else {
        contact = await Contact.create({
            requester: myId,
            recipient: recipientId,
            status: "pending",
        });
    }

    const populatedContact = await Contact.findById(contact._id)
        .populate("requester", "fullName email profilePic bio")
        .populate("recipient", "fullName email profilePic bio");

    // Real-time notification to recipient
    const recipientSocketId = userSocketMap[recipientId.toString()];
    if (recipientSocketId) {
        getIo().to(recipientSocketId).emit("contactRequestReceived", populatedContact);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, populatedContact, "Invitation sent successfully"));
});

const getPendingRequests = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    const incoming = await Contact.find({
        recipient: myId,
        status: "pending",
    })
        .populate("requester", "fullName email profilePic bio")
        .sort({ createdAt: -1 });

    const outgoing = await Contact.find({
        requester: myId,
        status: "pending",
    })
        .populate("recipient", "fullName email profilePic bio")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { incoming, outgoing },
                "Pending requests fetched successfully"
            )
        );
});

const acceptInvite = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId);
    if (!contact) {
        throw new ApiError(404, "Invitation request not found");
    }

    if (!contact.recipient.equals(myId)) {
        throw new ApiError(403, "You can only accept invitations sent to you");
    }

    if (contact.status !== "pending") {
        throw new ApiError(400, `Invitation is already ${contact.status}`);
    }

    contact.status = "accepted";
    await contact.save();

    const populatedContact = await Contact.findById(contact._id)
        .populate("requester", "fullName email profilePic bio")
        .populate("recipient", "fullName email profilePic bio");

    // Notify both users in real time
    const requesterSocketId = userSocketMap[contact.requester.toString()];
    const recipientSocketId = userSocketMap[contact.recipient.toString()];

    if (requesterSocketId) {
        getIo().to(requesterSocketId).emit("contactRequestAccepted", populatedContact);
    }
    if (recipientSocketId) {
        getIo().to(recipientSocketId).emit("contactRequestAccepted", populatedContact);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, populatedContact, "Invitation accepted successfully"));
});

const rejectInvite = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId);
    if (!contact) {
        throw new ApiError(404, "Invitation request not found");
    }

    if (!contact.recipient.equals(myId) && !contact.requester.equals(myId)) {
        throw new ApiError(403, "Not authorized to manage this request");
    }

    const requesterId = contact.requester.toString();
    await Contact.findByIdAndDelete(contactId);

    // Notify requester of rejection/cancellation
    const requesterSocketId = userSocketMap[requesterId];
    if (requesterSocketId) {
        getIo().to(requesterSocketId).emit("contactRequestRejected", { contactId });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { contactId }, "Invitation removed successfully"));
});

const blockContact = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { userId } = req.params;

    if (myId.toString() === userId.toString()) {
        throw new ApiError(400, "You cannot block yourself");
    }

    let contact = await Contact.findRelationship(myId, userId);

    if (contact) {
        contact.status = "blocked";
        contact.blockedBy = myId;
        await contact.save();
    } else {
        contact = await Contact.create({
            requester: myId,
            recipient: userId,
            status: "blocked",
            blockedBy: myId,
        });
    }

    // Notify both sockets
    const myScId = userSocketMap[myId.toString()];
    const targetScId = userSocketMap[userId.toString()];

    if (myScId) {
        getIo().to(myScId).emit("contactBlocked", { userId, blockedBy: myId });
    }
    if (targetScId) {
        getIo().to(targetScId).emit("contactBlocked", { userId: myId, blockedBy: myId });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, contact, "User blocked successfully"));
});

const unblockContact = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { userId } = req.params;

    const contact = await Contact.findRelationship(myId, userId);

    if (!contact || contact.status !== "blocked") {
        throw new ApiError(400, "User is not blocked");
    }

    if (!contact.blockedBy || !contact.blockedBy.equals(myId)) {
        throw new ApiError(403, "You can only unblock a user blocked by you");
    }

    contact.status = "accepted";
    contact.blockedBy = null;
    await contact.save();

    // Notify both sockets
    const myScId = userSocketMap[myId.toString()];
    const targetScId = userSocketMap[userId.toString()];

    if (myScId) {
        getIo().to(myScId).emit("contactUnblocked", { userId });
    }
    if (targetScId) {
        getIo().to(targetScId).emit("contactUnblocked", { userId: myId });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, contact, "User unblocked successfully"));
});

const getBlockedContacts = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    const blocked = await Contact.find({
        status: "blocked",
        blockedBy: myId,
    })
        .populate("requester", "fullName email profilePic bio")
        .populate("recipient", "fullName email profilePic bio");

    const blockedUsers = blocked.map((b) =>
        b.requester._id.equals(myId) ? b.recipient : b.requester
    );

    return res
        .status(200)
        .json(new ApiResponse(200, blockedUsers, "Blocked users fetched successfully"));
});

export {
    searchUsers,
    sendInvite,
    getPendingRequests,
    acceptInvite,
    rejectInvite,
    blockContact,
    unblockContact,
    getBlockedContacts,
};

