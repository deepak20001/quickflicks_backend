import { Router } from "express";
import { 
    upload, 
    verifyJWT 
} from "../middlewares/index.js";
import { 
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
} from "../controllers/index.js";

// Initialize the router instance
const userRouter = Router();

// Define the /register route for POST requests
// This will call the registerUser controller whenever a POST request is made to /api/v1/users/register
userRouter.route("/register").post(
    upload.single("avatar"),
    registerUser,
);

// Define the /login route for POST requests
// This will call the loginUser controller whenever a POST request is made to /api/v1/users/login
userRouter.route("/login").post(
    loginUser,
);

// Define the /logout route for GET requests
// This will call the logoutUser controller whenever a GET request is made to /api/v1/users/logout
userRouter.route("/logout").get(
    verifyJWT,
    logoutUser,
);

// Define the /refresh-token route for POST requests
// This will call the refreshAccessToken controller whenever a POST request is made to /api/v1/users/refresh-token
userRouter.route("/refresh-token").post(
    refreshAccessToken,
);

// Define the /change-password route for POST requests
// This will call the changePassword controller whenever a POST request is made to /api/v1/users/change-password
userRouter.route("/change-password").post(
    verifyJWT,
    changePassword,
);

// Define the /current-user route for GET requests
// This will call the getCurrentUser controller whenever a GET request is made to /api/v1/users/current-user
userRouter.route("/current-user").get(
    verifyJWT,
    getCurrentUser,
);

// Define the /update-user route for POST requests
// This will call the updateAccountDetails controller whenever a POST request is made to /api/v1/users/update-user
userRouter.route("/update-user").post(
    verifyJWT,
    updateAccountDetails,
);

// Define the /upload-avatar route for POST requests
// This will call the uploadUserAvatar controller whenever a POST request is made to /api/v1/users/upload-avatar
userRouter.route("/upload-avatar").post(
    upload.single("avatar"),
    verifyJWT,
    uploadUserAvatar,
);

// Define the /profile route for GET requests
// This will call the getUserProfile controller whenever a GET request is made to /api/v1/users/profile
userRouter.route("/profile/:user_name").get(
    verifyJWT,
    getUserProfile,
);

// Define the /profile route for GET requests
// This will call the getUserProfile controller whenever a GET request is made to /api/v1/users/exists/u/:user_name
userRouter.route("/exists/u/:user_name").get(
    verifyJWT,
    checkUsernameExists,
);

// Define the /get-searched-users route for GET requests
// This will call the getUserProfile controller whenever a GET request is made to /api/v1/users/get-searched-users/:user_name_query
userRouter.route("/get-searched-users/:user_name_query").get(
    verifyJWT,
    getSearchedUsers,
);

export default userRouter;