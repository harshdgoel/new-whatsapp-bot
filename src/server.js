const express = require("express");
const bodyParser = require("body-parser");
const cluster = require("cluster");
const os = require("os");
const botRoutes = require("./routes/botRoutes");
const errorHandler = require("./middlewares/errorHandler");

const numCPUs = Math.min(os.cpus().length, 2); // Limit workers to 2 (based on 512MB memory limit)

// Check if the process is the master
if (cluster.isMaster) {
    console.log(`Master process is running. Spawning ${numCPUs} workers...`);

    // Fork worker processes
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died, forking a new one...`);
        cluster.fork(); // Restart worker on failure
    });
} else {
    // Worker process runs the Express app
    const app = express();

    // Middleware to parse incoming JSON data
    app.use(bodyParser.json());

    // API routes for the chatbot
    app.use("/api", botRoutes);

    // Verify webhook with the token from environment variables
    app.get("/api/webhook", (req, res) => {
        const mode = req.query["hub.mode"];
        const challenge = req.query["hub.challenge"];
        const token = req.query["hub.verify_token"];

        console.log("verify token is:", VERIFY_TOKEN);
        // Fetch VERIFY_TOKEN from environment variables
        const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

        if (mode && token === VERIFY_TOKEN) {
            console.log("Webhook verified successfully!");
            res.status(200).send(challenge); // Respond with the challenge
        } else {
            console.error("Webhook verification failed. Invalid token.");
            res.sendStatus(403); // Forbidden if tokens do not match
        }
    });

    // Error handling middleware
    app.use(errorHandler);

    // Use PORT from environment variables or default to 3000
    const PORT = process.env.PORT || 3000;

    // Start the server
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} is listening on port ${PORT}`);
    });
}
