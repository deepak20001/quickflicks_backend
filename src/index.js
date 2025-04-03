// External dependencies
import dotenv from 'dotenv';

// Internal modules
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: '../.env',
});

// Establish DB connection and handle promise response
// Async methods return Promises, enabling .then() and .catch() handling
connectDB().
then(() => {
    // DB connection successful, set up server to listen
    
    app.on("error", (error) => {
        console.error("Error while listening to app:", error);
        throw error;
    });

    const port = process.env.PORT || 8000;
    app.listen(port , () => {
        console.log(`Server is running at PORT: ${port}`);
    }) 
}).catch((err) => {
    console.log("MONGODB connection failed !!! ", err);
});

