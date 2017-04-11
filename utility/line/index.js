/**
 * Created by Lammmmmmm on 3/20/2017.
 */

var request = require("request");

const LINE_ENDPOINT = "https://api.line.me/v2/";
const LINE_MESSAGE_ENDPOINT = LINE_ENDPOINT+"bot/message/";
const LINE_PROFILE_ENDPOINT = LINE_ENDPOINT+"bot/profile/";
const LINE_TOKEN_ENDPOINT = LINE_ENDPOINT+"oauth/accessToken";

function line(CHANNEL_ACCESS_TOKEN,CHANNEL_SECRET,main) {
    this.channel_access_token = CHANNEL_ACCESS_TOKEN;
    this.channel_secret = CHANNEL_SECRET;
    this.main = main;
}

line.prototype.middleware = function () {
    var that = this;

    return function (req, res) {

        if (req.method === 'POST') {

            // Read data from the request
            var data = '';
            req.setEncoding('utf8');
            req.on('data', function (chunk) {
                data += chunk;
            });

            req.on('end', function () {

                // Always return HTTP200 to POST Request
                res.send({});

                var messageData = JSON.parse(data);
                messageData.events.forEach(function (message) {

                    switch (message.type) {
                        case 'follow':
                            that.send_textMsg(message.source.userId, that.greeting);
                            that.middleformat_to_menu(that.middleMenu, function (call_to_actions) {
                                that.send_template(message.source.userId,'MENU',call_to_actions)
                            });
                            break;
                        case 'postback':
                            var triggerText = message.postback.data;
                            if (triggerText && that.event_list && that.event_list[triggerText])
                                that.handle_messageEvent(message.source.userId, triggerText, that.event_list[triggerText]);
                            break;
                        case 'message':
                            var messageText = message.message.text;
                            if (messageText && that.event_list && that.event_list[messageText])
                                that.handle_messageEvent(message.source.userId,messageText,that.event_list[messageText]);
                            else{
                                that.middleformat_to_menu(that.middleMenu, function (call_to_actions) {
                                    that.send_template(message.source.userId,'MENU',call_to_actions)
                                });
                            }
                            break;
                    }
                });
            });

        }
    };
}
line.prototype.add_messageEvent = function (event, middleMsg) {
    if (!this.event_list) this.event_list = {};
    this.event_list[event] = middleMsg;
};
line.prototype.handle_messageEvent = function (id, TriggerText, middleMsg) {
    var that = this;
    switch (middleMsg.type) {
        case "Event":
            var event_message = {
                platform: 'line',
                chatId: id,
                triggerText: TriggerText
            };
            this.main.emit(middleMsg.event, event_message)
            break;
        case "WebUrl":
            this.send_textMsg(id, middleMsg.url);
            break;
        case "List":
            this.middleformat_to_contentList(middleMsg.list,function (templateConfig) {
                that.send_template(id,middleMsg.title,templateConfig)
            });
            break;
        case "Text":
            this.send_textMsg(id, middleMsg.content);
            break;
        case "Image":
            this.send_img(id, middleMsg);
            break;
        case "SubMenu":
            this.middleformat_to_menu(middleMsg.sub_menu,function (templateConfig) {
                that.send_template(id,TriggerText,templateConfig)
            });
            break;
    }
};

//basic post to telegram
line.prototype.post_msg = function (messageType, msgConfig, cb) {
    var req = {
        url: LINE_MESSAGE_ENDPOINT + messageType,
        headers: {'Authorization': 'Bearer ' + this.channel_access_token},
        method: "POST",
        json: msgConfig
    };
    request(req, function (err, res, body) {
        console.log(body);
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};
line.prototype.get_user_info = function (id, cb) {
    var req = {
        url: LINE_PROFILE_ENDPOINT + id,
        headers: {'Authorization': 'Bearer ' + this.channel_access_token},
        method: "GET"
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};

//Line Api
line.prototype.send_textMsg = function (id, text, cb) {
    var msgConfig = {
        "to": id,
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    };
    this.post_msg("push", msgConfig);
};
line.prototype.send_template = function (id,altText,templateConfig) {

    var line_config = {
        "to": id,
        "messages": [{
            "type": "template",
            "altText": altText,
            "template": templateConfig
        }]
    };

    this.post_msg("push",line_config);
};
line.prototype.send_img = function (id, config, cb) {

    var line_config = {
        "to": id,
        "messages": [{
            "type": "image",
            "originalContentUrl": config.img,
            "previewImageUrl": config.img
        }]
    };

    this.post_msg("push", line_config);
};
line.prototype.bind_menu_event = function (middleformat) {
    var that = this;
    var menu_btns = Object.keys(middleformat);
    menu_btns.forEach(function (btn) {
        that.add_messageEvent(btn,middleformat[btn]);
        if(middleformat[btn].type == 'SubMenu'){
            that.bind_menu_event(middleformat[btn]['sub_menu']);
        }

    });
};

//handle middleformat
line.prototype.middleformat_to_contentList = function(middleformat,callback){
    var columns = [];
    middleformat.forEach(function (element) {
        var config = {};
        if(element.url) {
            var link = "";
            element.url.indexOf('http') < 0?link = 'http://' + element.url:link = element.url;
            config["actions"] = [
                {
                    "type": "uri",
                    "label": "View detail",
                    "uri": link
                }
            ];
        }
        if(element.img)
            config['thumbnailImageUrl'] = element.img;
        if(element.title)
            config["title"] = element.title;
        if(element.subtitle)
            config["text"] = element.subtitle

        columns.push(config)
    });

    var templateConfig = {
        "type": 'carousel',
        "columns": columns
    };

    callback(templateConfig);
};
line.prototype.middleformat_to_menu = function (middleformat,callback) {

    var menu_btns = Object.keys(middleformat);
    var actions = [];

    menu_btns.forEach(function (btn) {
        actions.push({
            "type": "postback",
            "label": btn,
            "data" : btn
        });
    });

    var templateConfig = {
        "type": 'buttons',
        "title": "Menu",
        "text": "Please select",
        "actions": actions
    };

    callback(templateConfig);
};
line.prototype.userInfo_to_middleformat = function (id,userInfo,callback) {
    var middleUserInfo = {};

    middleUserInfo['id'] = id;

    if(userInfo.displayName)
        middleUserInfo['first_name'] = userInfo.displayName;
    if(userInfo.pictureUrl)
        middleUserInfo['icon'] = userInfo.pictureUrl;
    if(userInfo.statusMessage)
        middleUserInfo['status'] = userInfo.statusMessage;

    callback(middleUserInfo);
};

module.exports = line;