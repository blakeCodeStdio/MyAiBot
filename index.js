const line = require('@line/bot-sdk');
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { HfInference } = require('@huggingface/inference');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// 環境變數檢查
if (!process.env.LINE_ACCESS_TOKEN || 
    !process.env.LINE_CHANNEL_SECRET || 
    !process.env.HF_TOKEN) {
  console.error('缺少必要的環境變數');
  process.exit(1);
}

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(config);

// Hugging Face 設定
const hf = new HfInference(process.env.HF_TOKEN);

// Webhook 端點
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const promises = req.body.events.map(handleEvent);
    const result = await Promise.all(promises);
    res.json(result);
  } catch (error) {
    console.error('Webhook 發生錯誤:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 處理訊息事件
async function handleEvent(event) {
  try {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.slice(0, 500);

      const response = await hf.conversational({
        model: 'facebook/blenderbot-400M-distill',
        inputs: {
          past_user_inputs: [],
          generated_responses: [],
          text: userMessage
        }
      });

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: response.generated_text || '無法產生回覆',
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
