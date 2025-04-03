import { Router } from "express";
import { 
    verifyJWT 
} from "../middlewares/index.js";
import { 
    toggleLikeReel,
    toggleLikeComment,
} from "../controllers/index.js";

// Initialize the router instance
const likeRouter = Router();

// Define the /toggle/:reel_id route for POST requests
// This will call the toggleLikeReel controller whenever a POST request is made to /api/v1/reels/toggle/:reel_id
likeRouter.route("/toggle/:reel_id").post(
    verifyJWT,
    toggleLikeReel,
);

// Define the /toggle/c/:comment_id route for POST requests
// This will call the toggleLikeComment controller whenever a POST request is made to /api/v1/reels/toggle/c/:comment_id
likeRouter.route("/toggle/c/:comment_id").post(
    verifyJWT,
    toggleLikeComment,
);

export default likeRouter;