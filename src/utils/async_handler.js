// Define a higher-order function (HOF) called asyncHandler
const asyncHandler = (requestHandler, finallyHandler) => {
    // Return a new function that takes req, res, and next as arguments
    return (req, res, next) => {
        // Wrap the requestHandler function in a Promise using Promise.resolve()
        // This allows us to handle asynchronous errors using .catch()
        Promise.resolve(
            // Call the requestHandler function with req, res, and next as arguments
            requestHandler(req, res, next),
        )// Catch any errors that occur during the execution of requestHandler
        .catch((err) => {
            // If an error occurs, pass it to the next error-handling middleware using next(err)
            next(err);
        }).finally(() => {
            // If a finallyHandler is provided, call it after the requestHandler has finished
            if (typeof finallyHandler === 'function') {
                finallyHandler(req, res, next);
            }
        });;
    }
}

export { asyncHandler }

// The purpose of this code is to create a reusable middleware function that can handle asynchronous errors in a centralized way. 
// By wrapping the requestHandler function in a Promise, we can ensure that any errors that occur during its execution are properly caught and handled.