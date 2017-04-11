/**
 * Created by Lammmmmmm on 3/20/2017.
 */
var request = require("request");

const TELEGRAM_ENDPOINT = "https://api.telegram.org/bot"

function telegram(telegram_token, main) {
    this.telegram_token = telegram_token;
    this.main = main;
}

telegram.prototype.middleware = function () {

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
                var message_content;

                if (messageData.message) { //receive message
                    message_content = messageData.message.text;
                    messageData = messageData.message
                }
                else { //receive callback
                    message_content = messageData.callback_query.data;
                    messageData = messageData.callback_query;
                    that.send_answer_callback(messageData.id)
                }

                var id = '';
                var userId = messageData.from.id;
                var groupId = messageData.chat.id;

                groupId ? id = groupId : id = userId;

                //Greeting
                if (message_content == "\/start" && that.greeting) {
                    that.userInfo_to_middleformat(messageData.from, function (middleUserInfo) {
                        that.main.save_user_info_to_db('telegram',middleUserInfo);
                    });
                    that.menu_config['text'] = that.greeting;
                    that.menu_config['chat_id'] = id;
                    that.post_msg("/sendMessage", that.menu_config);
                }
                //Open SubMenu
                else if (that.submenu_config && that.submenu_config[message_content]) {
                    that.submenu_config[message_content]['text'] = message_content;
                    that.submenu_config[message_content]['chat_id'] = id;
                    that.post_msg("/sendMessage", that.submenu_config[message_content]);
                }
                //Active_instruction
                else if (that.event_list && that.event_list[message_content]) {
                    that.handle_messageEvent(id, message_content, that.event_list[message_content]);
                }
                else {
                    var json = {
                        id: id,
                        content: message_content
                    };
                    that.main.emit("REPLY", json);
                }
            });

        }
    };
};
telegram.prototype.verify = function (cb) {
    var req = {
        method: "GET",
        uri: TELEGRAM_ENDPOINT + this.telegram_token + "/getMe",
        qs: {},
        json: true
    };

    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};
telegram.prototype.add_messageEvent = function (event, middleMsg) {
    if (!this.event_list) this.event_list = {};
    this.event_list[event] = middleMsg;
};
telegram.prototype.handle_messageEvent = function (id, TriggerText, middleMsg) {
    switch (middleMsg.type) {
        case "Event":
            var message_detail = {
                platform: 'telegram',
                chatId: id,
                triggerText: TriggerText
            }
            this.main.emit(middleMsg.event, message_detail);
            break;
        case "WebUrl":
            this.send_textMsg(id, middleMsg.url);
            break;
        case "List":
            this.send_contentList(id, middleMsg.title, middleMsg.list);
            break;
        case "Text":
            this.send_textMsg(id, middleMsg.content);
            break;
        case "Image":
            this.send_img(id, middleMsg.img);
            break
    }
};

//basic post to telegram
telegram.prototype.post_msg = function (messageType, msgConfig, cb) {
    var req = {
        method: "POST",
        uri: TELEGRAM_ENDPOINT + this.telegram_token + messageType,
        qs: {},
        json: msgConfig
    };

    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};
telegram.prototype.post_webhook_url = function (url, cb) {
    var req = {
        method: "GET",
        uri: TELEGRAM_ENDPOINT + this.telegram_token + "/setWebhook",
        qs: {
            url: url
        }
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};
telegram.prototype.get_userProfile_image = function (id, cb) {
    var req = {
        method: "GET",
        uri: TELEGRAM_ENDPOINT + this.telegram_token + "/getUserProfilePhotos",
        qs: {
            user_id: id
        }
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};

//telegram api

telegram.prototype.send_textMsg = function (id, text) {
    var telegram_textMsg_config = {
        text: text,
        chat_id: id
    };
    this.post_msg("/sendMessage", telegram_textMsg_config);
};
telegram.prototype.send_answer_callback = function (id) {
    var config = {
        callback_query_id: id
    };
    this.post_msg("/answerCallbackQuery", config);
};
telegram.prototype.send_contentList = function (id, title, list) {
    var markdown_list = title + "\n\n";

    list.forEach(function (i) {
        markdown_list += "[" + i.title + "](" + i.url + ")\n\n";
    });

    var telegram_content_list_config = {
        text: markdown_list,
        chat_id: id,
        parse_mode: "MARKDOWN"
    };

    this.post_msg("/sendMessage", telegram_content_list_config);
};
telegram.prototype.send_img = function (id, image_url, caption) {
    //required value
    var telegram_img_config = {
        chat_id: id,
        photo: image_url
    };
    //option value
    if (caption)
        telegram_img_config['caption'] = caption;
    this.post_msg("/sendPhoto", telegram_img_config);
};

telegram.prototype.middleformat_to_menu = function (middleMenu) {
    var that = this;
    //set menu
    var telegram_menu_config = {
        reply_markup: {
            keyboard: [Object.keys(middleMenu)],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
    Object.keys(middleMenu).forEach(function (i) {
        if (middleMenu[i].type != "SubMenu") {
            that.add_messageEvent(i, middleMenu[i])
        }
    });
    //set sub menu
    var telegram_submenu_config = {};
    Object.keys(middleMenu).forEach(function (i) {
        if (middleMenu[i].type == "SubMenu") {
            telegram_submenu_config[i] = {
                reply_markup: {
                    inline_keyboard: [[]]
                }
            };
            Object.keys(middleMenu[i].sub_menu).forEach(function (sub_i) {
                telegram_submenu_config[i].reply_markup.inline_keyboard[0].push({
                    text: sub_i,
                    callback_data: sub_i
                });
                that.add_messageEvent(sub_i, middleMenu[i].sub_menu[sub_i]);
            })
        }
    });

    that.menu_config = telegram_menu_config;
    that.submenu_config = telegram_submenu_config;
};
telegram.prototype.userInfo_to_middleformat = function (userInfo, callback) {

    var middleUserInfo = {};

    middleUserInfo['id'] = userInfo.id;

    if (userInfo.last_name)
        middleUserInfo['last_name'] = userInfo.last_name;
    if (userInfo.first_name)
        middleUserInfo['first_name'] = userInfo.first_name;

    callback(middleUserInfo);

};

module.exports = telegram;