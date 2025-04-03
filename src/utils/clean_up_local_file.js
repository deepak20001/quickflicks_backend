import fs from "fs";

// Function to clean up local files after all operations
const cleanUpLocalFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("File successfully deleted:", filePath);
        }
    } catch (error) {
        console.error("Error deleting file:", error);
    }
};

export { 
    cleanUpLocalFile,
}