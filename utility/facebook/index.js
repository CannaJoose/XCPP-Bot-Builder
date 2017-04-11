/**
 * Created by Lammmmmmm on 3/20/2017.
 */
var request = require("request");
const FB_BASIC = 'https://graph.facebook.com/v2.8/'
const FB_MESSENGER_ENDPOINT = FB_BASIC+"me/messages";
const FB_PROFILE_ENDPOINT = FB_BASIC+"me/messenger_profile";
const FB_SETTINGS_ENDPOINT = FB_BASIC+"me/thread_settings";

function facebook(verify_token, page_token, main) {
    this.verify_token = verify_token;
    this.page_token = page_token;
    this.main = main;
}

facebook.prototype.middleware = function () {

    var that = this;

    return function (req, res) {

        if (req.method === 'GET') {
            return that.verify(req, res);
        }

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
                var messages = messageData.entry[0].messaging;
                var message = messages[messages.length - 1]; // get latest message

                //greeting
                if (message.postback && message.postback.payload == 'GET_STARTED_PAYLOAD') {
                    that.send_textMsg(message.sender.id, that.greeting);
                    that.get_user_info(message.sender.id,function (err,user_info) {
                        that.userInfo_to_middleformat(message.sender.id,JSON.parse(user_info),function(middleUserInfo){
                            that.main.save_user_info_to_db('fb',middleUserInfo);
                        });
                    });
                }
                else {
                    //messageEvent
                    var triggerText = '';
                    if (message.message && message.message.text && !message.message.is_echo) triggerText = message.message.text;
                    if (message.postback && message.postback.payload) triggerText = message.postback.payload;

                    if (triggerText && that.event_list && that.event_list[triggerText]) {
                        that.handle_messageEvent(message.sender.id, triggerText, that.event_list[triggerText]);
                    }
                }

            });

        }
    };
}
facebook.prototype.verify = function (req, res) {
    if (req.query['hub.verify_token'] === this.verify_token) {
        res.send(req.query['hub.challenge']);
    } else {
        res.status(500).send('Error, wrong validation token');
    }
};
facebook.prototype.add_messageEvent = function (TriggerText, middleMsg) {
    if (!this.event_list) this.event_list = {};
    this.event_list[TriggerText] = middleMsg;
};
facebook.prototype.handle_messageEvent = function (id, TriggerText, middleMsg) {
    var that = this;
    switch (middleMsg.type) {
        case "Event":
            var event_message = {
                platform: 'fb',
                chatId: id,
                triggerText: TriggerText
            };
            that.main.emit(middleMsg.event, event_message);
            break;
        case"List":
            that.middleformat_to_content_list(middleMsg.list, function (playload) {
                that.send_template(id, playload);
            });
            break;
        case "Text":
            that.send_textMsg(id, middleMsg.content);
            break;
        case "Image":
            that.send_img(id, middleMsg.img);
            break;
        case "WebUrl":
            that.send_textMsg(id, middleMsg.url);
            break;
        case "SubMenu":
            that.middleformat_to_quick_replies(middleMsg.sub_menu, function (quick_replies) {
                that.set_quickReply(id, TriggerText, quick_replies);
            });
            break;
    }
};

//basic post to facebook
facebook.prototype.post_msg = function (config, cb) {
    var req = {
        url: FB_MESSENGER_ENDPOINT,
        qs: {access_token: this.page_token},
        method: "POST",
        json: config
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
}

facebook.prototype.post_config_profile = function (config, cb) {
    var req = {
        url: FB_PROFILE_ENDPOINT,
        qs: {access_token: this.page_token},
        method: "POST",
        json: config
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
};

facebook.prototype.post_config_setting = function (config, cb) {
    var req = {
        url: FB_SETTINGS_ENDPOINT,
        qs: {access_token: this.page_token},
        method: "POST",
        json: config
    }
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
}

facebook.prototype.post_whitelist_url = function (url_list, cb) {

    var req = {
        url: FB_SETTINGS_ENDPOINT,
        qs: {access_token: this.page_token},
        method: "POST",
        json: {
            "setting_type": "domain_whitelisting",
            "whitelisted_domains": url_list,
            "domain_action_type": "add"
        }
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
}

//messenger api
facebook.prototype.get_user_info = function (userId, cb) {
    var req = {
        url: FB_BASIC+userId,
        qs: {fields: "first_name,last_name,profile_pic,locale,timezone,gender",access_token: this.page_token},
        method: "get"
    };
    request(req, function (err, res, body) {
        if (err)throw err;
        if (cb)
            if (err) return cb(err);
            else cb(null, body);
    });
}

facebook.prototype.set_persistentMenu = function (call_to_action_list) {
    this.post_config_setting({
        "setting_type": "call_to_actions",
        "thread_state": "existing_thread",
        "call_to_actions":call_to_action_list
    });
};

facebook.prototype.set_quickReply = function (id, text, quick_replies) {
    this.post_msg({
        recipient: {id: id},
        message: {
            text: text,
            quick_replies: quick_replies
        }
    })
}

facebook.prototype.send_textMsg = function (id, text) {
    var textMsg_config = {
        recipient: {id: id},
        message: {text: text}
    };
    this.post_msg(textMsg_config)
};

facebook.prototype.send_template = function (id, playload) {
    var template_config = {
        recipient: {id: id},
        message: {
            "attachment": {
                "type": "template",
                "payload": playload
            }
        }
    };
    this.post_msg(template_config);
};

facebook.prototype.send_img = function (id, img_url) {
    var img_config = {
        recipient: {id: id},
        message: {
            "attachment": {
                "type": "image",
                "payload": {
                    "url": img_url
                }
            }
        }
    };
    this.post_msg(img_config)

};

//handle middleformat
facebook.prototype.middleformat_to_call_to_actions = function (middleformat, callback, webview_height_ratio, messenger_extensions) {

    //init all setting
    if (!webview_height_ratio)
        webview_height_ratio = 'full';
    if (!messenger_extensions)
        messenger_extensions = false;

    //call_to_actions_list limit 5 items from 2017-3-22
    const limit = 5;
    var that = this;
    var call_to_action_list = [];

    if(Object.keys(middleformat).length < limit) {
        Object.keys(middleformat).forEach(function (i) {
            switch (middleformat[i].type) {
                case "OpenWebPage":
                    call_to_action_list.push({
                        type: 'web_url',
                        title: i,
                        url: middleformat[i].url,
                        webview_height_ratio: webview_height_ratio,
                        messenger_extensions: messenger_extensions
                    });
                    break;
                default:
                    call_to_action_list.push({
                        type: "postback",
                        title: i,
                        payload: i
                    });
                    that.add_messageEvent(i, middleformat[i]);
                    break;
            }
        });
        callback(call_to_action_list);
    }


}

facebook.prototype.middleformat_to_quick_replies = function (middleformat, callback, content_type) {

    //init setting
    if (!content_type)
        content_type = 'text';

    //quick_replies_list limit 11 items from 2017-3-22
    const limit = 11;
    var that = this;
    var quick_replies = [];

    if(Object.keys(middleformat).length < limit) {
        Object.keys(middleformat).forEach(function(i){
            if (content_type == 'text')
                quick_replies.push({
                    "content_type": content_type,
                    "title": i,
                    "payload":i
                });
            else
                quick_replies.push({
                    "content_type": content_type
                });
            that.add_messageEvent(i, middleformat[i])
        });
        callback(quick_replies);
    }
};

facebook.prototype.middleformat_to_content_list = function (middleformat, callback, top_element_style, default_title,default_subtitle, webview_height_ratio) {

    //init setting
    if (!top_element_style)
        top_element_style = 'large';
    if (!default_title)
        default_title = '==';
    if (!default_subtitle)
        default_subtitle = '==';
    if (!webview_height_ratio)
        webview_height_ratio = 'full';

    //elements_limit at least 2 at most 4 items from 2017-3-22
    const elements_least = 2;
    const elements_most = 4;
    const buttons_limit = 1;

    var that = this;
    var elements = [];
    var buttons = [];
    if(Object.keys(middleformat).length < elements_most) {
        Object.keys(middleformat).forEach(function(i){
            var element_json = {};
            //Required value
            element_json['title'] = middleformat[i].title;
            //option value
            if (middleformat[i].img)
                element_json['image_url'] = middleformat[i].img;
            if (middleformat[i].subtitle)
                element_json['subtitle'] = middleformat[i].subtitle;
            if (middleformat[i].url)
                element_json['default_action'] = {
                    type: "web_url",
                    url: middleformat[i].url,
                    webview_height_ratio: webview_height_ratio
                };
            if (middleformat.more && middleformat.more.type) {
                if (middleformat.more.type == 'url') {
                    element_json['button'] = [{
                        type: "web_url",
                        url: middleformat[i].url,
                        title: middleformat.more.title,
                        webview_height_ratio: webview_height_ratio
                    }];
                }
                if (middleformat.more.type == 'event') {
                    element_json['button'] = [{
                        type: "postback",
                        title: middleformat.more.title,
                        payload: middleformat.more.title
                    }];
                    that.add_messageEvent(middleformat.more.title, middleformat.more)
                }
            }
            elements.push(element_json);
        })
    }

    //set default if middleformat.length less then elements least
    if(elements_least < Object.keys(middleformat).length){
        elements.push({
            title: default_title,
            subtitle:default_subtitle
        });
    }

    //Required value
    var playload = {
        template_type: "list",
        top_element_style: top_element_style,
        elements: elements
    };
    //option value
    if (buttons.length > 0 && buttons.length < buttons_limit) {
        playload['buttons'] = buttons;
    }

    callback(playload);
};

facebook.prototype.userInfo_to_middleformat = function (id,userInfo,callback) {

    var middleUserInfo = {};

    middleUserInfo['id'] = id;

    if(userInfo.last_name)
        middleUserInfo['last_name'] = userInfo.last_name;
    if(userInfo.first_name)
        middleUserInfo['first_name'] = userInfo.first_name;
    if(userInfo.profile_pic)
        middleUserInfo['icon'] = userInfo.profile_pic;
    if(userInfo.locale)
        middleUserInfo['locale'] = userInfo.locale;
    if(userInfo.timezone)
        middleUserInfo['timezone'] = userInfo.timezone;
    if(userInfo.gender)
        middleUserInfo['gender'] = userInfo.gender;

    callback(middleUserInfo);

};

module.exports = facebook;