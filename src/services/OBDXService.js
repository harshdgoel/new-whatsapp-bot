"use strict";

const axios = require('axios');
const baseURL = "https://rnamb-148-87-23-5.a.free.pinggy.link";

class OBDXService {
    // Accept LoginService as a parameter
    async invokeService(ctxPath, method, headers, queryParam, body, userId, loginService) {
        console.log("Entering invoke service method");

        // Use loginService parameter here to check login
        await loginService.checkLogin(baseURL); 

        const token = loginService.getToken();
        const cookie = loginService.getCookie();
        if(token!=null && cookie!=null){
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Cookie", cookie);
        console.log("token:", token);
        console.log("cookie:", cookie);
        }

        return this.serviceMeth(ctxPath, method, headers, queryParam, body);
    }

    async serviceMeth(ctxPath, method, hdr, queryParam, body) {
        hdr.set("Content-Type", "application/json");

        const url = baseURL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        const headersObj = Object.fromEntries(hdr);
        console.log("header object", headersObj);
        console.log("url:", url);

        try {
            const response = await axios({
                url,
                method,
                headers: headersObj,
                data: body
            });
            console.log("response is:", response);
            return response;
        } catch (error) {
            console.error("Service request failed:", error);
            throw error;
        }
    }
};

module.exports = new OBDXService();
