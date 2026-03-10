import mongoose, {Schema} from "mongoose";

const messageSchema = new Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },
        image:{
            type: String,
            trim: true,
            default: ""
        },
        seen:{
            type: Boolean,
            default: false
        }
    },  
    {timestamps: true}
);

messageSchema.pre("validate", function (next) {
  if (!this.text.trim() && !this.image.trim()) {
    return next(new Error("Message must contain text or an image."));
  }
  next();
});

//compounding indexes to optimize queries for fetching messages between two users and counting unseen messages for a user
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, seen: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;