import { asyncHandler } from "../utils/asynchHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt"
import { generateToken } from "../utils/functions.js";

const signUp = asyncHandler(async (req, res) => {
  const { email, fullName, bio, password } = req.body;

  try {
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

    // Generate JWT token
    const token = generateToken(newUser._id);
    // Send response
    return res.status(201).json(
        new ApiResponse(201, createduser, "User registered successfully")
    );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Internal Server Error //user.controller.js",
    );
  }
});

export { signUp };
