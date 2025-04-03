import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

// Configure Cloudinary with credentials from environment variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        // Ensure the file path is provided, return null if not
        if(!localFilePath) return null;

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto", // Auto-detect the type of file (image, video, etc.)
        });

        // Log the success and return the response containing details such as URL, public_id, etc.
        console.log("File is successfully uploaded on cloudinary: ", response.url);
        
        // After successfully upload of file to cloudinary remove file from local storage
        // fs.unlinkSync(localFilePath); (not remove now as for generating thumbnail we need file)

        return response;
    } catch (error) {
        // In case of an error during upload, remove the locally saved temporary file
        fs.unlinkSync(localFilePath);
        
        return null;
    }
}

// Function to delete a file from Cloudinary using the public_id
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        // Delete the file from Cloudinary
        const response = await cloudinary.uploader.destroy(publicId);

        console.log("File successfully deleted from Cloudinary: ", response);
        return response;
    } catch (error) {
        console.error("Error deleting file from Cloudinary: ", error);
        return null;
    }
}

// Helper function to extract the public ID from the Cloudinary URL
function extractPublicIdFromUrl(url) {
    const parts = url.split('/');
    const publicIdWithExtension = parts[parts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    return publicId;
}

export { 
    uploadOnCloudinary, 
    deleteFromCloudinary, 
    extractPublicIdFromUrl, 
}