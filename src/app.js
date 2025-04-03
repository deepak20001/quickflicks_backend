// External dependencies
import express from 'express';
import cors from 'cors';

// Create a new Express.js application instance
const app = express();

// Enable CORS (Cross-Origin Resource Sharing) for the application
app.use(
    cors({
    origin: process.env.CORS_ORIGIN,  // Allow requests from the specified origin (set in environment variable CORS_ORIGIN)
    credentials: true, // Allow credentials (e.g. cookies) to be sent in requests
    })
);

// Enable JSON parsing for incoming requests
app.use(
    express.json({limit: "16kb"}),
);

// Enable URL-encoded parsing for incoming requests
app.use(
    express.urlencoded({extended: true, limit: "16kb"}),
);

// Serve static files from the "public" directory
app.use(
    express.static("public"),
);

/// ROUTES IMPORTS ::::::::::::::::::::::::::::::::::::::::::::::::::
import {
    userRouter,
    reelRouter,
    likeRouter,
    commentRouter,
    relationshipRouter,
    searchRouter,
} from "./routes/index.js";
import { errorHandler } from './middlewares/index.js';

/// routes declaration

// This declares the route for user-related endpoints. Any request to /api/v1/users will be handled by the userRouter.
app.use("/api/v1/users", userRouter);
// This declares the route for reel-related endpoints. Any request to /api/v1/reels will be handled by the reelRouter.
app.use("/api/v1/reels", reelRouter);
// This declares the route for likes-related endpoints. Any request to /api/v1/likes will be handled by the likeRouter.
app.use("/api/v1/likes", likeRouter);
// This declares the route for comments-related endpoints. Any request to /api/v1/comments will be handled by the likeRouter.
app.use("/api/v1/comments", commentRouter);
// This declares the route for relationships-related endpoints. Any request to /api/v1/relationships will be handled by the relationshipRouter.
app.use("/api/v1/relationships", relationshipRouter);
// This declares the route for search-related endpoints. Any request to /api/v1/search will be handled by the searchRouter.
app.use("/api/v1/search", searchRouter);

// Error-handling middleware
app.use( errorHandler );

export { app };