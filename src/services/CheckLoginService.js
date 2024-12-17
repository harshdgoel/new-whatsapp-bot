const OBDXService = require("./OBDXService"); // Import OBDXService
const jwt = require("jsonwebtoken"); // Import a JWT library (install it with `npm install jsonwebtoken` if needed)

class CheckLoginService {
    constructor() {
        this.obdxService = new OBDXService();
    }

    // Method to check if the token is valid (not expired)
    async checkLogin(from) {
        const token = this.obdxService.authCache.getToken(); // Get token from cache
        const cookie = this.obdxService.authCache.getCookie();

        if (!token || !cookie) {
            return {
                status: "failure",
                message: "Your session has expired or no session found. Please enter your OTP to login again."
            };
        }

        // Check if the token is expired using the `exp` field from the JWT payload
        const isTokenExpired = this.isTokenExpired(token);
        if (isTokenExpired) {
            this.obdxService.clearAuthDetails(); // Clear the expired token and cookie
            return {
                status: "failure",
                message: "Your session has expired. Please enter your OTP to login again."
            };
        }

        return {
            status: "success",
            message: "Login successful. You can now proceed with your request."
        };
    }

    // Check if token is expired by decoding the JWT and examining the `exp` claim
    isTokenExpired(token) {
        try {
            const decodedToken = jwt.decode(token); // Decode JWT without verification
            const expiryTime = decodedToken.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            return currentTime > expiryTime; // Check if current time is past expiry
        } catch (error) {
            console.error("Failed to decode token:", error.message);
            return true; // Consider expired if decode fails
        }
    }
}

module.exports = new CheckLoginService();
