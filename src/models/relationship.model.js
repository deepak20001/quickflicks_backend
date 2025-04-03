import mongoose, { Schema } from "mongoose";

const relationshipSchema = new Schema(
    {
        follower: {
            type: Schema.Types.ObjectId,  // one who is following
            ref: "User",
        },
        following: {
            type: Schema.Types.ObjectId,  // one who is being followed
            ref: "User",
        },
    },
    {
        timestamps: true,
    },
);

export const Relationship = mongoose.model("Relationship", relationshipSchema);