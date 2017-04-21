### X Chat Public Platform Bot Builder
### 多平台公眾號

# Introduction

Create platform just like WeChat Public Platform or Chatbots for Facebook Messenger , Line , Telegram and deploy to your own server in a minutes

彈指間，在多個平台上：Facebook Messenger，line，Telegram 建立你的公眾號與聊天機器人。

# feature
- 一個格式 多個平台  
  - 編寫好middleformat便可自動解析到各個平台
- one format for all Platform
  - use middleformat apply to all platform

- 推送消息 高效 新穎 低成本    
    - 支持特定平台，用戶推送       
    - 可用restful api 推送，方便接駁  
- Push Notification  
    - you can customise you own need
    - use restful to send push request

- 同時發佈到多個平台  
  - 支持多個平台同時運行
- MultiPlatform
  - support more than one IM platform run at the same time

- 安全的webhook  
  - 生成安全的webhook地址
- Safety Webhook
  - generate safety webhook easily

- 高度擴展性  
  - 可以輕易添加更多平台  
  - 輕易修改 定制特定樣式
- highly customize
  - simple to add more platform support on it
  - easy to edit the layout and style you want

- 文字觸發事件  
  - 能監聽特定文字，觸發事件處理
- Text trigger Event
  - set a event process trigger by some text

- 菜單操作  
  - 盡量在各個平台上實現操作菜單，作為功能導航
- Menu support
  - as many as possible to create a menu in IM platform

## Supported Platforms
- [x] Facebook Messenger
- [x] Telegram
- [x] Line
- [ ] Kik
- [ ] Slack
- [ ] Whatsapp

# Installation
``
npm install xchat_public_platform --save
``

# Sample code
```javascript
var xcpp = require('xchat_public_platform');

var express = require('express');
var app = express();

var bot = new xcpp({
    telegram_token: "TELEGRAMTOKEN",
    line_channel_access_token: "LINECHANNELTOKEN",
    line_channel_secret: "LINECHANNELSECRET",
    fb_page_token: "FBPAGETOKEN",
    fb_verify_token: "FBVERIFYTOKEN"
});

bot.generate_plafrom_webhook_address(false, function (webhook_address_list) {
    Object.keys(webhook_address_list).forEach(function (platform) {
        console.log(webhook_address_list[platform])
        switch (platform) {
            case "fb":
                app.use(webhook_address_list[platform], bot.FBAPI.middleware());
                break;
            case "telegram":
                app.use(webhook_address_list[platform], bot.TelegramAPI.middleware());
                break;
            case "line":
                app.use(webhook_address_list[platform], bot.LineAPI.middleware());
                break;
        }
    })
});

var GreetingMessageConfig = {
    telegram: {
        type: 'Text',
        content: 'Hello'
    },
    fb: {
        type: 'Text',
        content: "hello"
    },
    line: {
        type: 'Text',
        content: "hello"
    },
    all: {
        type: 'Text',
        content: "HI~"
    }
}
bot.set_greetingMsg(GreetingMessageConfig)
var MenuConfig = {
    all: {
        menu_1: {
            type: "Event",
            event: "ins"
        },
        meun_2: {
            type: "SubMenu",
            sub_menu: {
                meun_2_1: {
                    type: "Text",
                    content: "HI"
                },
                meun_2_2: {
                    type: "WebUrl",
                    url: "www.google.com",
                    title: "Google"
                },
                meun_2_3: {
                    type: "Image",
                    img: "https://unsplash.it/500/400?random",
                    title: "HIHI"
                }
            }
        },
        meun_3: {
            type: "List",
            title: "測試用:",
            list: [
                {
                    title: "你好",
                    subtitle:"oh",
                    img:'https://unsplash.it/500/400?random',
                    url: "www.google.com"
                },
                {
                    title: "HI",
                    subtitle:"iu",
                    img:'https://unsplash.it/500/400?random',
                    url: "www.google.com"
                },
                {
                    title: "test",
                    subtitle:"haha",
                    img:'https://unsplash.it/500/400?random',
                    url: "www.google.com"
                }
            ],
            more: {
                type: "WebUrl",
                url: 'www.google.com',
                title: 'hi'
            }
        }
    }
}
bot.set_menu(MenuConfig, function (err, body) {
    console.log(body)
});

bot.on("ins", function (event_message) {
    switch (event_message.platform) {
        case "telegram":
            console.log("TELEGRAM")
            console.log(event_message)
            break;
        case "fb":
            console.log("FB")
            console.log(event_message)
            break;
        case "line":
            console.log("LINE")
            break
    }
});

app.listen(3000);
```

# Function List

### Process Webhook  
``generate_plafrom_webhook_address(generateNewWebhook, callback)``  

 - generateNewWebhook - Boolean: True to generate new webhook address,false to get last address
 
 - callback - function(json) : list of address format as  
    ```json
      {
        "PLATFORM":"WEB_HOOK_ADDRESS"
      }
    ```

### User Management  
``save_user_info_to_db(platform, info)``  
 - platform - String : IM Platform you want to save
 - info - json : user profile content in MiddleUserInfo format
 
``read_user_info_from_db(platform, condition, callback)``  
 - platform - String : IM Platform you want to read 
 - condition - Json : condition are based on subset of mongo query syntax and are capable of utilizing indexes to speed up queries  
     - Json format : 
    ```json
    {
        'key': 
        { 
            'operators' : 'parameter' 
        }
    }
    ```
    
    - key are the field you want to set condition
     - operators list:  
        $eq - filter for document(s) with property of (strict) equality  
        $dteq - filter for document(s) with date property equal to provided date value  
        $gt - filter for document(s) with property greater than provided value  
        $gte - filter for document(s) with property greater or equal to provided value  
        $lt - filter for document(s) with property less than provided value  
        $lte - filter for document(s) with property less than or equal to provided value  
        $between - filter for documents(s) with property between provided vals  
        $ne - filter for document(s) with property not equal to provided value  
        $regex - filter for document(s) with property matching provided regular expression  
        $in - filter for document(s) with property matching any of the provided array values.  
        $contains - filter for document(s) with property containing the provided value  
        $containsAny - filter for document(s) with property containing any of the provided values  
        $containsNone - filter for documents(s) with property containing none of the provided values  
        $and - filter for documents which meet all nested subexpressions  
        $or - filter for documents which meet any of the nested subexpressions  
 - callback - array : list of MiddleUserInfo    

### Greeting  
```set_greetingMsg(middleGreeting)```   
will set greeting message when init
- middleGreeting - Json : use middleGreeting format to set greeting message

### Menu  
``set_menu(middleMenu)``
will set menu button when init
- middleMenu - Json : use middleMenu to set Menu in all platform

### Event Emit  
set_MessageEvents(MiddleEvents_list)  
you can set branch of events which trigger by some text and subscribe in ``.on()`` function  
- MiddleEvents_list - array : Array of MiddleEvent 

set_MessageEvent(middleEvent)  
set events which trigger by some text and subscribe in ``.on()`` function  
- middleEvent - Json : user MiddleEvent to set all the detail


# MiddleFormat
MiddleFormat是各個平台設置和訊息的載體  
編寫好MiddleFormt,項目內置的解析器會將其轉換為需要的格式。  

## MiddleGreeting - 設置歡迎訊息  

Sample Code
```json
{
    "Messaging Platform Name" : MiddleMsg,
    "fb":{ 
      "type":"textMsg",
      "content": "Hello"
    }
}
```
MiddleGreeting Field

| Field | Type | Description | Required |
| --- | --- | --- | --- |
| Messaging Platform Name | MiddleMsg | MiddleMsg Object | Y |

Messaging Platform Name list 

| Platform Name   | Description   |
| ------------- | ------------- |
| fb  | Facebook messenger  |
| telegram | Telegram  |
| line | Line | 
| all | All of the platform besides you specific set | 

## MiddleMenu - 設置菜單  

Sample Code
```json
{
    "Messaging Platform Name" : {
      "Menu Button Name" : MiddleMsg,
      "Menu Button Name" : MiddleMsg
    },
    "fb":{ 
      "Menu_1":{
              "type":"textMsg",
              "content": "Menu_1 click"
      },
      "Menu_2":{
              "type":"textMsg",
              "content": "Menu_2 click"
      }
    }
}
```
MiddleMenu Field

| Field | Type | Description | Required |
| --- | --- | --- | --- |
| Messaging Platform Name | Object | MenuObject | Y |

Messaging Platform Name list 

| Platform Name   | Description   |
| ------------- | ------------- |
| fb  | Facebook messenger  |
| telegram | Telegram  |
| line | Line | 
| all | All of the platform besides you specific set | 

Menu Object 

| Field | Type | Description | Required |
| --- | --- | --- | --- |
| Menu Button Name | Object | MiddleMsg/MiddleListen Object | Y |


## MiddleListen 
you can get a callback when user trigger this   
set it through  
Menu/SubMenu or  
Call function setMessageEvent(MiddleListen)

Sample Content
```json
{
    "type": "Listen",
    "triggerText": "trigger"
}
```

In your instantiated XCPP code,you can use to subscribe the callback like this : 
```javascript
xcpp.on("trigger", function (event_message) {
    switch (event_message.platform) {
            case "telegram":
                break;
            case "fb":
                break;
            case "your platform":
                break
    }
});
```
event_message Object

| Field | Type | Description |
| --- | --- | --- |
| platform | string | send from what platform |
| chatId | string | user Id,use it to reply |
| triggerText | string | text which trigger this callback |

## MiddleMsg - 發送給用戶的訊息  

### Sample Code

#### Text Message
```json
{
    "type": "Text",
    "content":"Sample"
}
```

#### WebUrl Message
```json
{
    "type" : "WebUrl",
    "url" : "www.google.com",
    "title" :"Google"
}
```

#### Image Message
```json
{
    "type": "Image",
    "img": "https://unsplash.it/500/400?random",
    "title": "Image Message"
}
```


#### List Message
```json
{
    "type": "SendContentList",
    "title": "測試:",
    "list": [
          {
              "type":"ListObject",
              "title": "測試",
              "subtitle": "測試",
              "url": "www.google.com",
              "img": "https://unsplash.it/500/400?random"
          },
          {
              "type":"ListObject",
              "title": "測試",
              "subtitle": "測試",
              "url": "www.google.com",
              "img": "https://unsplash.it/500/400?random"
          },
          {
              "type":"ListObject",
              "title": "測試",
              "subtitle": "測試",
              "url": "www.google.com",
              "img": "https://unsplash.it/500/400?random"
          }
    ]
}
```

#### SubMenu Message
```json
{
  "type": "SubMenu",
  "sub_menu": {
        "meun_2_1": MiddleMsg,
        "meun_2_2": {
            "type": "Text",
            "content":"Sample"
        },
        "meun_2_3":{
            "type": "Image",
            "img": "https://unsplash.it/500/400?random",
            "title": "Image Message"
        }
  }
}
```

MessageType List

| type   | Description   |
| ------------- | ------------- |
| Text  | plain Test |
| WebUrl | website link  |
| Image | image(only support image url) | 
| List | list view | 
| SubMenu | select menu |


MiddleMsg Field

| Field | Type | Description | Required |
| ----- | ---- | ----------- | -------- |
| type | string | MessageType | Y |
| content | string | Text Message Content | type == Text |
| url | string | web url | type == WebUrl |
| img | string | image url | type == Image |
| title | string | message title | type == List,ListObject,Image,WebUrl |
| subtitle | string | message subtitle | type == ListObject |
| list | list Object | Content list | type == List |
| more | more Object | list button for more information | type == List |
| sub_menu | submenu object | menu item | type == SubMenu |


# todo
- [ ] Push Notification api
- [ ] 生成分享鏈接/二維碼(Generate share link/QR code)  
- [ ] 支持投票(Vote support)  
- [ ] 加入 slack 的支持(slack support)  
- [ ] 構建GUI 編輯工具(GUI editor probably webpage in angular)  
- [ ] test case  
- [ ] user analytic 


## Application
微信的公眾普通提供一種新方式讓用戶傳遞資訊和服務交互。

   
