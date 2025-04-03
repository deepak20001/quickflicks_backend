import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const reelSchema = new Schema(
    {
        reel_url: {
            type: String,
            required: true,
        },
        reel_thumbnail_url: {
            type: String,
            required: true,
        },
        caption: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    }, 
    {
    timestamps: true,
    },
);

reelSchema.plugin(mongooseAggregatePaginate);

export const Reel = mongoose.model("Reel", reelSchema);
