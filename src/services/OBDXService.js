"use strict";

const axios = require('axios');
const LoginService = require('./loginService');
const baseURL = "http://localhost:8000/digx/v1/";

module.exports = class OBDXService {
    async invokeService(ctxPath, method, headers, queryParam, body, userId) {
       console.log("entering invoke service method");
        await LoginService.checkLogin(baseURL); 

        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Cookie", cookie);
        console.log("token:",token);
        console.log("cookie:",cookie);

        return this.serviceMeth(ctxPath, method, headers, queryParam, body);
    }

    async serviceMeth(ctxPath, method, hdr, queryParam, body) {
        hdr.set("Content-Type", "application/json");

        const url = baseURL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        const headersObj = Object.fromEntries(hdr);
        console.log("header object",headersObj)

        try {
            const response = await axios({
                url,
                method,
                headers: headersObj,
                data: body
            });
            console.log("response is:",response);
            return response;
        } catch (error) {
            console.error("Service request failed:", error);
            throw error;
        }
    }
};
