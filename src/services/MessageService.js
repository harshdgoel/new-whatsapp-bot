const messages = require('../config/messages.json'); // Import messages.json

class MessageService {
  /**
   * Retrieve a message by key and replace placeholders if needed.
   * @param {string} key - The key of the message.
   * @param {...any} placeholders - Placeholder values to replace in the message.
   * @returns {string} - The retrieved message.
   */
  static getMessage(key, ...placeholders) {
    let message = messages[key];

    if (!message) {
      return `Message for key '${key}' not found.`; // Fallback for missing keys
    }

    // Replace placeholders (e.g., "{0}", "{1}")
    placeholders.forEach((placeholder, index) => {
      message = message.replace(new RegExp(`\\{${index}\\}`, 'g'), placeholder);
    });

    return message;
  }
}

module.exports = MessageService;
