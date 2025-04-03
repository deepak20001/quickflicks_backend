import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        reel_id: {
            type: Schema.Types.ObjectId,
            ref: "Reel",
            default: null,
        },
        comment_id: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        liked_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const Like = mongoose.model("Like", likeSchema); 