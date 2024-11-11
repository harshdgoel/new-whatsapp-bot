"use strict";

const request = require('request');
const LoginService = require('./loginService');
const baseURL = "http://localhost:8000/digx/v1/";

module.exports = class OBDXService {
    async invokeService(ctxPath, method, headers, queryParam, body, userId) {
        await LoginService.checkLogin(baseURL); 

        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Cookie", cookie);

        return this.serviceMeth(ctxPath, method, headers, queryParam, body);
    }

    serviceMeth(ctxPath, method, hdr, queryParam, body) {
        return new Promise((resolve, reject) => {
            hdr.set("Content-Type", "application/json");
            ctxPath = ctxPath + "?";
            for (let [key, value] of queryParam) {
                ctxPath = ctxPath + key + "=" + encodeURIComponent(value) + "&";
            }

            const headersObj = {};
            for (const key of hdr.keys()) {
                headersObj[key] = hdr.get(key);
            }

            request({
                url: baseURL + ctxPath,
                method: method,
                headers: headersObj,
                body: JSON.stringify(body)
            }, (error, response, body) => {
                if (error) {
                    console.error("Service request failed:", error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }
};
