import { User } from "../models/index.js";

// Helper function to generate access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();


        user.refresh_token = refreshToken;
        await user.save({
            ValidateBeforeSave: false
        });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
    }
}

export { generateAccessAndRefreshTokens };