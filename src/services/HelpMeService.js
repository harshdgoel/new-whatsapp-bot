const TemplateLayer = require('./TemplateLayer');
const MessageService = require('../services/MessageService');
const config = require("../config/config"); // Import config.js
const channel = config.channel;
const { sendResponseToWhatsApp } = require('./apiHandler');


class HelpMeService {
    static async helpMe() {
             return MessageService.getMessage('Help.helpOptions');
  
    }
}

module.exports = HelpMeService;
