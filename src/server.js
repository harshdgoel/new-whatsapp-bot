const express = require("express");
const bodyParser = require("body-parser");
const cluster = require("cluster");
const os = require("os");
const botRoutes = require("./routes/botRoutes");
const config = require("./config/config"); // Import config.js
const errorHandler = require("./middlewares/errorHandler");

const numCPUs = Math.min(os.cpus().length, 2); // Limit the number of workers to 2 (based on 512MB memory limit)

if (cluster.isMaster) {
    console.log(`Master process is running. Spawning ${numCPUs} workers...`);

    // Fork the worker processes
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork(); // Spawn a worker for each CPU core
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died, forking a new one...`);
        cluster.fork(); // If a worker dies, fork a new one to maintain the number of workers
    });
} else {
    // Worker process will run the Express app
    const app = express();

    // Middleware to parse incoming JSON data
    app.use(bodyParser.json());

    // API route for the chatbot
    app.use("/api", botRoutes);

    // Verify webhook with the token from config.js
    app.get('/api/webhook', (req, res) => {
        const mode = req.query['hub.mode'];
        const challenge = req.query['hub.challenge'];
        const token = req.query['hub.verify_token'];

        // Use the VERIFY_TOKEN from config.js
        const VERIFY_TOKEN = config.verifyToken;

        if (mode && token === VERIFY_TOKEN) {
            console.log('Webhook verified');
            res.status(200).send(challenge); // Respond with the challenge if verification is successful
        } else {
            res.sendStatus(403); // If the token doesn't match, send Forbidden status
        }
    });

    // Error handling middleware
    app.use(errorHandler);

    // Use the assigned PORT environment variable or default to 3000
    const PORT = process.env.PORT || 3000;

    // Start the server
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} is listening on port ${PORT}`);
    });
}
