import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendEmailUpdateVerificationEmail, sendVerificationEmail } from "../utils/email.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PUBLIC_USER_PROJECTION = "-password -refreshToken -verificationToken -emailUpdateToken";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: true,
});

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const getEmailTokenSecret = () => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new ApiError(500, "Email verification is not configured");
  }

  return process.env.ACCESS_TOKEN_SECRET;
};

const generateEmailToken = (payload, expiresIn) =>
  jwt.sign(payload, getEmailTokenSecret(), { expiresIn });

const verifyEmailTokenPayload = (token) => {
  try {
    return jwt.verify(token, getEmailTokenSecret());
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(410, "Link Expired");
    }

    throw new ApiError(410, "Link Expired");
  }
};

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

const findConflictingEmailOwner = async (email, currentUserId = null) => {
  const query = {
    $or: [{ email }, { pendingEmail: email }],
  };

  if (currentUserId) {
    query._id = { $ne: currentUserId };
  }

  return User.findOne(query);
};

const sendAuthResponse = async (res, userId, message, requiresProfileCompletion = false) => {
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(userId);

  if (!accessToken || !refreshToken) {
    throw new ApiError(500, "Error generating access and refresh tokens ");
  }

  const loggedInUser = await User.findById(userId).select(PUBLIC_USER_PROJECTION);

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

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating access and refresh tokens ");
  }
};

const signUp = asyncHandler(async (req, res) => {
  const { email, fullName, bio, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
  const normalizedBio = typeof bio === "string" ? bio.trim() : "";

  const requiredFields = { email, fullName, password };

  for (const [key, value] of Object.entries(requiredFields)) {
    if (typeof value !== "string") {
      throw new ApiError(400, `${key} must be a string `);
    }

    if (value.trim().length === 0) {
      throw new ApiError(400, `${key} is required `);
    }
  }

  validatePassword(password);

  if (bio !== undefined && typeof bio !== "string") {
    throw new ApiError(400, "bio must be a string ");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const ExistingUser = await User.findOne({ email: normalizedEmail });

  if (ExistingUser) {
    if (ExistingUser.isVerified === true || ExistingUser.googleId) {
      throw new ApiError(409, "User with this email already exists ");
    }

    const previousState = {
      fullName: ExistingUser.fullName,
      bio: ExistingUser.bio,
      password: ExistingUser.password,
      verificationToken: ExistingUser.verificationToken,
      pendingEmail: ExistingUser.pendingEmail,
      emailUpdateToken: ExistingUser.emailUpdateToken,
    };

    const verificationToken = generateEmailToken(
      {
        sub: ExistingUser._id.toString(),
        purpose: "signup-verification",
        email: normalizedEmail,
      },
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || "24h"
    );

    ExistingUser.fullName = normalizedFullName;
    ExistingUser.bio = normalizedBio;
    ExistingUser.password = hashedPassword;
    ExistingUser.verificationToken = verificationToken;
    ExistingUser.pendingEmail = null;
    ExistingUser.emailUpdateToken = null;
    await ExistingUser.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail({
        to: normalizedEmail,
        token: verificationToken,
        fullName: normalizedFullName,
      });
    } catch (error) {
      ExistingUser.fullName = previousState.fullName;
      ExistingUser.bio = previousState.bio;
      ExistingUser.password = previousState.password;
      ExistingUser.verificationToken = previousState.verificationToken;
      ExistingUser.pendingEmail = previousState.pendingEmail;
      ExistingUser.emailUpdateToken = previousState.emailUpdateToken;
      await ExistingUser.save({ validateBeforeSave: false });
      throw new ApiError(500, "Failed to send verification email. Please try again.");
    }

    const pendingUser = await User.findById(ExistingUser._id).select(PUBLIC_USER_PROJECTION);

    return res.status(200).json(
      new ApiResponse(200, pendingUser, "Account already exists but is not verified. We sent a new verification email.")
    );
  }

  const newUser = await User.create({
    email: normalizedEmail,
    fullName: normalizedFullName,
    bio: normalizedBio,
    password: hashedPassword,
    isVerified: false,
  });

  const verificationToken = generateEmailToken(
    {
      sub: newUser._id.toString(),
      purpose: "signup-verification",
      email: normalizedEmail,
    },
    process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || "24h"
  );

  newUser.verificationToken = verificationToken;
  await newUser.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail({
      to: normalizedEmail,
      token: verificationToken,
      fullName: normalizedFullName,
    });
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    throw new ApiError(500, "Failed to send verification email. Please try again.");
  }

  const createdUser = await User.findById(newUser._id).select(PUBLIC_USER_PROJECTION);

  return res.status(201).json(
    new ApiResponse(201, createdUser, "Account created. Please verify your email before logging in.")
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (typeof email !== "string" || normalizedEmail.length === 0) {
    throw new ApiError(400, "Email is required and must be a string ");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(401, "Invalid email or password ");
  }

  if (!user.password) {
    throw new ApiError(401, "This account uses Google sign-in. Continue with Google.");
  }

  validatePassword(password);

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid email or password ");
  }

  if (user.isVerified !== true) {
    throw new ApiError(403, "Please verify your email before logging in.");
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

    if (googlePicture && (!user.profilePic || isGoogleHostedProfilePic(user.profilePic))) {
      user.profilePic = googlePicture;
      shouldSave = true;
    }

    if (user.isVerified !== true) {
      user.isVerified = true;
      shouldSave = true;
    }

    if (user.verificationToken || user.pendingEmail || user.emailUpdateToken) {
      user.verificationToken = null;
      user.pendingEmail = null;
      user.emailUpdateToken = null;
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
      user.isVerified = true;
      user.verificationToken = null;
      user.pendingEmail = null;
      user.emailUpdateToken = null;
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
        isVerified: true,
        verificationToken: null,
        pendingEmail: null,
        emailUpdateToken: null,
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

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new ApiError(400, "Verification token is required");
  }

  const decodedToken = verifyEmailTokenPayload(token.trim());
  const userId = decodedToken?.sub;
  const purpose = decodedToken?.purpose;

  if (!userId || !purpose) {
    throw new ApiError(410, "Link Expired");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(410, "Link Expired");
  }

  if (purpose === "signup-verification") {
    if (user.verificationToken !== token) {
      throw new ApiError(410, "Link Expired");
    }

    if (normalizeEmail(decodedToken.email) !== user.email) {
      throw new ApiError(410, "Link Expired");
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save({ validateBeforeSave: false });

    const verifiedUser = await User.findById(userId).select(PUBLIC_USER_PROJECTION);

    return res
      .status(200)
      .json(new ApiResponse(200, verifiedUser, "Verification Successful"));
  }

  if (purpose === "email-change") {
    const normalizedPendingEmail = normalizeEmail(decodedToken.pendingEmail);

    if (!user.pendingEmail || user.emailUpdateToken !== token || normalizedPendingEmail !== user.pendingEmail) {
      throw new ApiError(410, "Link Expired");
    }

    const conflictingUser = await findConflictingEmailOwner(normalizedPendingEmail, user._id);

    if (conflictingUser) {
      throw new ApiError(409, "That email is already in use.");
    }

    user.email = normalizedPendingEmail;
    user.pendingEmail = null;
    user.emailUpdateToken = null;
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(userId).select(PUBLIC_USER_PROJECTION);

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Verification Successful"));
  }

  throw new ApiError(410, "Link Expired");
});

const requestEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  const normalizedNewEmail = normalizeEmail(newEmail);

  if (!normalizedNewEmail) {
    throw new ApiError(400, "New email is required");
  }

  if (normalizedNewEmail === req.user.email) {
    throw new ApiError(400, "Please choose a different email address.");
  }

  const conflictingUser = await findConflictingEmailOwner(normalizedNewEmail, req.user._id);

  if (conflictingUser) {
    throw new ApiError(409, "That email is already in use.");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const previousPendingEmail = user.pendingEmail;
  const previousEmailUpdateToken = user.emailUpdateToken;
  const emailUpdateToken = generateEmailToken(
    {
      sub: user._id.toString(),
      purpose: "email-change",
      pendingEmail: normalizedNewEmail,
    },
    process.env.EMAIL_UPDATE_TOKEN_EXPIRY || "24h"
  );

  user.pendingEmail = normalizedNewEmail;
  user.emailUpdateToken = emailUpdateToken;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmailUpdateVerificationEmail({
      to: normalizedNewEmail,
      token: emailUpdateToken,
      fullName: user.fullName,
    });
  } catch (error) {
    user.pendingEmail = previousPendingEmail;
    user.emailUpdateToken = previousEmailUpdateToken;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send email update verification link. Please try again.");
  }

  const updatedUser = await User.findById(user._id).select(PUBLIC_USER_PROJECTION);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Check your new email to confirm the change."));
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
  );

  const options = {
    ...getCookieOptions(),
    expires: new Date(0)
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, null, "User logged out successfully")
    );
});

const updateProfile = asyncHandler(async (req, res) => {
  const { bio, fullName } = req.body;
  const UserId = req.user._id;

  const updateFields = {};
  if (bio !== undefined) updateFields.bio = bio;
  if (fullName !== undefined) updateFields.fullName = fullName;

  const localFilePath = req.file?.path;

  if (localFilePath) {
    const cloudinaryUrl = await uploadOnCloudinary(localFilePath);
    if (!cloudinaryUrl) {
      throw new ApiError(500, "Error uploading profile picture to cloudinary");
    }
    updateFields.profilePic = cloudinaryUrl;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    UserId,
    { $set: updateFields },
    { new: true }
  ).select(PUBLIC_USER_PROJECTION);

  if (!updatedUser) {
    throw new ApiError(500, "Error updating user profile //user.controller.js");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "User profile updated successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export {
  signUp,
  login,
  googleLogin,
  verifyEmail,
  requestEmailChange,
  logout,
  updateProfile,
  getCurrentUser
};
