const line = require('@line/bot-sdk');
const express = require('express');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');  // 引入 OpenAI 客戶端
const app = express();
const port = process.env.PORT || 3000;

dotenv.config();

// 環境變數檢查
if (!process.env.LINE_ACCESS_TOKEN || 
    !process.env.LINE_CHANNEL_SECRET || 
    !process.env.OPENAI_API_KEY) {
  console.error('缺少必要的環境變數');
  process.exit(1);
}

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
    try {
      if (event.type === 'message' && event.message.type === 'text') {
        // 限制輸入長度，防止過長訊息
        const userMessage = event.message.text.slice(0, 500);

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: userMessage }],
        });
  
        const replyMessage = response.choices[0].message.content;
  
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyMessage,
        });
      }
    } catch (error) {
      console.error('處理事件時發生錯誤:', error);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '抱歉，處理訊息時發生錯誤。',
      });
    }
}

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
