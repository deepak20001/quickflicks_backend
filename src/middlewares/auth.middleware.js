import { ApiError } from "../utils/api_errors.js";
import { asyncHandler } from "../utils/async_handler.js"; 
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Middleware to verify the JWT token for protected routes
export const verifyJWT = asyncHandler ( async(req, _, next) => {
    /* 
    1. Extract the token from the "Authorization" header (The format of the header is "Bearer <token>")
    2. If no token is provided, throw an unauthorized error
    3. Verify the token using the JWT secret key
    4. Find the user associated with the token's payload (_id)
    5. If the user is not found in the database, throw an unauthorized error
    6. Attach the user object to the request object for use in the next middleware or controller
    7. Call the next middleware or controller in the stack
     */
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET,
        );
    
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );
    
        if(!user) {
            throw new ApiError(
                401,
                "Invalid access token",
            );
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "Invalid access token",
        );
    }
} );