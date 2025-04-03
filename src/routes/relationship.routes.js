import { Router } from "express";
import { 
    upload, 
    verifyJWT 
} from "../middlewares/index.js";
import { 
    toggleFollowUser,
    getFollowers,
    getFollowings,
} from "../controllers/index.js";

// Initialize the router instance
const relationshipRouter = Router();

// Define the /post-relationships route for POST requests
// This will call the uploadReel controller whenever a POST request is made to /api/v1/relationships/toggle/u/:user_id
relationshipRouter.route("/toggle/u/:user_id").post(
    verifyJWT,
    toggleFollowUser,
);

// Define the /get-relationships route for GET requests
// This will call the getFollowers controller whenever a GET request is made to /api/v1/relationships/followers/u/:user_id
relationshipRouter.route("/followers/u/:user_id").get(
    verifyJWT,
    getFollowers,
);

// Define the /get-relationships route for GET requests
// This will call the getFollowings controller whenever a GET request is made to /api/v1/relationships/followings/u/:user_id
relationshipRouter.route("/followings/u/:user_id").get(
    verifyJWT,
    getFollowings,
);

export default relationshipRouter;