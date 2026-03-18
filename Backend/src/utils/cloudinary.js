import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const removeLocalFile = (localFilePath) => {
    if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        //uploding the file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file uploaded successfully
       removeLocalFile(localFilePath); //removing the file from local storage after successful upload
        return response.secure_url || response.url;
    } catch (error) {
        //removing the file from local storage in case of error
        removeLocalFile(localFilePath);
        console.error("Cloudinary upload error:", error);
        throw new Error(error?.message || "Cloudinary upload failed");
    }
}

const directUploadOnCloudinary = async (file) => {
    try{
        if(!file) return null;
        //uploding the file to cloudinary
        const response = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto"
        })
        return response.secure_url || response.url;
    } catch (error) {
        console.error("Cloudinary direct upload error:", error);
        throw new Error(error?.message || "Cloudinary direct upload failed");

    }
}

export {uploadOnCloudinary, directUploadOnCloudinary};
