import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        full_name: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            index: true, 
        },
        user_name: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        profile_tag: {
            type: String,
            required: [true, 'Profile tag is required'],
        },
        avatar: {
            type: String, 
            required: [true, 'Avatar is required'],
        },
        saved_reels: [
            {
                type: Schema.Types.ObjectId,
                ref: "Reel",
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        refresh_token: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
)

// Pre-save hook: This hook runs before a document is saved to the database.
// It checks if the password field has been modified, and if it has, the password is hashed using bcrypt.
// Note: Use function() {} instead of () => {} to ensure correct `this` context, which refers to the current document.
userSchema.pre("save", async function( next ) {
    // If the password has not been modified, move on to the next middleware
    if(!this.isModified("password")) return next();
    
    // Hash the password before saving the document
    this.password = await bcrypt.hashSync(this.password, 10);
    next();
});

// Custom method: This method is available on all instances of the User model.
// It compares a plain-text password provided during login with the hashed password stored in the database.
userSchema.methods.isPasswordCorrect = async function (password) {
    // Compare the provided password with the hashed password in the database
    return await bcrypt.compare(password, this.password);
};

// Method to generate an access token for a user
userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            // Payload: Information embedded within the JWT
            _id: this._id,
            email: this.email,
            user_name: this.user_name,
            full_name: this.full_name,
        },
        // Secret key for signing the JWT, stored securely in the environment variable
        process.env.ACCESS_TOKEN_SECRET,
        {
            // Token expiration time, also retrieved from an environment variable
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        },
    )
}

// Method to generate a refresh token for a user
userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            // Payload: Only the user ID is included in the refresh token for minimal data
            _id: this._id,
        },
        // Secret key for signing the refresh token, stored securely in the environment variable
        process.env.REFRESH_TOKEN_SECRET,
        {
            // Token expiration time, also retrieved from an environment variable
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        },
    )
}

export const User = mongoose.model("User", userSchema);