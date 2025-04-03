import { Router } from "express";
import { 
    verifyJWT 
} from "../middlewares/index.js";
import { 
    getReelComments,
    postReelComment,
    postReplyComment,
    getReplyComments,
    editReelComment,
    deleteReelComment,
} from "../controllers/index.js";

// Initialize the router instance
const commentRouter = Router();

// Define the /:reel_id route for GET requests
// This will call the getReelComments controller whenever a GET request is made to /api/v1/comments/:reel_id
commentRouter.route("/:reel_id").get(
    verifyJWT,
    getReelComments,
);

// Define the /r/:parent_comment_id route for POST requests
// This will call the getReplyComments controller whenever a GET request is made to /api/v1/comments/r/:parent_comment_id
commentRouter.route("/r/:parent_comment_id").get(
    verifyJWT,
    getReplyComments,
);

// Define the /c/:reel_id route for POST requests
// This will call the postReelComment controller whenever a POST request is made to /api/v1/comments/c/:reel_id
commentRouter.route("/c/:reel_id").post(
    verifyJWT,
    postReelComment,
);

// Define the /r/:reel_id route for POST requests
// This will call the postReplyComment controller whenever a POST request is made to /api/v1/comments/r/:reel_id
commentRouter.route("/r/:reel_id").post(
    verifyJWT,
    postReplyComment,
);

// Define the /c/:comment_id route for PATCH requests
// This will call the editReelComment controller whenever a PATCH request is made to /api/v1/comments/c/:comment_id
commentRouter.route("/c/:comment_id").patch(
    verifyJWT,
    editReelComment,
);

// Define the /c/:comment_id route for DELETE requests
// This will call the deleteReelComment controller whenever a DELETE request is made to /api/v1/comments/c/:comment_id
commentRouter.route("/c/:comment_id").delete(
    verifyJWT,
    deleteReelComment,
);


export default commentRouter;