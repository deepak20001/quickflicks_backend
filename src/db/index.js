import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection error", error);
        process.exit(1);
        /*  
            When process.exit(1) is called:
            - The Node.js event loop is stopped.
            - Any pending I/O operations are cancelled.
            - The process is terminated. 
        */
    }
}

export default connectDB;