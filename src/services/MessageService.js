const messages = require('../config/messages.json');

class MessageService {
  static getMessage(key, ...placeholders) {
    const keys = key.split('.');
    let message = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), messages);

    if (!message) {
      return `Message for key '${key}' not found.`;
    }

    if (typeof message !== 'string') {
      return `Message for key '${key}' is not a valid string.`;
    }

    // Replace placeholders (e.g., "%s")
    placeholders.forEach((placeholder, index) => {
      message = message.replace(new RegExp(`%s`, 'g'), placeholder);
    });

    return message;
  }
}

module.exports = MessageService;
