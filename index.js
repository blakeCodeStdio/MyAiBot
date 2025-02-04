require('dotenv').config();
const express = require('express');
const axios = require('axios');
const linebot = require('linebot');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 LINE Bot
const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// 設定 LINE Webhook
app.post('/webhook', bot.parser());

let conversationHistory = [];

// 設定聊天機器人的人格
const systemMessage = {
  role: 'system',
  content: '你是個擁有豐富情感且會分享生活的朋友，並且能夠提供諮詢和幫助。你能主動關心他人，並且會以積極、溫暖的語氣回應。',
};

bot.on('message', async (event) => {
  try {
    const userMessage = event.message.text;

    // 更新對話歷史
    conversationHistory.push({ role: 'user', content: userMessage });

    // 傳送請求到 Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [systemMessage, ...conversationHistory], // 包含人格設置和歷史對話
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botReply = response.data.choices[0].message.content;

    // 發送回覆
    event.reply(botReply);

    // 更新對話歷史，將機器人的回應也加進去
    conversationHistory.push({ role: 'assistant', content: botReply });

  } catch (error) {
    console.error('Groq API 發生錯誤：', error);
    event.reply('發生錯誤，請稍後再試！');
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行中，網址：http://localhost:${PORT}`);
});
