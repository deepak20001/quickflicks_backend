import { 
    asyncHandler,
    ApiError,
    uploadOnCloudinary,
    deleteFromCloudinary,
    ApiResponse,
    generateAccessAndRefreshTokens,
    extractPublicIdFromUrl,
} from "../utils/index.js";
import { User } from "../models/index.js";
import fs, { exists } from "fs";
import jwt from "jsonwebtoken";

// @desc Register a user
// @route POST /api/v1/users/register
// @access public 
const registerUser = asyncHandler( 
    // requestHandler
    async (req, res) => {
    /* 
    1. Get user details from the request body sent by the frontend.
    2. Validate that none of the user details are empty.
    3. Check if a user already exists with the same username or email.
    4. Ensure an avatar file is uploaded and handle file upload to Cloudinary.
    5. Create the user in the database with all the provided details.
    6. Exclude sensitive data (password and refresh token) from the user object before sending it in the response.
    7. Return a success response indicating that the user has been registered successfully.
    */

    console.log(`File: ${req?.file || 'No file uploaded'}`);
    
    // Destructure user details from the request body
    const { 
        full_name: fullName, 
        user_name: userName, 
        email,
        profile_tag: profileTag, 
        password,
    } = req.body;

    console.log(`fullName: ${fullName},  userName: ${userName}, email: ${email}, profileTag: ${profileTag} password: ${password}`);
    
    // Validate if any of the required fields are empty
    if([fullName, userName, email, profileTag, password].some((field) => field?.trim() === "")) {
        throw new ApiError(
            400, 
            "All fields are required",
        );
    }
    
    // Check if a user with the same username or email already exists
    const existedUser = await User.findOne({
        $or: [
            { user_name: userName }, { email: email },
        ],
    });

    if(existedUser) {
        throw new ApiError(
            409, 
            "User with email or username already exists",
        );
    }

    // Multer attaches the uploaded file path to req.file
    const avatarLocalPath = req.file?.path;
    
    // Ensure that an avatar file is uploaded
    if(!avatarLocalPath) {
        throw new ApiError(
            400, 
            "Avatar file is required",
        );
    }
    
    // Upload the avatar to Cloudinary and get the URL
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar) {
        throw new ApiError(
            400, 
            "Avatar file is required",
        );
    }
    
    // Create a new user object in the database with all provided details, including the avatar URL
    const user = await User.create({
        full_name: fullName,
        user_name: userName,
        email,
        profile_tag: profileTag,
        avatar: avatar.url,           // Use the Cloudinary URL for the avatar
        password,                     // Password will be hashed in a pre-save hook
    });
    
    // Fetch the newly created user, excluding sensitive fields like password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refresh_token");

    if(!createdUser) {
        throw new ApiError(
            500, 
            "Something went wrong while registering the user",
        );
    }
    
    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "user registered successfully",
        )
    );
    }, 
    // finallyHandler
    async (req, res) => {
    console.log(`File-Path: ${req?.file?.path || 'No file uploaded'}`);
    if (req?.file?.path && fs.existsSync(req.file.path))  {
        fs.unlinkSync(req.file.path);
    }
});

// @desc Login a user
// @route POST /api/v1/users/login
// @access public
const loginUser = asyncHandler( 
    // requestHandler
    async(req, res) => {
        /* 
        1. Extract email and password from request body
        2. Validate email and password
        3. Find the user in the database by email
        4. Check if the user exists
        6. Check if the provided password is correct
        7. Generate access and refresh tokens
        8. Retrieve user information, excluding password and refresh token
        9. Send the response with the logged-in user data and tokens
        */

        const { 
            email,
            password: password,
        } = req.body;

        console.log(`email: ${email}, password: ${password}`);

        if(!email) {
            throw new ApiError(400, "Email is required");
        }

        const user = await User.findOne({ email });

        if(!user) {
            throw new ApiError(
                404,
                "User does not exists",
            );
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        if(!isPasswordValid) {
            throw new ApiError(
                404,
                "Invalid user credentials",
            );
        }

        const {
            accessToken, 
            refreshToken,
        } = await generateAccessAndRefreshTokens( user._id );

        const loggedInUser = await User.findById( user._id ).select( "-password -refresh_token" );

        return res.status(200).json(
            new ApiResponse(
                200,
            {
            user: loggedInUser,
            accessToken,
            refreshToken,
        },
        "User logged in successfully",
        ),
    );

});

// @desc Logout a user
// @route GET /api/v1/users/logout
// @access private
const logoutUser = asyncHandler( async (req, res) => {
    /* 
    1. Find the user by their ID (which is available from the `req.user` object, populated by `verifyJWT` middleware).
    2. We update the user's `refresh_token` field to an empty string, effectively logging them out by invalidating any stored refresh token.
    3. Return a success response indicating the user has been logged out.
    */
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refresh_token: "",
            },
        },
        {
            new: true, // Return the updated user document after the modification
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully",
        ),
    );
});

// @desc Refresh access token of a user
// @route POST /api/v1/users/refresh-token
// @access private
const refreshAccessToken = asyncHandler( async (req, res) => {
    /* 
    1. Extract the refresh token from the request body
    2. Check if the incoming refresh token is provided
    3. Verify the incoming refresh token using the secret
    4. Find the user associated with the decoded refresh token
    5. Check if the user exists in the database
    6. Validate if the incoming refresh token matches the user's stored refresh token
    7. Generate new access and refresh tokens for the user
    8. Send the new access and refresh tokens in the response
    */

    const incomingRefreshToken = req.body?.refresh_token;

    if(!incomingRefreshToken) {
        throw new ApiError(
            401, 
            "Unauthorized request",
        );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );
    
        const user = await User.findById( decodedToken?._id );
    
        if(!user) {
            throw new ApiError(
                401,
                "Invalid refresh token",
            );
        }
    
        if(incomingRefreshToken !== user?.refresh_token) {
            throw new ApiError(
                401,
                "Refresh token is expired or used",
            );
        }
    
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "Access token refreshed",
            ),
        );
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "Invalid refresh token",
        );
    }
});

// @desc change password of a user
// @route POST /api/v1/users/change-password
// @access private
const changePassword = asyncHandler ( async (req, res) => {
    /* 
    1. Destructure oldPassword and newPassword from the request body
    2. Check if both oldPassword and newPassword are provided
    3. Check if the new password is different from the old password
    4. Find the user by their ID (id has been attached in request by verifyJWT middleware)
    5. Check if the provided old password is correct by method created in user model
    7. Update the user's password with the new password
    8. Save the user, disabling validation before save (e.g., skip certain validations)
    9. Send a 200 response indicating the password was changed successfully
    */
    const { 
        old_password: oldPassword, 
        new_password: newPassword,
    } = req.body;

    if(!oldPassword || !newPassword) {
        throw new ApiError(
            400,
            "Old password and new password are required",
        );
    }

    if(oldPassword === newPassword) {
        throw new ApiError(
            400,
            "New password cannot be the same as old password",
        );
    }

    const user = await User.findById( req.user?._id );
    const isPasswordCorrect = await user.isPasswordCorrect( oldPassword );

    if(!isPasswordCorrect) {
        throw new ApiError(
            400,
            "Old password is incorrect",
        );
    }

    user.password = newPassword;
    await user.save(
        {validateBeforeSave: false},
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully",
        ),
    );
} );

// @desc get current user
// @route POST /api/v1/users/get-user
// @access private
const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Password changed successfully",
        ),
    );

} );

// @desc update user account details
// @route POST /api/v1/users/update-user
// @access private
const updateAccountDetails = asyncHandler( async (req, res) => {
    /*
    1. Extract Data from the Request Body
    2. Validation Check for Required Fields
    3. Update the User in the Database
    4. Return a Successful Response
    */

    const {full_name: fullName, user_name: userName, email, profile_tag: profileTag} = req.body;

    if(!fullName || !userName || !email || !profileTag) {
        throw new ApiError(
            400,
            "All fields are required",
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                full_name: fullName,
                user_name: userName,
                email,
                profile_tag: profileTag,
            }
        },
        {
            new: true,
        },
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Account details updated successfully",
        )
    );
} );

// @desc upload user avatar
// @route POST /api/v1/users/upload-avatar
// @access private
const uploadUserAvatar = asyncHandler( async(req, res) => {
    /* 
    1. Extract Avatar File Path
    2. Validate Avatar File Presence
    3. Upload the Avatar to Cloudinary
    4. Validate Avatar Upload Success
    5. Delete Old Avatar from Cloudinary
    6. Update the User’s Avatar URL in the Database
    7. Send Success Response
    */
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new ApiError(
            400,
            "Avatar file is missing",
        );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar?.url) {
        throw new ApiError(
            400,
            "Error while uploading avatar on cloudinary",
        );
    }

    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const oldAvatarUrl = user.avatar; 

    user.avatar = avatar.url;
    await user.save();

    if (oldAvatarUrl) {
        const publicId = extractPublicIdFromUrl(oldAvatarUrl); // Extract the public ID from the old avatar URL
        if (publicId) {
            await deleteFromCloudinary(publicId); // Delete the old avatar from Cloudinary
        }
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "User avatar updated successfully",
        )
    );
} );

// @desc get user profile data
// @route POST /api/v1/users/profile/$user_name
// @access private
const getUserProfile = asyncHandler( async (req, res) => {
    /*
    1. Extract User Name from the Request Params
    2. Check if the username is provided and not empty
    3. Perform the aggregation on the User collection
        - Step 1: Match the user document based on the username
        - Step 2: Lookup followers of the user
        - Step 3: Lookup followings of the user 
        - Step 4: Add new fields to the output
        - Step 5: Project the final output fields
    4. Check if the profile was found
    5. Send the response with the fetched profile data
    */

    const {user_name: userName} = req.params;

    if(!userName?.trim()) {
        throw new ApiError(
            400,
            "Username is missing",
        );
    }

    const profile = await User.aggregate([
        {
            $match: {
                user_name: userName?.trim().toLowerCase(),
            },
        },
        {
            $lookup: {                          // THIS WILL GIVE ME THE DATA OF MY FOLLOWERS
                from: "relationships",                // The collection we are looking up
                localField: "_id",              // Field from the User collection
                foreignField: "following",      // Field from the follows collection that matches localField
                as: "profile_followers",        // The name of the new array field to add to the output
            },
        },
        {
            $lookup: {                          // THIS WILL GIVE ME DATA OF PEOPLE I FOLLOW
                from: "relationships",                
                localField: "_id",
                foreignField: "follower",
                as: "profile_follows_to",
            },
        },
        {
            $lookup: {
                from: "reels",
                localField: "_id",
                foreignField: "owner",
                as: "posts",
            },
        },
        {
            $lookup: {
                from: "reels",
                localField: "_id",
                foreignField: "owner",
                as: "posts",
            },
        },
        {
            $lookup: {
                from: "likes", // Specifies the collection to join (in this case, "likes").
                let: { postIds: "$posts._id" }, 
                /*
                * Defines variables to pass into the `pipeline` for processing.
                * `postIds` is set to the `_id` field of each post in the `posts` array.
                */
                pipeline: [
                    {
                        $match: {
                            $expr: {                                        // `$expr` allows usage of aggregation expressions for conditional logic.
                                $and: [ // $and` ensures that both conditions must be satisfied for a document in the "likes" collection to match.       
                                    { $in: ["$reel_id", "$$postIds"] }, 
                                    /*
                                    * `$in` checks if the `reel_id` field in the "likes" collection matches 
                                    * any of the IDs in the `postIds` array (passed as a variable).
                                    * `$reel_id` should correspond to a valid post ID.
                                    */
                                    { $ne: ["$reel_id", null] },
                                    /*
                                    * Ensures `reel_id` is not `null` to exclude invalid or incomplete documents
                                    * in the "likes" collection.
                                    */
                                ],
                            },
                        },
                    },
                ],
                as: "post_likes",
            },
        },        
        {
            $addFields: {
                profile_followers_count: {
                    $size: "$profile_followers",                // Size of the followers array
                },
                profile_follows_to_count: {
                    $size: "$profile_follows_to",               // Size of the follows array
                },
                is_following: {                                 // Check if the current user is following the profile
                    $cond: {
                        if: { $in: [req.user?._id, "$profile_followers.follower"] },       // Check if the current user's ID is in the followers' list
                        then: true,
                        else: false,
                    },
                },
                posts_count: {
                    $size: "$posts",              
                },
            },
        },
        {
            $project: {
                full_name: 1,
                user_name: 1,
                email: 1,
                profile_tag: 1,
                avatar: 1,
                profile_followers_count: "$profile_followers_count", 
                profile_follows_to_count: "$profile_follows_to_count", 
                is_following: "$is_following", 
                posts_count: "$posts_count",
                posts_likes_count: { $size: "$post_likes" },
            },
        },
    ]);

    console.log(`Output after agreggation for profile: ${profile}}`);

    if(!profile?.length) {
        throw new ApiError(
            400,
            "Profile doesnot exist",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            profile[0],
            "User profile fetched successfully",
    ));

} );

// @desc check username exists already or not
// @route GET /api/v1/users/exists/u/$user_name
// @access private
const checkUsernameExists = asyncHandler( async (req, res) => {
    /*
    1. Extract username from request parameters
    2. Validate that the username is provided and not empty
    3. Query the database to check if the username exists
    4. Return the result in the response
    */

    const {user_name: userName} = req.params;

    if(!userName?.trim()) {
        throw new ApiError(
            400,
            "Username is empty",
        );
    }

    const user = await User.findOne({
        user_name: userName?.trim().toLowerCase(),
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                exists: user ? true : false,
            },
            user ? "Username exists" : "Username doesn't exists",
        )
    );
})

// @desc get searched users
// @route POST /api/v1/users/get-searched-users/:user_name_query
// @access private
const getSearchedUsers = asyncHandler( async (req, res) => {
    const {user_name_query: userNameQuery} = req.params;

    if(!userNameQuery?.trim()) {
        throw new ApiError(
            400,
            [],
            "Empty search query",
        );
    }

    const users = await User.aggregate([
        {
            // Match users whose usernames start with the search query (case-insensitive).
            $match: {
                user_name: {
                    $regex: `^${userNameQuery.trim()}`,
                    $options: "i" // Case-insensitive matching
                }
            }
        },
        {
            // Project only the necessary fields for the response.
            $project: {
                _id: 1,
                user_name: 1,
                avatar: 1,
            }
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            users,
            "Searched users fetched successfully",
    ));

} );

export { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    uploadUserAvatar,
    getUserProfile,
    checkUsernameExists,
    getSearchedUsers,
}