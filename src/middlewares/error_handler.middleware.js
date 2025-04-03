import { ApiError } from "../utils/api_errors.js";

// Error-handling middleware
const errorHandler = (err, _, res, next) => {
    // Log the stack trace to console for debugging purposes
    console.error(err.stack);  

    // If the error is an instance of ApiError, send the formatted response
    /* 
    The instanceof operator in JavaScript is used to check the type of an object at run time. 
    It returns a boolean value if true then it indicates that the object is an instance of a particular class and 
    if false then it is not.  
    */
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors,
        });
    }

    // For unexpected errors, send a generic 500 response
    return res.status(500).json({
        success: false,
        statusCode: err.statusCode,
        message: "An unexpected error occurred",
    });
};

export { errorHandler };
