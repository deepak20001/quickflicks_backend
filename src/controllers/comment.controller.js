import { 
    Comment, 
    Reel, 
} from "../models/index.js";
import { asyncHandler } from "../utils/index.js";
import mongoose, { isValidObjectId } from "mongoose";
import { 
    ApiError,
    ApiResponse,
} from "../utils/index.js";

// @desc get reel comments
// @route GET /api/v1/comments/:reel_id
// @access private
const getReelComments = asyncHandler( async (req, res) => {
    /*
    1. Extract the reel ID from the request parameters.
    2. Validate the presence of the reel ID; if absent, throw a 400 error.
    3. Check if the reel ID is a valid ObjectId; if not, throw a 400 error.
    4. Find the reel in the database using the provided reel ID; 
        if not found, throw a 400 error.
    5. Use an aggregation pipeline to retrieve all comments associated with the specified reel ID.
        a. Match comments where the reel_id equals the provided reel ID.
        b. Perform a lookup to join with the users collection to get user details for the commenters.
        c. Unwind the commented_by array to flatten the result for easier access to user details.
        d. Perform a lookup to get likes associated with each comment.
        e. Perform another lookup to get replies to comments.
        f. Add fields to count likes and replies, and check if the current user liked the comment.
        g. Project the desired fields to include in the response.
    6. Send a success response with the fetched comments.
    */
    
    const { reel_id } = req.params;

    if(!reel_id) {
        throw new ApiError(
            400,
            "Reel ID is missing",
        );
    }

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

    const comments = await Comment.aggregate([
        {
            $match: { 
                reel_id: new mongoose.Types.ObjectId(reel_id),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "commented_by",
                foreignField: "_id",
                as: "commented_by",
            },
        },
        {
            // Unwind the commented_by array to flatten it
            $unwind: {
                path: "$commented_by",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment_id",
                as: "liked_by_users",
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "parent_comment_id",
                as: "replies",
            },
        },
        {
            $addFields: {
                likes_count: {
                    $size: "$liked_by_users",
                },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$liked_by_users.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
                replies_count: {
                    $size: "$replies",
                },
            },
        },
        {
            $project: {
                _id: 1,
                comment: 1,
                is_Edited: 1,
                commented_by: {
                    _id: "$commented_by._id",
                    user_name: "$commented_by.user_name",
                    avatar: "$commented_by.avatar",
                },
                likes_count: 1,
                is_liked: "$is_liked",
                replies_count: 1,
                createdAt: 1,  
                updatedAt: 1,
            }
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully",
        )
    );
});

// @desc get comment replies
// @route GET /api/v1/comments/r/:parent_comment_id
// @access private
const getReplyComments = asyncHandler( async (req, res) => {
    /*
    1. Extract the parent comment ID from the request parameters.
    2. Validate the presence of the parent comment ID; if absent, throw a 400 error.
    3. Check if the parent comment ID is a valid ObjectId; if not, throw a 400 error.
    4. Find the parent comment in the database using the provided parent comment ID; if not found, throw a 400 error.
    5. Use an aggregation pipeline to retrieve all replies associated with the specified parent comment ID.
        a. Match comments where the parent_comment_id equals the provided parent comment ID.
        b. Perform a lookup to join with the users collection to get user details for the commenters.
        c. Unwind the `commented_by` array to flatten the result for easier access to user details.
        d. Perform a lookup to get likes associated with each reply.
        e. Add fields to count likes and check if the current user liked the reply.
        f. Project the desired fields, including the reply text and user details.
    6. Send a success response with the fetched replies.
    */
    
    const { parent_comment_id } = req.params;

    if(!parent_comment_id) {
        throw new ApiError(
            400,
            "Parent comment ID is missing",
        );
    }

    if(!isValidObjectId(parent_comment_id)) {
        throw new ApiError(
            400,
            "Parent comment ID is invalid",
        );
    }

    const comment = await Comment.findById(parent_comment_id);
    if(!comment) {
        throw new ApiError(
            400,
            "Parent comment not found",
        );
    }

    // const comments = await Comment.find( {parent_comment_id} ).select("-reel_id");
    const comments = await Comment.aggregate([
        {
            $match: { 
                parent_comment_id: new mongoose.Types.ObjectId(parent_comment_id),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "commented_by",
                foreignField: "_id",
                as: "commented_by",
            },
        },
        {
            // Unwind the commented_by array to flatten it
            $unwind: {
                path: "$commented_by",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment_id",
                as: "liked_by_users",
            },
        },
        {
            $addFields: {
                likes_count: {
                    $size: "$liked_by_users",
                },
                is_liked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$liked_by_users.liked_by"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                comment: 1,
                is_Edited: 1,
                commented_by: {
                    _id: "$commented_by._id",
                    user_name: "$commented_by.user_name",
                    avatar: "$commented_by.avatar",
                },
                likes_count: 1,
                is_liked: "$is_liked",
                createdAt: 1,  
                updatedAt: 1,
            }
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Replies fetched successfully",
        )
    );
});

// @desc post a comment on reel
// @route POST /api/v1/comments/c/:reel_id
// @access private
const postReelComment = asyncHandler( async (req, res) => {
    /*
    1. Extract the reel ID from the request parameters.
    2. Extract the comment text from the request body.
    3. Validate the presence of the reel ID; if absent, throw a 400 error.
    4. Validate the presence of the comment text; if missing or empty, throw a 400 error.
    5. Check if the reel ID is a valid ObjectId; if not, throw a 400 error.
    6. Find the reel in the database using the provided reel ID; if not found, throw a 400 error.
    7. Create a new comment associated with the specified reel, including the user who commented.
    8. Check if the comment was created successfully; if not, throw a 400 error.
    9. Send a success response indicating the comment was created successfully.
    */
    
    const { reel_id } = req.params;
    const { comment: commentText } = req.body;

    if(!reel_id) {
        throw new ApiError(
            400,
            "Reel ID is missing",
        );
    }

    if(!commentText || commentText.trim() === "") {
        throw new ApiError(
            400,
            "Comment is missing",
        );
    }

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

    const comment = await Comment.create({
        reel_id,
        comment: commentText,
        commented_by: req.user._id,
    });

    if(!comment) {
        throw new ApiError(
            400,
            "Error creating comment",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                "_id": comment._id,
            },
            "Comment created successfully",
        )
    );
});

// @desc post a reply in comment
// @route POST /api/v1/comments/r/:reel_id
// @access private
const postReplyComment = asyncHandler( async (req, res) => {
    /*
    1. Extract the reel ID from the request parameters and the comment text and parent comment ID from the request body.
    2. Validate the presence and validity of the reel ID and parent comment ID.
    3. Check if the reel and parent comment exist in the database.
    4. Create a new reply comment associated with the specified reel and parent comment.
    5. Send a success response indicating the reply was created successfully.
    */
    
    const { reel_id } = req.params;
    const { 
        comment: commentText, 
        parent_comment_id: parentCommentId, 
    } = req.body;

    if (!reel_id || !isValidObjectId(reel_id)) {
        throw new ApiError(
            400, 
            !reel_id ? "Reel ID is missing" : "Reel ID is invalid",
        );
    }
    if(!commentText || commentText.trim() === "") {
        throw new ApiError(
            400,
            "Comment is missing",
        );
    }

    if (!parentCommentId || !isValidObjectId(parentCommentId)) {
        throw new ApiError(
            400, 
            !parentCommentId ? "Parent comment ID is missing" : "Parent comment ID is invalid",
        );
    }

    const reel = await Reel.findById(reel_id);
    if(!reel) {
        throw new ApiError(
            400,
            "Reel not found",
        );
    }

    const parentComment = await Comment.findById(parentCommentId);
    if(!parentComment) {
        throw new ApiError(
            400,
            "Parent comment not found",
        );
    }

    const comment = await Comment.create({
        reel_id,
        comment: commentText,
        parent_comment_id: parentCommentId,
        commented_by: req.user._id,
    });

    if(!comment) {
        throw new ApiError(
            400,
            "Error creating reply",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                "_id": comment._id,
            },
            "Reply created successfully",
        )
    );
});

// @desc edit a comment on reel
// @route PATCH /api/v1/comments/c/:comment_id
// @access private
const editReelComment = asyncHandler( async (req, res) => {
    /*
    1. Extract the comment ID from the request parameters and the comment text from the request body.
    2. Validate the presence and validity of the comment ID; if missing or invalid, throw a 400 error.
    3. Validate the presence of the comment text; if missing or empty, throw a 400 error.
    4. Check if the comment exists in the database; if not found, throw a 400 error.
    5. Update the comment with the new comment text using findByIdAndUpdate.
    6. If the update is unsuccessful, throw a 400 error indicating the comment was not found.
    7. Send a success response with the updated comment ID and a success message.
    */
    
    const { comment_id: commentId } = req.params;
    const { 
        comment: commentText,
    } = req.body;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(
            400, 
            !commentId ? "Comment ID is missing" : "Comment ID is invalid",
        );
    }

    if(!commentText || commentText.trim() === "") {
        throw new ApiError(
            400,
            "Comment is missing",
        );
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(
            400,
            "Comment not found",
        );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId, 
        { 
            comment: commentText,
            is_Edited: true,
        },
        { new: true },
    );

    if(!updatedComment) {
        throw new ApiError(
            400,
            "Comment not found",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                "_id": updatedComment._id,
            },
            "Comment updated successfully",
        )
    );
});

// @desc delete a comment on reel
// @route DELETE /api/v1/comments/c/:comment_id
// @access private
const deleteReelComment = asyncHandler( async (req, res) => {
    /*
    1. Extract the comment ID from the request parameters.
    2. Validate the presence and validity of the comment ID; if missing or invalid, throw a 400 error.
    3. Check if the comment exists in the database; if not found, throw a 400 error.
    4. Delete all child comments where parent_comment_id matches the comment ID.
    5. Delete the specified comment by its ID.
    6. If the deletion is unsuccessful, throw a 400 error indicating the comment was not found.
    7. Send a success response with the deleted comment ID and a success message.
    */
    
    const { comment_id: commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(
            400, 
            !commentId ? "Comment ID is missing" : "Comment ID is invalid",
        );
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(
            400,
            "Comment not found",
        );
    }

    await Comment.deleteMany({ parent_comment_id: commentId });
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(
            400, 
            "Comment not found",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                "_id": deletedComment._id,
            },
            "Comment deleted successfully",
        )
    );
});

export { 
    getReelComments,
    postReelComment,
    postReplyComment,
    getReplyComments,
    editReelComment,
    deleteReelComment,
};