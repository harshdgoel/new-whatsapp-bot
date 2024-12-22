const { CohereClient } = require("cohere-ai");

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

class CohereService {
  static async getInsights(balance) {
    console.log("entering getInsights");
    try {
      const prompt = `
      my bank balance is ${balance.currency} ${balance.amount}.
      Provide financial advice on how to manage my money effectively in less than 100 words.`;
      
      const stream = await cohere.chatStream({
        model: "command",
        message: prompt,
        temperature: 0.3,
        chatHistory: [],
        promptTruncation: "AUTO",
        connectors: [{ id: "web-search" }],
      });

      let advice = "";
      for await (const chat of stream) {
        if (chat.eventType === "text-generation") {
          advice += chat.text;
        }
      }
      return advice.trim();
    } catch (error) {
      console.error("Error fetching insights from Cohere:", error.message);
      return "Unable to fetch financial advice at this moment.";
    }
  }
}

module.exports = CohereService;
