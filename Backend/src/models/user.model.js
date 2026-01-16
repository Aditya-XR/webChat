import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        email: 
        {
            type: String,
            required: true,
            unique: true, 
            lowercase: true,
            trim: true,
        },
        fullName: 
        {
            type: String,
            required: true,
            trim: true,
        },
        bio:
        {
            type: String,
            maxlength: 160,
            default: ""
        },
        password:
        {
            type: String,
            minlength: 8,
            required: [true, "Password is required"],
        }
        
    },
    {timestamps: true}
);

const User = mongoose.model("User", userSchema);

export default User;