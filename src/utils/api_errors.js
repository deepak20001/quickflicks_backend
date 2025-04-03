// Custom error class that extends the built-in Error class
class ApiError extends Error {
    // Constructor to initialize the ApiError object with specific properties
    constructor(
        statusCode, 
        message = "Something went wrong", 
        errors = [],
        stack = "",
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if(stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    } 
}

export { ApiError }