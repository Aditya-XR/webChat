import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt"

const generateAccessAndRefreshTokens = async (UserId) => {
  try {
      const user = await User.findById(UserId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      //storing refresh token in db
      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave: false});

      return { accessToken, refreshToken };
  } catch (error) {
      throw new ApiError(500, "Error generating access and refresh tokens //user.controller.js");
  }
}

const signUp = asyncHandler(async (req, res) => {
  const { email, fullName, bio, password } = req.body;

    // Required field validation
    const requiredFields = { email, fullName, password };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string") {
        throw new ApiError(400, `${key} must be a string //user.controller.js`);
      }

      const trimmed = value.trim();
      if (trimmed.length === 0) {
        throw new ApiError(400, `${key} is required //user.controller.js`);
      }

      requiredFields[key] = trimmed; // normalize
    }

    // Optional field validation
    if (bio !== undefined && typeof bio !== "string") {
      throw new ApiError(400, "bio must be a string //user.controller.js");
    }

    const ExistingUser = await User.findOne({ email });
    if (ExistingUser) {
      throw new ApiError(
        409,
        "User with this email already exists //user.controller.js",
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create user
    const newUser = await User.create({
      email: requiredFields.email,
      fullName: requiredFields.fullName,
      bio: bio,
      password: hashedPassword,
    });

    // Verify user creation
    const createduser = await User.findById(newUser._id).select("-password ");

    if (!createduser) {
      throw new ApiError(500, "User registration failed, please try again");
    }

    // Send response
    return res.status(201).json(
        new ApiResponse(201, createduser, "User registered successfully")
    );
  
});

const login = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    // Validate input
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ApiError(400, "Email is required and must be a string //user.controller.js");
    }
    if (typeof password !== "string" || password.trim().length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters long //user.controller.js");
    }

    const user = await User.findOne({ email });
    if(!user){
      throw new ApiError(401, "Invalid email or password //user.controller.js");
    }
    console.log("User found: ", user._id);

    //password validation
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
      throw new ApiError(401, "Invalid email or password //user.controller.js");
    }
    console.log("User authenticated successfully: ", user._id);

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    console.log("Logged in user data prepared: ", loggedInUser);

    const options = {//cookie options -> only server can modify httpOnly
        httpOnly: true,
        secure: true
    }

   return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
              {
                user: loggedInUser,accessToken, refreshToken
              },
                "User logged in successfully"
            )
        );  
  
})

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }

        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        expires: new Date(0) // Expire the cookie immediately
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, null, "User logged out successfully")
        );
})

export { 
  signUp,
  login,
  logout
 };
