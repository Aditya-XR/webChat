import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
        googleId:
        {
            type: String,
            unique: true,
            sparse: true,
        },
        bio:
        {
            type: String,
            maxlength: 160,
            default: ""
        },
        profilePic:
        {
            type: String,
            default: ""
        },
        password:
        {
            type: String,
            minlength: 8,
            default: null,
        },
        refreshToken:
        {
            type: String,
            default: null
        }
        
    },
    {timestamps: true}
);

userSchema.methods.isPasswordCorrect = async function(password){
    if (!this.password) {
        return false;
    }

    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        //payload
        {
            _id : this._id
        },
        //secret
        process.env.ACCESS_TOKEN_SECRET,
        //options
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY || "1d"
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        //payload
        {
            _id : this._id
        },
        //secret
        process.env.REFRESH_TOKEN_SECRET,
        //options
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY || "1h"
        }
    )
}

const User = mongoose.model("User", userSchema);

export default User;
