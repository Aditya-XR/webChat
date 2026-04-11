import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired");
    }

    throw new ApiError(401, "Invalid access token");
  }

  const user = await User.findById(decodedToken?._id).select("-password -refreshToken -verificationToken -emailUpdateToken");

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;
  next();
});

export const requireVerifiedUser = asyncHandler(async (req, res, next) => {
  if (req.user?.isVerified !== true) {
    throw new ApiError(403, "Please verify your email before accessing chat features");
  }

  next();
});
