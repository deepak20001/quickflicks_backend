import { Router } from "express";
import { 
    upload, 
    verifyJWT 
} from "../middlewares/index.js";
import { 
    postReel,
    getReels,
    toggleSavedReel,
    getSavedReels,
    getAllReels,
    getFollowingReels,
    getMostLikedReels,
} from "../controllers/index.js";

// Initialize the router instance
const reelRouter = Router();

// Define the /post-reel route for POST requests
// This will call the uploadReel controller whenever a POST request is made to /api/v1/reels/post-reel
reelRouter.route("/post-reel").post(
    upload.single("reel"),
    verifyJWT,
    postReel,
);

// Define the /get-reels/:user_id route for GET requests
// This will call the getReels controller whenever a POST request is made to /api/v1/reels/get-reels/u/:user_id
reelRouter.route("/get-reels/u/:user_id").get(
    verifyJWT,
    getReels,
);

// Define the /toggle-saved/r/:reel_id route for GET requests
// This will call the toggleSavedReel controller whenever a POST request is made to /api/v1/reels/toggle-saved/:reel_id
reelRouter.route("/toggle-saved/r/:reel_id").post(
    verifyJWT,
    toggleSavedReel,
);

// Define the /toggle-saved/r/:reel_id route for GET requests
// This will call the getSavedReels controller whenever a POST request is made to /api/v1/reels/get-saved-reels/u/:user_id
reelRouter.route("/get-saved-reels/u/:user_id").get(
    verifyJWT,
    getSavedReels,
);

// Define the /get-reels route for GET requests
// This will call the getAllReels controller whenever a POST request is made to /api/v1/reels/get-reels
reelRouter.route("/get-reels").get(
    verifyJWT,
    getAllReels,
);

// Define the /get-following-reels route for GET requests
// This will call the getFollowingReels controller whenever a POST request is made to /api/v1/reels/get-following-reels 
reelRouter.route("/get-following-reels").get(
    verifyJWT,
    getFollowingReels,
);

// Define the /get-most-liked-reels route for GET requests
// This will call the getMostLikedReels controller whenever a POST request is made to /api/v1/reels/get-most-liked-reels
reelRouter.route("/get-most-liked-reels").get(
    verifyJWT,
    getMostLikedReels,
);


export default reelRouter;