"use strict";

const request = require('request');
const jwt = require('jsonwebtoken');

class LoginService {
    constructor() {
        this.authCache = {
            token: null,
            cookie: null
        };
    }

    setAuthDetails(token, cookie) {
        this.authCache.token = token;
        this.authCache.cookie = cookie;
        global.sessionMap.set('authDetails', { token, cookie });
    }

    getToken() {
        return this.authCache.token;
    }

    getCookie() {
        return this.authCache.cookie;
    }

    isTokenExpired() {
        const token = this.authCache.token;
        if (!token) return true;

        try {
            const decoded = jwt.decode(token);
            const expiryTime = decoded.exp * 1000; // Convert to milliseconds
            return Date.now() > expiryTime;
        } catch (error) {
            console.error("Failed to decode token:", error.message);
            return true;
        }
    }

    async checkLogin(baseURL) {
        if (this.isTokenExpired()) {
            console.log("Token expired or missing. Logging in again...");
            return await this.login(baseURL);
        }
        return true;
    }

    login(baseURL) {
        const ctxPath = "session";
        return new Promise((resolve, reject) => {
            request({
                url: baseURL + ctxPath,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            }, (error, response, body) => {
                if (error || !response) {
                    console.error("Login failed:", error);
                    reject(error);
                } else {
                    const cookie = response.headers['set-cookie'];
                    const token = response.headers['jwt-token'];
                    this.setAuthDetails(token, cookie);
                    resolve(response);
                }
            });
        });
    }
}

module.exports = new LoginService();
