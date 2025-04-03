import {
    asyncHandler,
} from "../utils/index.js";
import { 
    ApiError,
    ApiResponse,
} from "../utils/index.js";
import mongoose, { isValidObjectId } from "mongoose";
import {
    User,
    Reel,
} from "../models/index.js";

// @desc search for top videos
// @route GET /api/v1/search/top-liked-reels/u/:user_name
// @access private
const searchTopLikedReels = asyncHandler( async (req, res) => {
    /*
    1. Extract `username` from request parameters to filter by user, if provided.
    2. If `username` is provided:
        - Use a case-insensitive regex to find matching users.
        - If no user matches, return an error.
        - Collect matched user IDs for filtering reels.
    3. Run the MongoDB aggregation pipeline:
        - `$match`: Filter reels by matched user IDs or fetch all reels if no filter.
        - `$lookup` and `$unwind`: Retrieve reel owner details.
        - `$lookup`: Fetch likes and comments associated with each reel.
        - `$addFields`: Add computed fields:
            - `likes_count`: Total number of likes.
            - `is_liked`: Check if current user has liked the reel.
            - `comments_count`: Total number of comments.
            - `is_saved`: Check if the reel is saved by the current user.
        - `$sort`: Sort reels by `likes_count` in descending order.
        - `$project`: Define final fields to include in the output.
    4. Send response with the aggregated data of searched reels.
    */

    const { user_name: userName } = req.params;

    // Initialize matchStage for MongoDB query
    let matchStage = {};

    if (userName?.trim()) {
        // Find users whose usernames contain the provided substring (case-insensitive)
        const users = await User.find({
            user_name: { $regex: new RegExp(userName.trim(), "i") },
        });

        if (!users.length) {
            throw new ApiError(400, "No users found with the given username");
        }

        // Collect all user IDs for matching reels
        const userIds = users.map(user => user._id);

        // Set the match stage to filter reels by any of the matching users
        matchStage.owner = { $in: userIds };
    }

    const searchedReels = await Reel.aggregate([
        {
            $match: matchStage,
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
            $unwind: {
                path: "$owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "reel_id",
                as: "reel_liked_by",
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "reel_id",
                as: "comments",
            },
        },
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
        {
            $sort: {
                likes_count: -1,
            },
        },
        {
            $project: {
                _id: 1,
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
            },
        },
    ]);

    if(!searchedReels) {
        throw new ApiError(
            400,
            "Reels doesnot exist",
        );
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                searchedReels,
            },
            searchedReels.length === 0 ? "No reels found" : "Searched user reels fetched successfully",
        ),
    );
} )

// @desc search for top creators 
// @route GET /api/v1/search/top-followed-creators/u/:user_name
// @access private
const searchTopFollowedCreators = asyncHandler( async (req, res) => {
    /*
    1. Extract `user_name` from request parameters for filtering users.
    2. Initialize `matchStage` for MongoDB filtering based on user criteria.
    3. If `user_name` is provided:
        - Search for users matching the username using a case-insensitive regex.
        - If no user is found, throw an error.
        - Collect matching user IDs to filter results.
    4. Run the MongoDB aggregation pipeline:
        - `$match`: Filter users based on matched user IDs or fetch all users if none provided.
        - `$lookup`: Retrieve user details (e.g., full name, avatar).
        - `$lookup`: Fetch relationships to get followers of each user.
        - `$addFields`: Calculate the total count of followers for each user.
        - `$sort`: Order users by followers count in descending order.
        - `$project`: Specify fields to include in the final result.
    5. Send the response with the searched users' data.
    */

    const { user_name: userName } = req.params;

    // Initialize matchStage for MongoDB query
    let matchStage = {};

    if (userName?.trim()) {
        // If username is provided, find the user and filter their reels
        const users = await User.find({
            user_name: { $regex: new RegExp(userName.trim(), "i") },
        });

        // If no matching users are found, return an error
        if (!users.length) {
            throw new ApiError(400, "No users found with the given username");
        }

        // Collect all user IDs of matching users for filtering reels
        const userIds = users.map(user => user._id);

        // Set match stage to filter reels based on the list of matched user IDs
        matchStage._id = { $in: userIds };
        console.log(matchStage);
    }

    const searchedUsers = await User.aggregate([
        {
            $match: matchStage,
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $unwind: {
                path: "$user",
            },
        },
        {
            $lookup: {
                from: "relationships",
                localField: "_id",
                foreignField: "following",
                as: "followers",
            },
        },
        {
            $addFields: {
                followers_count: {
                    $size: "$followers",
                },
            },
        },
        {
            $sort: {
                followers_count: -1, // Sort by followers count in descending order
            },
        },
        {
            $project: {
                _id: 1,
                full_name: 1,
                user_name: 1,
                avatar: 1,
                followers_count: 1,
            },
        },
    ]);

    if(!searchedUsers) {
        throw new ApiError(
            400,
            "Reels doesnot exist",
        );
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                searchedUsers,
            },
            searchedUsers.length === 0 ? "No user found" : "Searched user fetched successfully",
        ),
    );
});

export {
    searchTopLikedReels,
    searchTopFollowedCreators,
}