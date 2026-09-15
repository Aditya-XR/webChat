import mongoose, { Schema } from "mongoose";

const contactSchema = new Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "blocked"],
            default: "pending",
            index: true,
        },
        blockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

// Prevent duplicate relationship entries in the same direction
contactSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Static helper to find relationship between any two users regardless of direction
contactSchema.statics.findRelationship = function (userA, userB) {
    return this.findOne({
        $or: [
            { requester: userA, recipient: userB },
            { requester: userB, recipient: userA },
        ],
    });
};

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;

