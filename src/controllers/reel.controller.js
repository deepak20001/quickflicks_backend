import { 
    Reel,
    User,
    Relationship,
} from "../models/index.js";
import { 
    ApiResponse, 
    uploadOnCloudinary,
} from "../utils/index.js";
import { ApiError } from "../utils/api_errors.js";
import { 
    asyncHandler, 
    cleanUpLocalFile,
} from "../utils/index.js";
import fs from "fs";
import mongoose, { isValidObjectId } from "mongoose";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

// @desc Upload a reel
// @route POST /api/v1/reels/post-reel
// @access private
const postReel = asyncHandler( async (req, res) => {
    /*
    1. Validate the request data:
        - Ensure that a reel file is uploaded and is available in the request.
        - Check that a caption is provided and is not empty or only whitespace.
        - If either validation fails, throw an appropriate error with a 400 status code.
    2. Upload the reel file to Cloudinary:
        - Use the `uploadOnCloudinary` helper to upload the reel.
        - Ensure that the upload was successful; otherwise, throw an error.
        - Log the Cloudinary response for debugging purposes.
    3. Generate a thumbnail for the uploaded video:
        - Use FFmpeg to generate a screenshot thumbnail from the video.
        - Save the thumbnail temporarily in the `public/temp` folder.
        - Ensure that the thumbnail file exists after generation; otherwise, throw an error.
    4. Upload the thumbnail to Cloudinary:
        - Use the `uploadOnCloudinary` helper to upload the generated thumbnail.
        - Ensure that the upload was successful; otherwise, throw an error.
    5. Save reel details in the database:
        - Create a new reel document in the database, including:
            - The Cloudinary URL of the reel and its thumbnail.
            - The caption, duration, and owner information (extracted from the authenticated user).
        - Retrieve the newly created reel document to ensure it's correctly saved.
        - If saving fails, throw an error.
    6. Send a success response:
        - Return a JSON response with the created reel's data.
        - Include a success status code and a message.
    */
    const reelLocalPath = req.file?.path; 
    console.log(reelLocalPath);

    if(!reelLocalPath) {
        throw new ApiError(
            400,
            "Reel file is missing",
        );
    }

    const { caption } = req.body;

    if(!caption || caption.trim() === "") {
        throw new ApiError(
            400,
            "Caption is required",
        );
    }

    const uploadedReel = await uploadOnCloudinary(reelLocalPath);
    console.log(uploadedReel);

    if(!uploadedReel) {
        throw new ApiError(
            400,
            "Error while uploading reel on cloudinary", 
        );
    }

    // Generate thumbnail from the uploaded video
    const timestamp = Date.now(); // Generate timestamp once
    const thumbnailPath = `./public/temp/thumbnail-${timestamp}.jpg`; // Define thumbnail path
    await new Promise((resolve, reject) => {
        ffmpeg(reelLocalPath)
            .screenshots({
                count: 1,
                folder: "./public/temp", // Folder to save the thumbnail temporarily
                filename: `thumbnail-${timestamp}.jpg`,
                size: "640x?",
            })
            .on("end", () => resolve())
            .on("error", (err) => reject(err));
    });

    if (!fs.existsSync(thumbnailPath)) {
        cleanUpLocalFile(thumbnailPath);
        throw new ApiError(400, "Error generating thumbnail");
    }

    // Step 3: Upload the thumbnail to Cloudinary
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);
    if (!uploadedThumbnail) {
        throw new ApiError(400, "Error uploading thumbnail to Cloudinary");
    }
    cleanUpLocalFile(thumbnailPath);

    // Save the reel and thumbnail details in the database
    const reel = await Reel.create({
        reel_url: uploadedReel.url,     // Use the Cloudinary URL for the reel
        reel_thumbnail_url: uploadedThumbnail.url, // Use the Cloudinary URL for the thumbnail
        caption,
        duration: uploadedReel.duration,
        owner: req.user?._id,
    });

    const createdReel = await Reel.findById(reel._id);

    if(!createdReel) {  
        throw new ApiError(
            400,
            "Something went wrong while while uploading reel data to the database", 
        );  
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            createdReel,
            "Reel created successfully",
        )
    );
},
// Finally handler to clean up the local file after the process is completed
async (req, res) => {
    console.log(`File-Path: ${req?.file?.path || 'No file uploaded'}`);
    if (req?.file?.path && fs.existsSync(req.file.path))  {
        fs.unlinkSync(req.file.path);
    }
}); 

// @desc Get user reels
// @route GET /api/v1/reels/get-reels/u/$user_id
// @access private
const getReels = asyncHandler( async (req, res) => {
    /*
    1. Extract the user ID from the request parameters.
    2. Validate the presence of the user ID; if absent, throw a 400 error.
    3. Check if the user ID is a valid ObjectId; if not, throw a 400 error.
    4. Retrieve the user from the database using the provided user ID.
    5. If the user does not exist, throw a 400 error indicating the user was not found.
    6. Use an aggregation query to fetch all reels associated with the specified user.
    7. Match reels where the owner matches the user ID.
    8. Perform a lookup to join user details with the reels, fetching owner information.
    9. Unwind the owner array to create separate documents for each owner.
    10. Perform a second lookup to get likes for each reel.
    11. Perform a third lookup to get comments on each reel.
    11. Add fields for likes count and whether the current user has liked the reel & comments count & reel saved status.
    12. Project the necessary fields to include in the response.
    13. Send a success response with the fetched reels.
    */
    
    const { user_id } = req.params;

    if(!user_id) {
        throw new ApiError(
            400,
            "User ID is missing",
        );
    }

    if(!isValidObjectId(user_id)) {
        throw new ApiError(
            400,
            "User ID is invalid",
        );
    }
    
    const user = await User.findById(user_id);
    if(!user) {
        throw new ApiError(
            400,
            "User not found",
        );  
    }

    // Perform an aggregation query to find reels for the specified user.
    const reels = await Reel.aggregate([
        {
            // Match reels owned by the user.
            $match: {
                owner: new mongoose.Types.ObjectId(user_id),
            },
        },
        // Lookup to get user details for the reel owners.
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            // Unwind the owner array to flatten it
            //This part breaks apart the owner array in each document. If a document has multiple owners, it creates a separate document for each owner.
            $unwind: {
                path: "$owner",

                // If the owner field is null (meaning there's no owner), the original document will still be included in the results, and the owner field will be set to null.
                // preserveNullAndEmptyArrays: true,
            },
        },
        // Perform a lookup to fetch likes associated with the reels.
        {
            $lookup: {
                from: "likes",
                localField: "_id",           // This is the _id of the reel in the reels collection
                foreignField: "reel_id",     // This is the reel id in the likes collection
                as: "reel_liked_by", 
            },
        },
        // Perform a lookup to fetch comments associated with the reels.
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
        {
            $lookup: {
                from: "relationships",
                localField: "ownerDetails._id",           // This is the _id of the reel in the reels collection
                foreignField: "following",     // This is the reel id in the likes collection
                as: "followers", 
            },
        },
        // Add fields for likes count, liked status, comments count & reel saved status.
        {
            $addFields: {
                likes_count: { $size: "$reel_liked_by" },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$reel_liked_by.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                comments_count: {
                    $size: "$comments",
                },
                is_saved: {
                    $cond: {
                        if: { $in: ["$_id", "$owner.saved_reels"] },
                        then: true,
                        else: false,
                    },
                },
                is_following: {
                    $cond: {
                        if: { $in: [req.user?._id, "$followers.follower"] }, // Check if the logged-in user is in the followers list
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // Project the necessary fields for the response.
        {
            $project: {
                _id: 1,
                reel_thumbnail_url: 1,
                reel_url: 1,
                caption: 1,
                duration: 1,
                owner: {
                    _id: "$owner._id",
                    user_name: "$owner.user_name",
                    avatar: "$owner.avatar",
                },
                likes_count: "$likes_count",
                is_liked: "$is_liked",
                comments_count: "$comments_count",
                is_saved: 1,
                is_following: 1,
            },
        },
    ]);

    if (!reels || reels.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200,
                "No reels found for this user",
                []
            )
        );
    }


    return res.status(200).json(
        new ApiResponse(
            200,
            reels,
            "Reels fetched successfully",
        )
    );  
});

// @desc toggle reel saved status
// @route POST /api/v1/reels/r/:reel_id
// @access private
const toggleSavedReel = asyncHandler( async(req, res) => {
    /*
    1. Extracts the reel ID from the request parameters.
    2. Validates the reel ID to ensure it is present and is a valid ObjectId.
    3. Checks if the reel exists in the database; if not, responds with a 404 error.
    4. Retrieves the authenticated user based on their ID; if not found, responds with a 404 error.
    5. Toggles the reel ID in the user's saved_reels array:
        - If the reel ID is not present, it adds the reel ID.
        - If the reel ID is already present, it removes it.
    6. Saves the updated user document to the database.
    7. Sends a success response with a message indicating the operation was successful.
    */

    const { reel_id: reelId } = req.params;

    if(!reelId || !isValidObjectId(reelId)) {
        throw new ApiError(
            400,
            !reelId ? "Reel ID is missing" : "Reel ID is invalid",
        )
    }

    const reel = await Reel.findById(reelId);
    if(!reel) {
        throw new ApiError(
            404,
            "Reel not found",
        ); 
    } 
    
    const user = await User.findById(req.user._id);
    if(!user) {
        throw new ApiError(
            404,
            "User not found",
        );
    }

    if(!user.saved_reels.includes(reelId)) {
        user.saved_reels.push(reelId);

        await user.save();

        return res.status(200).json(
        new ApiResponse(
            200,
            true,
            "Reel saved successfully",
        )
    );
    } else {
        const index = user.saved_reels.indexOf(reelId);
        user.saved_reels.splice(index, 1);

        await user.save();

        return res.status(200).json(
        new ApiResponse(
            200,
            false,
            "Reel un-saved successfully",
        )
    );
    }

    
})

// @desc Get user saved reels
// @route GET /api/v1/reels/get-saved-reels/u/$user_id
// @access private
const getSavedReels = asyncHandler( async (req, res) => {
    /*
    1. Extract the user ID from the request parameters.
    2. check if the user ID is present and is a valid ObjectId.
    3. Retrieve the user from the database based on the user ID.
    4. If the user does not exist, throw a 404 error indicating the user was not found.
    5. Perform an aggregation query to find saved reels for the specified user.
    6. Project the necessary fields for the response.
    7. Send a success response with the fetched reels.
    */
    
    const { user_id: userId } = req.params;

    if(!userId || !isValidObjectId(userId)) {
        throw new ApiError(
            400,
            !userId ? "User ID is missing" : "User ID is invalid",
        )
    }

    const user = await User.findById(userId);  
    if(!user) {
        throw new ApiError(
            404,
            "User not found",
        );
    }

    const savedReels = await Reel.aggregate([
        {
            $match: {
                _id: { $in: user.saved_reels },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            // Unwind the owner array to flatten it
            $unwind: {
                path: "$owner",
            },
        },
         // Perform a lookup to fetch likes associated with the reels.
        {
            $lookup: {
                from: "likes",
                localField: "_id",           // This is the _id of the reel in the reels collection
                foreignField: "reel_id",     // This is the reel id in the likes collection
                as: "reel_liked_by", 
            },
        },
        // Perform a lookup to fetch comments associated with the reels.
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
        // Add fields for likes count, liked status, comments count & reel saved status.
        {
            $addFields: {
                likes_count: { $size: "$reel_liked_by" },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$reel_liked_by.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                comments_count: {
                    $size: "$comments",
                },
                is_saved: {
                    $cond: {
                        if: { $in: ["$_id", "$owner.saved_reels"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // Project the necessary fields for the response.
        {
            $project: {
                _id: 1,
                reel_thumbnail_url: 1,
                reel_url: 1,
                caption: 1,
                duration: 1,
                owner: {
                    _id: 1,
                    user_name: 1,
                    avatar: 1,
                },
                likes_count: "$likes_count",
                is_liked: "$is_liked",
                comments_count: "$comments_count",
                is_saved: 1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            savedReels,
            "Saved reels retrieved successfully",
        ));
});

// @desc Get user reels
// @route GET /api/v1/reels/get-reels
// @access private
const getAllReels = asyncHandler( async (req, res) => {
    const reels = await Reel.aggregate([
        {
            $lookup: {
                from: 'users', // The name of the User collection
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails',
            },
        },
        {
            $unwind: '$ownerDetails', // Unwind the ownerDetails array to get a single object
        },
          // Perform a lookup to fetch likes associated with the reels.
        {
            $lookup: {
                from: "likes",
                localField: "_id",           // This is the _id of the reel in the reels collection
                foreignField: "reel_id",     // This is the reel id in the likes collection
                as: "reel_liked_by", 
            },
        },
         // Perform a lookup to fetch comments associated with the reels.
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
        {
            $lookup: {
                from: "relationships",
                localField: "ownerDetails._id",           // This is the _id of the reel in the reels collection
                foreignField: "following",     // This is the reel id in the likes collection
                as: "followers", 
            },
        },
        // Add fields for likes count, liked status, comments count & reel saved status.
        {
            $addFields: {
                likes_count: { $size: "$reel_liked_by" },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$reel_liked_by.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                comments_count: {
                    $size: "$comments",
                },
                is_saved: {
                    $cond: {
                        if: { $in: ["$_id", "$ownerDetails.saved_reels"] },
                        then: true,
                        else: false,
                    },
                },
                is_following: {
                    $cond: {
                        if: { $in: [req.user?._id, "$followers.follower"] }, // Check if the logged-in user is in the followers list
                        then: true,
                        else: false,
                    },
                },
            },
        },
         // Project the necessary fields for the response.
        {
            $project: {
                _id: 1,
                reel_thumbnail_url: 1,
                reel_url: 1,
                caption: 1,
                duration: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    user_name: "$ownerDetails.user_name",
                    avatar: "$ownerDetails.avatar",
                },
                likes_count: "$likes_count",
                is_liked: "$is_liked",
                comments_count: "$comments_count",
                is_saved: 1,
                is_following: 1,
            },
        },
    ]);


    return res.status(200).json(
        new ApiResponse(
            200,
            reels,
            "Reels fetched successfully",
        )
    );  
});

// @desc Get user reels
// @route GET /api/v1/reels/get-following-reels
// @access private
const getFollowingReels = asyncHandler( async (req, res) => {
    const userId = req.user._id;
    const relationships = await Relationship.find({ follower: userId }).select('following');
    const followings = relationships.map((relationship) => relationship.following);
    const reels = await Reel.aggregate([
        {
            $match: {
                owner: { $in: followings },
            },
        },
        {
            $lookup: {
                from: 'users', // The name of the User collection
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails',
            },
        },
        {
            $lookup: {
                from: "relationships",
                localField: "ownerDetails._id",           // This is the _id of the reel in the reels collection
                foreignField: "following",     // This is the reel id in the likes collection
                as: "followers", 
            },
        },
        // {
        //     $unwind: '$followings', // Unwind the followings array to get a single object
        // },
        {
            $unwind: '$ownerDetails', // Unwind the ownerDetails array to get a single object
        },
        // Perform a lookup to fetch likes associated with the reels.
        {
            $lookup: {
                from: "likes",
                localField: "_id",           // This is the _id of the reel in the reels collection
                foreignField: "reel_id",     // This is the reel id in the likes collection
                as: "reel_liked_by", 
            },
        },
        // Perform a lookup to fetch comments associated with the reels.
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
        // Add fields for likes count, liked status, comments count & reel saved status.
        {
            $addFields: {
                likes_count: { $size: "$reel_liked_by" },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$reel_liked_by.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                comments_count: {
                    $size: "$comments",
                },
                is_saved: {
                    $cond: {
                        if: { $in: ["$_id", "$ownerDetails.saved_reels"] },
                        then: true,
                        else: false,
                    },
                },
                is_following: {
                    $cond: {
                        if: { $in: [userId, "$followers.follower"] }, // Check if the logged-in user is in the followers list
                        then: true,
                        else: false,
                    },
                },
            },
        }, 
         // Project the necessary fields for the response.
        {
            $project: {
                _id: 1,
                reel_thumbnail_url: 1,
                reel_url: 1,
                caption: 1,
                duration: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    user_name: "$ownerDetails.user_name",
                    avatar: "$ownerDetails.avatar",
                },
                likes_count: "$likes_count",
                is_liked: "$is_liked",
                comments_count: "$comments_count",
                is_saved: 1,
                is_following: 1,
            },
        },
    ]);


    return res.status(200).json(
        new ApiResponse(
            200,
            reels,
            "Reels fetched successfully",
        )
    );  
});

// @desc Get most liked reels
// @route GET /api/v1/reels/get-most-liked-reels
// @access private
const getMostLikedReels = asyncHandler( async (req, res) => {
    const reels = await Reel.aggregate([
        {
            $lookup: {
                from: 'users', // The name of the User collection
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails',
            },
        },
        {
            $unwind: '$ownerDetails', // Unwind the ownerDetails array to get a single object
        },
          // Perform a lookup to fetch likes associated with the reels.
        {
            $lookup: {
                from: "likes",
                localField: "_id",           // This is the _id of the reel in the reels collection
                foreignField: "reel_id",     // This is the reel id in the likes collection
                as: "reel_liked_by", 
            },
        },
         // Perform a lookup to fetch comments associated with the reels.
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
        {
            $lookup: {
                from: "relationships",
                localField: "ownerDetails._id",           // This is the _id of the reel in the reels collection
                foreignField: "following",     // This is the reel id in the likes collection
                as: "followers", 
            },
        },
        // Add fields for likes count, liked status, comments count & reel saved status.
        {
            $addFields: {
                likes_count: { $size: "$reel_liked_by" },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$reel_liked_by.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                comments_count: {
                    $size: "$comments",
                },
                is_saved: {
                    $cond: {
                        if: { $in: ["$_id", "$ownerDetails.saved_reels"] },
                        then: true,
                        else: false,
                    },
                },
                is_following: {
                    $cond: {
                        if: { $in: [req.user?._id, "$followers.follower"] }, // Check if the logged-in user is in the followers list
                        then: true,
                        else: false,
                    },
                },
            },
        },
         // Project the necessary fields for the response.
        {
            $project: {
                _id: 1,
                reel_thumbnail_url: 1,
                reel_url: 1,
                caption: 1,
                duration: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    user_name: "$ownerDetails.user_name",
                    avatar: "$ownerDetails.avatar",
                },
                likes_count: "$likes_count",
                is_liked: "$is_liked",
                comments_count: "$comments_count",
                is_saved: 1,
                is_following: 1,
            },
        },
        // Add sorting by likes_count in descending order
        {
            $sort: {
                likes_count: -1, // Sort by likes_count in descending order
            },
        },
    ]);


    return res.status(200).json(
        new ApiResponse(
            200,
            reels,
            "Most Liked reels fetched successfully",
        )
    );  
});

export {
    postReel,
    getReels,
    toggleSavedReel,
    getSavedReels,
    getAllReels,
    getFollowingReels,
    getMostLikedReels,
}