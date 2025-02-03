const line = require('@line/bot-sdk');
const express = require('express');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');  // 引入 OpenAI 客戶端
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(config);

// OpenAI 設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // 從環境變數中獲取 API 金鑰
});

// Webhook 端點，接收訊息
app.post('/webhook', line.middleware(config), async (req, res) => {
  const promises = req.body.events.map(handleEvent);
  const result = await Promise.all(promises);
  res.json(result);
});

// 處理訊息事件
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    // 將用戶訊息發送給 OpenAI 生成回應
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // 選擇你希望使用的模型
      messages: [{ role: 'user', content: event.message.text }],
    });

    const replyMessage = response.choices[0].message.content;

    // 回應用戶訊息
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMessage,
    });
  }
}

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
