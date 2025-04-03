import { 
    Like, 
    Reel,
    Comment,
} from "../models/index.js";
import { asyncHandler } from "../utils/index.js";
import mongoose, { isValidObjectId } from "mongoose";
import { 
    ApiError,
    ApiResponse,
} from "../utils/index.js";

// @desc toggle like or unlike reel
// @route POST /api/v1/likes/toggle/:reel_id
// @access private
const toggleLikeReel = asyncHandler( async( req, res ) => {
    /*
    1. Extract the reel ID from request parameters.
    2. Validate the reel ID format; throw an error if invalid.
    3. Find the reel in the database using the provided ID; throw an error if not found.
    4. Check if a like entry already exists for the reel by the current user.
    5. If a like exists:
        a. Delete the like entry from the database.
        b. Send a success response indicating the reel is no longer liked.
    6. If no like exists:
        a. Create a new like entry in the database.
        b. Send a success response indicating the reel is now liked.
    */

    const { reel_id } = req.params;
    if(!isValidObjectId(reel_id)) {
        throw new ApiError(
            400,
            "Reel ID is invalid",
        );
    }

    const reel = await Reel.findById(reel_id);
    if(!reel) {
        throw new ApiError(
            400,
            "Reel not found",
        );  
    }

    const existingLike = await Like.findOne( { 
        reel_id, 
        liked_by: req.user?._id,
    });

    if(existingLike) {
        await Like.findByIdAndDelete( existingLike?._id );
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
            )
        );  
    } else {
        await Like.create({
            reel_id,
            liked_by: req.user?._id,
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: true,
                },
            )
        );  
    }
    

} );

// @desc toggle like or unlike comments or their replied comments
// @route POST /api/v1/likes/toggle/c/:comment_id
// @access private
const toggleLikeComment = asyncHandler( async( req, res ) => {
    /*
    Steps for toggling likes on comments:
    1. Extract the comment ID from request parameters.
    2. Validate the comment ID to ensure it's a valid MongoDB ObjectID.
        - If invalid, throw an ApiError with a 400 status code and an appropriate message.
    3. Find the comment by its ID in the database.
        - If the comment is not found, throw an ApiError with a 400 status code and a message.
    4. Check if there is an existing like from the current user for the comment.
        - This is done by querying the Like model with the comment ID and the user's ID.
    5. If an existing like is found, remove it from the database.
        - Respond with a 200 status code and indicate that the comment is no longer liked.
    6. If no existing like is found, create a new like entry in the database.
        - Respond with a 200 status code and indicate that the comment is now liked.
    */

    const { comment_id: commentId } = req.params;
    if(!isValidObjectId(commentId)) {
        throw new ApiError(
            400,
            "Comment ID is invalid",
        );
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(
            400,
            "Comment not found",
        );  
    }

    const existingLike = await Like.findOne( { 
        comment_id: commentId, 
        liked_by: req.user?._id,
    });

    if(existingLike) {
        await Like.findByIdAndDelete( existingLike?._id );
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
            )
        );  
    } else {
        await Like.create({
            comment_id: commentId, 
            liked_by: req.user?._id,
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: true,
                },
            )
        );  
    }
} );

export { 
    toggleLikeReel, 
    toggleLikeComment,
}