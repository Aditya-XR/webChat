import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import bcrypt from "bcrypt"
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getCookieOptions = () => ({
  httpOnly: true,
  secure: true,
});

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isGoogleHostedProfilePic = (profilePic = "") => {
  if (typeof profilePic !== "string" || profilePic.trim().length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(profilePic);
    return parsedUrl.hostname.endsWith("googleusercontent.com");
  } catch (error) {
    return false;
  }
};

const validatePassword = (password) => {
  if (typeof password !== "string") {
    throw new ApiError(400, "Password must be a string ");
  }

  if (password.trim().length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long ");
  }
};

const sendAuthResponse = async (res, userId, message, requiresProfileCompletion = false) => {
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(userId);

  if (!accessToken || !refreshToken) {
    throw new ApiError(500, "Error generating access and refresh tokens ");
  }

  const loggedInUser = await User.findById(userId).select("-password -refreshToken");

  if (!loggedInUser) {
    throw new ApiError(500, "Authenticated user could not be loaded ");
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, getCookieOptions())
    .cookie("refreshToken", refreshToken, getCookieOptions())
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
          requiresProfileCompletion,
        },
        message
      )
    );
};

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
      throw new ApiError(500, "Error generating access and refresh tokens ");
  }
}

const signUp = asyncHandler(async (req, res) => {
  const { email, fullName, bio, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";

    // Required field validation
    const requiredFields = { email, fullName, password };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string") {
        throw new ApiError(400, `${key} must be a string `);
      }

      const trimmed = value.trim();
      if (trimmed.length === 0) {
        throw new ApiError(400, `${key} is required `);
      }

      requiredFields[key] = trimmed; // normalize
    }

    validatePassword(password);

    // Optional field validation
    if (bio !== undefined && typeof bio !== "string") {
      throw new ApiError(400, "bio must be a string ");
    }

    const ExistingUser = await User.findOne({ email: normalizedEmail });
    if (ExistingUser) {
      throw new ApiError(
        409,
        "User with this email already exists "
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create user
    const newUser = await User.create({
      email: normalizedEmail,
      fullName: normalizedFullName,
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
    const normalizedEmail = normalizeEmail(email);
    //console.log(req.body)
    // Validate input
    if (typeof email !== "string" || normalizedEmail.length === 0) {
      throw new ApiError(400, "Email is required and must be a string ");
    }

    const user = await User.findOne({ email: normalizedEmail });
    if(!user){
      throw new ApiError(401, "Invalid email or password ");
    }

    if (!user.password) {
      throw new ApiError(401, "This account uses Google sign-in. Continue with Google.");
    }

    validatePassword(password);

    //password validation
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
      throw new ApiError(401, "Invalid email or password ");
    }

    return sendAuthResponse(res, user._id, "User logged in successfully");
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (typeof credential !== "string" || credential.trim().length === 0) {
    throw new ApiError(400, "Google credential is required ");
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "Google sign-in is not configured ");
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw new ApiError(401, "Invalid or expired Google credential ");
  }

  const payload = ticket.getPayload();
  const googleId = payload?.sub;
  const normalizedEmail = normalizeEmail(payload?.email);
  const isEmailVerified = payload?.email_verified === true;
  const googleName = typeof payload?.name === "string" ? payload.name.trim() : "";
  const googlePicture = typeof payload?.picture === "string" ? payload.picture.trim() : "";

  if (!googleId || !normalizedEmail || !isEmailVerified) {
    throw new ApiError(401, "Google account verification failed ");
  }

  let user = await User.findOne({ googleId });
  let requiresProfileCompletion = false;

  if (user) {
    let shouldSave = false;

    if (googleName && !user.fullName) {
      user.fullName = googleName;
      shouldSave = true;
    }

    // Refresh Google-hosted avatar URLs, but keep custom uploaded avatars intact.
    if (googlePicture && (!user.profilePic || isGoogleHostedProfilePic(user.profilePic))) {
      user.profilePic = googlePicture;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save({ validateBeforeSave: false });
    }
  } else {
    user = await User.findOne({ email: normalizedEmail });

    if (user?.googleId && user.googleId !== googleId) {
      throw new ApiError(409, "This email is already linked to another Google account.");
    }

    if (user) {
      let shouldSave = false;

      user.googleId = googleId;
      shouldSave = true;

      if (!user.fullName && googleName) {
        user.fullName = googleName;
        shouldSave = true;
      }

      if (googlePicture && (!user.profilePic || isGoogleHostedProfilePic(user.profilePic))) {
        user.profilePic = googlePicture;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = await User.create({
        email: normalizedEmail,
        fullName: googleName || normalizedEmail.split("@")[0],
        profilePic: googlePicture,
        bio: "",
        googleId,
        password: null,
      });

      requiresProfileCompletion = true;
    }
  }

  return sendAuthResponse(
    res,
    user._id,
    "Google sign-in successful",
    requiresProfileCompletion
  );
});

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
        ...getCookieOptions(),
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

const updateProfile = asyncHandler(async (req, res) => {
      const { bio, fullName } = req.body;
      const UserId = req.user._id;

      // Build update object with only provided fields
      const updateFields = {};
      if (bio !== undefined) updateFields.bio = bio;
      if (fullName !== undefined) updateFields.fullName = fullName;

      // Check if file was uploaded via multer
      const localFilePath = req.file?.path;

      if(localFilePath) {
        // Upload to cloudinary
        const cloudinaryUrl = await uploadOnCloudinary(localFilePath);
        if(!cloudinaryUrl) {
          throw new ApiError(500, "Error uploading profile picture to cloudinary");
        }
        updateFields.profilePic = cloudinaryUrl;
      }

      // Only update if there are fields to update
      if(Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "No fields to update");
      }

      const updatedUser = await User.findByIdAndUpdate(
        UserId, 
        { $set: updateFields },
        { new: true }
      ).select("-password -refreshToken");

      if(!updatedUser){
        throw new ApiError(500, "Error updating user profile //user.controller.js");
      }

      return res.
      status(200).
      json(
        new ApiResponse(200, updatedUser, "User profile updated successfully")
      );
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

export { 
  signUp,
  login,
  googleLogin,
  logout,
  updateProfile,
  getCurrentUser
 };
