// Custom response class to standardize API responses
class ApiResponse {
    // Constructor to initialize the ApiResponse object with specific properties
    constructor(
        statusCode, 
        data,
        message = "Success",
    ) {
        this.statusCode = statusCode;
        // Automatically determine success based on statusCode (< 400 indicates success)
        this.success = statusCode < 400;  // If the status code is below 400, it's considered a successful response
        this.data = data;
        this.message = message;
    }
}

export { ApiResponse }