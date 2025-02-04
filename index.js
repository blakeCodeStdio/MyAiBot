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

bot.on('message', async (event) => {
  try {
    const userMessage = event.message.text;

    // 發送請求到 Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botReply = response.data.choices[0].message.content;
    event.reply(botReply);
  } catch (error) {
    console.error('Groq API 發生錯誤：', error);
    event.reply('發生錯誤，請稍後再試！');
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行中，網址：http://localhost:${PORT}`);
});
