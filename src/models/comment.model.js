import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
    {
        reel_id: {
            type: Schema.Types.ObjectId,
            ref: "Reel",
            required: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        parent_comment_id: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        commented_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        is_Edited: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export const Comment = mongoose.model("Comment", commentSchema);