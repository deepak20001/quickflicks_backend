import multer from "multer";

// Configure storage settings for uploaded files
const storage = multer.diskStorage({
    
    // Specify the destination folder for storing uploaded files
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    // Specify the filename to use when storing the uploaded file
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalFileName = file.originalname.replace(/\s+/g, '_'); // Replace spaces with underscores
        cb(null, `${uniqueSuffix}-${originalFileName}`); // e.g., 1632945876400-123456789.jpg
    } 
});

export const upload  = multer( {storage} );