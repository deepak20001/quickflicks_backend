import { Router } from "express";
import { 
    verifyJWT 
} from "../middlewares/index.js";
import { 
    searchTopLikedReels,
    searchTopFollowedCreators,
} from "../controllers/index.js";

// Initialize the router instance
const searchRouter = Router();

// Define the /post-reel route for GET requests
// This will call the searchTopLikedReels controller whenever a POST request is made to /api/v1/search/top-liked-reels/u/:user_name
searchRouter.route("/top-liked-reels/u/:user_name?").get(
    verifyJWT,
    searchTopLikedReels,
);

// Define the /post-reel route for GET requests
// This will call the searchTopFollowedCreators controller whenever a POST request is made to /api/v1/search/top-followed-creators/u/:user_name
searchRouter.route("/top-followed-creators/u/:user_name?").get(
    verifyJWT,
    searchTopFollowedCreators,
);

export default searchRouter;