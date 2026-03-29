import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const UPLOAD_TIMEOUT_MS = 15 * 1000;
const UPLOAD_TIMEOUT_MESSAGE = "Upload took too long. Try again or send a compressed version.";

const removeLocalFile = (localFilePath) => {
    if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }
};

const withUploadTimeout = async (uploadPromiseFactory) => {
    let timeoutId;

    try {
        return await Promise.race([
            uploadPromiseFactory(),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new ApiError(408, UPLOAD_TIMEOUT_MESSAGE));
                }, UPLOAD_TIMEOUT_MS);
            })
        ]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        //uploding the file to cloudinary
        const response = await withUploadTimeout(() =>
            cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto",
                timeout: UPLOAD_TIMEOUT_MS
            })
        );
        //file uploaded successfully
       removeLocalFile(localFilePath); //removing the file from local storage after successful upload
        return response.secure_url || response.url;
    } catch (error) {
        //removing the file from local storage in case of error
        removeLocalFile(localFilePath);
        console.error("Cloudinary upload error:", error);
        if (error instanceof ApiError) {
            throw error;
        }

        if (String(error?.message || "").toLowerCase().includes("timeout")) {
            throw new ApiError(408, UPLOAD_TIMEOUT_MESSAGE);
        }

        throw new ApiError(500, error?.message || "Cloudinary upload failed");
    }
}

const directUploadOnCloudinary = async (file) => {
    try{
        if(!file) return null;
        //uploding the file to cloudinary
        const response = await withUploadTimeout(() =>
            cloudinary.uploader.upload(file.path, {
                resource_type: "auto",
                timeout: UPLOAD_TIMEOUT_MS
            })
        );
        return response.secure_url || response.url;
    } catch (error) {
        console.error("Cloudinary direct upload error:", error);
        if (error instanceof ApiError) {
            throw error;
        }

        if (String(error?.message || "").toLowerCase().includes("timeout")) {
            throw new ApiError(408, UPLOAD_TIMEOUT_MESSAGE);
        }

        throw new ApiError(500, error?.message || "Cloudinary direct upload failed");

    }
}

export {
    uploadOnCloudinary,
    directUploadOnCloudinary,
    UPLOAD_TIMEOUT_MS,
    UPLOAD_TIMEOUT_MESSAGE
};
