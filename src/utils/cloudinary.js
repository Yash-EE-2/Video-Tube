import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;
    try {
        const fileExtension = localFilePath.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'avi', 'mov', 'wmv'].includes(fileExtension);

        let uploadOptions = {
            resource_type: isVideo ? "video" : "image",
        };

        if (isVideo) {
            uploadOptions.eager = [
                { streaming_profile: "full_hd", format: "m3u8" }
            ];
            uploadOptions.eager_async = true;
            uploadOptions.eager_notification_url = "http://localhost:9000"; // Replace with your endpoint
        }

        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);

        fs.unlinkSync(localFilePath); 
        console.log("data dekh le chandan", response)
        console.log("File uploaded to Cloudinary:", response.url);

        let result = {
            url: response.url,
            publicId: response.public_id,
        };

        // 🤚add this functionality to get M3U8 video file extenstion from cloudinary
        if (isVideo && response.eager && response.eager[0]) {
            result.hlsUrl = response.eager[0].secure_url;
            result.duration = response.duration;
            console.log("HLS URL:", result.hlsUrl);
        }

        console.log(response);
        return result;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);
        fs.unlinkSync(localFilePath); 
        return null;
    }
};



// Function to delete file from Cloudinary
const destoryOnCloudinary = async (publicId) => {
    if (!publicId) return null;
    try {
        const response = await cloudinary.uploader.destroy(publicId);
        console.log("File deleted from Cloudinary:", response);
        console.log("everything will be succesfully deleted")
        return response;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, destoryOnCloudinary };