import { 
    Relationship, 
    User, 
} from "../models/index.js";
import { asyncHandler } from "../utils/index.js";
import mongoose, { isValidObjectId } from "mongoose";
import { 
    ApiError,
    ApiResponse,
} from "../utils/index.js";

// @desc toggle follow or unfollow user
// @route POST /api/v1/relationships/toggle/u/:user_id
// @access private
const toggleFollowUser = asyncHandler( async(req, res) => {
    /*
    1. Extract the user ID from request parameters.
    2. Validate the user ID format; throw an error if invalid.
    3. Check if user ID is the same as the current user ID. If it is, throw an error.
    4. Find the user in the database using the provided ID; throw an error if not found.
    5. Check if a follow entry already exists for the user by the current user.
    6. If a follow relationship exists:
        a. Delete the follow entry from the database.
        b. Send a success response indicating the user is no longer followed.
    7. If no follow relationship exists:
        a. Create a new follow entry in the database.
        b. Send a success response indicating the user is now followed.
    */
    const { user_id: userId } = req.params;
    if(!userId || !isValidObjectId(userId)) {
        throw new ApiError(
            400,
            !userId ? "User ID is missing" : "User ID is invalid",
        )
    }

    if(userId === req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You cannot follow yourself",
        )
    }

    const user = await User.findById(userId);  
    if(!user) {
        throw new ApiError(
            404,
            "User not found",
        );
    }

    const existingRelationship = await Relationship.findOne({
        follower: req.user?._id,
        following: userId,
    });

    const responseData = existingRelationship 
    ? { is_followed: false, user_id: existingRelationship.following, } 
    : { is_followed: true, user_id: userId, };
    const responseMessage = existingRelationship ? "Unfollowed" : "Followed";

    if(existingRelationship) {
        await Relationship.findByIdAndDelete(existingRelationship?._id);
    } else {
        await Relationship.create({
            follower: req.user?._id,
            following: userId,
        });
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            responseData,
            responseMessage,
        ),
    )
}); 

// @desc get followers listing
// @route POST /api/v1/relationships/followers/u/:user_id
// @access private
const getFollowers = asyncHandler( async(req, res) => {
    /*
    1. Extract the user ID from the request parameters.
    2. Validate the user ID format; throw an error if it's invalid or missing.
    3. Look up the user in the database using the provided ID; throw an error if the user is not found.
    4. Query the Relationship collection to find all followers for the specified user ID.
    5. Use aggregation to fetch follower details, including user name and avatar.
    6. Send a success response with the list of followers.
    */

    const { user_id: userId} = req.params;
    const currentUserId = req.user?._id;
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
    
    // Query the Relationship collection using aggregation to find all followers for the specified user ID.
    const followers = await Relationship.aggregate([
        {
            // First stage: Match documents where the user is being followed
            $match: {
                following:  new mongoose.Types.ObjectId(userId),
            },
        },
        {
            // Second stage: Lookup user details based on the follower's ID
            $lookup: {
                from: "users",                         // Join with the users collection
                localField: "follower",                // Field from the Relationship collection
                foreignField: "_id",                   // Field from the users collection
                as: "user",                            // Resulting array of user details
            },
        },
        {
            // Third stage: Unwind the user array to get individual user documents
            $unwind: {
                path: "$user",
            },
        },
        {
            // Fourth stage: Lookup to check if the current user follows each follower
            $lookup: {
                from: "relationships",                                                  // Join with the same relationships collection
                let: { followerId: "$user._id" },                                      // Use the follower's ID from the previous lookup
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$follower", currentUserId] },              // Check if the current user is a follower
                                    { $eq: ["$following", "$$followerId"] },           // Check if following the current follower
                                ],
                            },
                        },
                    },
                ],
                as: "is_following",          // Array of matching documents (can be empty)
            },
        },
        {
            // Fifth stage: Project the final output
            $project: {
                _id: 1,
                follower: {
                    _id: "$user._id",
                    user_name: "$user.user_name",
                    avatar: "$user.avatar",
                },
                is_following: {
                    $cond: [ { $gt: [{ $size: "$is_following" }, 0] }, true, false ],  // Set is_following to true if array is not empty
                },
            },
        },
    ]);

    if (!followers || followers.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200,
                "No followers found for this user",
                []
            )
        );
    }

    res.status(200).json(
        new ApiResponse(
            200,
            "Followers fetched successfully",
            followers,
        )
    ) 
} );

// @desc get followers listing
// @route POST /api/v1/relationships/followings/u/:user_id
// @access private
const getFollowings = asyncHandler(async (req, res) => {
    /*
    1. Extract the user ID from the request parameters.
    2. Validate the user ID format; throw an error if it's invalid or missing.
    3. Look up the user in the database using the provided ID; throw an error if the user is not found.
    4. Query the Relationship collection to find all followings for the specified user ID.
    5. Use aggregation to fetch followings details, including user name and avatar.
    6. Send a success response with the list of followings.
    */

    const { user_id: userId } = req.params; // Step 1: Extract user ID from request parameters.
    const currentUserId = req.user?._id; // Get the ID of the authenticated user.

    // Step 2: Validate the user ID
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(
            400,
            !userId ? "User ID is missing" : "User ID is invalid",
        );
    }

    // Step 3: Look up the user in the database
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(
            404, 
            "User not found",
        );
    }

    // Step 4: Aggregate to find followings
    const followings = await Relationship.aggregate([
        {
            // First stage: Match relationships where this user is a follower
            $match: {
                follower: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            // Second stage: Join with the users collection to get details of the followed users
            $lookup: {
                from: "users", // Join with the users collection
                localField: "following", // Field from the Relationship collection
                foreignField: "_id", // Field from the users collection
                as: "user", // Resulting array of user details
            },
        },
        {
            // Third stage: Unwind the user array to get individual user documents
            $unwind: {
                path: "$user", // Unwind the array of user details
            },
        },
        {
            // Fourth stage: Lookup to check if the current user follows each followed user
            $lookup: {
                from: "relationships", // Join with the relationships collection
                let: { followingId: "$user._id" }, // Use the followed user's ID from the previous lookup
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$follower", currentUserId] }, // Check if the current user is a follower
                                    { $eq: ["$following", "$$followingId"] }, // Check if following the current followed user
                                ],
                            },
                        },
                    },
                ],
                as: "is_following", // Array of matching documents (can be empty)
            },
        },
        {
            // Fifth stage: Project the final output
            $project: {
                _id: 1,
                followed_user: {
                    _id: "$user._id", // Include followed user's ID
                    user_name: "$user.user_name", // Include followed user's username
                    avatar: "$user.avatar", // Include followed user's avatar
                },
                is_following: {
                    $cond: [{ $gt: [{ $size: "$is_following" }, 0] }, true, false], // Set is_following to true if array is not empty
                },
            },
        },
    ]);

    // Step 5: Handle case where no followings are found
    if (!followings || followings.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200, 
                "No followings found for this user", 
                [],
            )
        );
    }

    // Step 6: Send success response with the list of followings
    res.status(200).json(
        new ApiResponse(
            200, 
            followings,
            "Followings fetched successfully",
        )
    );
});


export {
    toggleFollowUser,
    getFollowers,
    getFollowings,
}