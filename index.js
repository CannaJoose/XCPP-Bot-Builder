/**
 * Created by Lammmmmmm on 3/17/2017.
 */
var FB = require('./utility/facebook/');
var Telegram = require('./utility/telegram/');
var Line = require('./utility/line/');

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require("fs");
var crypto = require('crypto');
var request = require("request");
var loki = require('lokijs');
var db = new loki('./user_info.json');


//config
util.inherits(xcpp, EventEmitter);
//init
function xcpp(options, cb) {
    if (!options) {

        var error = new Error("Page Access Token missing.");

        if (typeof cb === "function") {
            return cb([], error)
        }

        throw error;
    }
    this.platform_list = [];
    if (options.fb_page_token && options.fb_verify_token) {
        this.FBAPI = new FB(options.fb_verify_token, options.fb_page_token, this);
        this.platform_list.push("fb");
        this.create_platform_db_collection('fb')
    }
    if (options.telegram_token) {
        this.TelegramAPI = new Telegram(options.telegram_token, this);
        this.platform_list.push("telegram");
        this.create_platform_db_collection('telegram');
    }
    if (options.line_channel_access_token && options.line_channel_secret) {
        this.LineAPI = new Line(options.line_channel_access_token, options.line_channel_secret, this);
        this.platform_list.push("line");
        this.create_platform_db_collection('line');
    }
    if (cb) cb(this.platform_list, null);
}

//Generate Webhook Address
xcpp.prototype.generate_plafrom_webhook_address = function (generateNewWebhook, callback) {
    var that = this;
    this.read_webhook_address_from_file(function (dummy_address_list) {
        var address_list = {};
        if (generateNewWebhook) dummy_address_list = {};
        that.platform_list.forEach(function (platform) {
            var token = crypto.randomBytes(64).toString('hex');
            if (dummy_address_list[platform])
                address_list[platform] = dummy_address_list[platform];
            else
                address_list[platform] = "/" + token + "/" + platform + "_webhook";
        });
        that.save_webhook_address_to_file(address_list)
        callback(address_list);
    });
};
xcpp.prototype.read_webhook_address_from_file = function (callback) {
    var address_list = {};
    fs.readFile("webhook_address.list", 'utf-8', function (err, list) {
        if (list) {
            list = list.split("\n");
            list.forEach(function (i) {
                var data = i.split(":")
                if (data[0] && data[1])
                    address_list[data[0]] = data[1]
            })
        }
        callback(address_list);
    })
};
xcpp.prototype.save_webhook_address_to_file = function (address_list) {
    var file_content = '';
    Object.keys(address_list).forEach(function (platform) {
        var address = address_list[platform];
        file_content += platform + ":" + address + "\n";
    })
    fs.writeFile('webhook_address.list', file_content, function (err) {
        if (err)
            throw err;
    })
};

//user management
xcpp.prototype.create_platform_db_collection = function (platform) {
    var col = db.getCollection(platform);
    if (!col)
        db.addCollection(platform)
};
xcpp.prototype.save_user_info_to_db = function (platform, info) {
    db.loadDatabase({}, function () {
        var children = db.getCollection(platform);
        children.findAndRemove(info.id)
        children.insert(info);
        db.saveDatabase();
    });
};
xcpp.prototype.read_user_info_from_db = function (platform, condition, callback) {
    db.loadDatabase({}, function () {
        var children = db.getCollection(platform);
        callback(children.find(condition));
    });
};
xcpp.prototype.usersInfo_to_usersId_array = function (userInfo_array, callback) {
    var userId_array = [];
    userInfo_array.forEach(function (item) {
        if (item.id)
            userId_array.push(item.id);
    });
    callback(userId_array);
};

//Greeting
xcpp.prototype.set_greetingMsg = function (middleGreeting) {
    var that = this;
    Object.keys(middleGreeting).forEach(function (platform) {
        if (platform == 'all')
            that.platform_list.forEach(function (added_platform) {
                if (Object.keys(middleGreeting).indexOf(added_platform) < 0)
                    that.add_greetingMsg(added_platform, middleGreeting[platform]);
            });
        else if (that.platform_list.indexOf(platform) >= 0)
            that.add_greetingMsg(platform, middleGreeting[platform])
    })
};
xcpp.prototype.add_greetingMsg = function (platform, middleMsg) {
    var that = this;
    switch (platform) {
        case 'telegram':
            that.TelegramAPI.greeting = middleMsg.content;
            break;
        case 'fb':
            that.FBAPI.greeting = middleMsg.content;
            that.FBAPI.post_config_profile({
                "get_started": {
                    "payload": "GET_STARTED_PAYLOAD"
                }
            });
            break;
        case 'line':
            that.LineAPI.greeting = middleMsg.content;
            break;
    }
};

//Menu
xcpp.prototype.set_menu = function (middleMenu) {
    var that = this;
    Object.keys(middleMenu).forEach(function (platform) {
        if (platform == 'all')
            that.platform_list.forEach(function (added_platform) {
                if (Object.keys(middleMenu).indexOf(added_platform) < 0)
                    that.add_menu(added_platform, middleMenu[platform]);
            });
        else if (that.platform_list.indexOf(platform) >= 0)
            that.add_menu(platform, middleMenu[platform])
    });
};
xcpp.prototype.add_menu = function (platform, middleMenu) {
    var that = this;
    switch (platform) {
        case 'telegram':
            //first menu : custom keyboards
            //second menu : Inline keyboards
            that.TelegramAPI.middleformat_to_menu(middleMenu);
            break;
        case 'fb':
            //first menu : Persistent Menu
            //second menu : quick-replies
            //set persistent menu
            that.FBAPI.middleformat_to_call_to_actions(middleMenu, function (call_to_actions) {
                that.FBAPI.set_persistentMenu(call_to_actions);
            });
            break;
        case 'line':
            //first menu : Template messages
            //second menu : Template messages
            that.LineAPI.bind_menu_event(middleMenu);
            that.LineAPI.middleMenu = middleMenu;
            break;
    }
}

//MessageEvent
xcpp.prototype.set_MessageEvents = function (MiddleEvents_list) {
    var that = this;
    MiddleEvents_list.forEach(function (middleEvent) {
        if (middleEvent.platform == 'all')
            that.platform_list.forEach(function (platform) {
                that.add_messageEvent(platform, middleEvent.triggerText, middleEvent.middleMsg);
            });
        else
            that.add_messageEvent(middleEvent.platform, middleEvent.triggerText, middleEvent.middleMsg);
    });
};
xcpp.prototype.set_MessageEvent = function (middleEvent) {
    var that = this;
    if (middleEvent.platform == 'all')
        that.platform_list.forEach(function (platform) {
            that.add_messageEvent(platform, middleEvent.triggerText, middleEvent.middleMsg);
        });
    else
        that.add_messageEvent(middleEvent.platform, middleEvent.triggerText, middleEvent.middleMsg);
};
xcpp.prototype.add_messageEvent = function (middleEvent) {
    switch (middleEvent.platform) {
        case'telegram':
            this.TelegramAPI.add_messageEvent(middleEvent.triggerText, middleEvent.middleMsg);
            break;
        case 'fb':
            this.FBAPI.add_messageEvent(middleEvent.triggerText, middleEvent.middleMsg);
            break;
        case 'line':
            this.LineAPI.add_messageEvent(middleEvent.triggerText, middleEvent.middleMsg);
            break;
    }
};

//restful api
xcpp.prototype.set_api_verify_token = function (token) {
    this.verify_token = token;
};
xcpp.prototype.handle_api_request = function () {
    return function (req, res) {

        if (req.method === 'POST') {
            // Read data from the request
            var data = '';
            req.setEncoding('utf8');
            req.on('data', function (chunk) {
                data += chunk;
            });

            req.on('end', function () {
                var messageData = JSON.parse(data);
                if (this.verarify_token)
                    if (!messageData.token || messageData.token != this.verify_token) {
                        res.send({
                            "error": "token not match"
                        });
                        return;
                    }

                var conditation = messageData.conditation;
                var middleMsg = messageData.platform;
            })
        }
    }
};


module.exports = xcpp;