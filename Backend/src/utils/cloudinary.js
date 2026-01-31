import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        //uploding the file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file uploaded successfully
       // console.log("msg/cloudinary.js: File uploaded on cloudinary successfully", response.url);
       fs.unlinkSync(localFilePath); //removing the file from local storage after successful upload
        return response.url;
    } catch (error) {
        //removing the file from local storage in case of error
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary};

