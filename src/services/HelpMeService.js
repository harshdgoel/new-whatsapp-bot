const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const endpoints = require("../config/endpoints");
const config = require("../config/config"); // Import config.js
const channel = config.channel;
const { sendResponseToWhatsApp } = require('./apiHandler');


class HelpMeService {
    static async helpMe() {
             return MessageService.getMessage('Help.helpOptions');
  
    }
}

module.exports = HelpMeService;
