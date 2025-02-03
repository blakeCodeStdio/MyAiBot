require('dotenv').config()

const express = require('express')
const line = require('@line/bot-sdk')
const { OpenAI } = require('openai')

const openai = new OpenAI({
  // openAI得到的secret
  apiKey: process.env.OPEN_AI_LINE_SECRET 
})

// create LINE SDK config from env variables
const config = {
  // Line Access Token
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  // Line channel secret
  channelSecret: process.env.LINE_CHANNEL_SECRET,
}

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

// create Express app
const app = express()

// register a webhook handler with middleware
// about the middleware, please refer to doc
// Line的callback寫法，簡單來說就是把req.body.event的東西放到handleEvent解析，然後轉成json
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err)
      res.status(500).end()
    })
})

// event handler
async function handleEvent(event) {
  try {
    // 如果啥都沒輸入，就結束
    if (event.type !== 'message' || event.message.type !== 'text') {
      // ignore non-text-message event
      return Promise.resolve(null)
    }

    // 使用者的內容前後的空格前刪掉
    const userInput = event.message.text.trim()
    // 設定openAI的角色，方便openAI辨認
    const messages = [
      {
        role: 'user',
        // 使用者的輸入內容會放在這裡
        content: userInput,
      },
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
    ]
    
    // 使用gpt-3.5，temperature可以去查openAI的文
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 1,
        messages: messages,
        // chatgpt會用token計費，所以非必要不要設太長
        max_tokens: 200,
    })

    // echo是準備回給Line的東西，回的方式是文字，文字要取completion.choices[0].message.content的內容
    const echo = { type: 'text', text: completion.choices[0].message.content || '抱歉，我沒有話可說了。' }
  
    // use reply API
    // 回給使用者
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [echo],
    })
  } catch (err) {
    console.log(err)
  }
}

// listen on port
const port = process.env.PORT || 80
app.listen(port, () => {
  console.log(`listening on ${port}`)
})