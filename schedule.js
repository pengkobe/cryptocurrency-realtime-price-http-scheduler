const https = require('https');
const Redis = require("ioredis");
const schedule = require('node-schedule');
const redis_pub_sub = new Redis(process.env.redis_pub_sub_url);
const redis_cache = new Redis(process.env.redis_cache_url);

// --------------Start:mock data------------------
function mockData(redis_cache) {
    const list = [
        { "id": 1, "name": "Bitcoin", "base": "BTC", "target": "USD", "price": "443.7807865468", "volume": "31720.1493969300", "change": "0.3766203596" },
        { "id": 2, "name": "Ether", "base": "ETH", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 3, "name": "Litecoin", "base": "LTC", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 4, "name": "Monero", "base": "xmr", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 5, "name": "Ripple", "base": "xrp", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 6, "name": "Dogecoin", "base": "doge", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 7, "name": "Dash", "base": "dash", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 8, "name": "MaidSafeeCoin", "base": "maid", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 9, "name": "Lisk", "base": "lsk", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" },
        { "id": 10, "name": "Storjcoin", "base": "sjcx", "target": "USD", "price": "3071.66499933", "volume": "98621.75069813", "change": "-6.53206258" }];

    list.map(ele => {
        redis_cache.set(ele["name"], JSON.stringify(ele));
    })
    return list;
};
let list = mockData(redis_cache);
// --------------END:mock data------------------

const NAME_MAP = new Map([["BTC", "Bitcoin"], ["ETH", "Ether"], ["LTC", "Litecoin"],
["xmr", "Monero"], ["xrp", "Ripple"], ["doge", "Dogecoin"], ["dash", "Dash"], ["maid", "MaidSafeeCoin"], ["lsk", "Lisk"], ["sjcx", "Storjcoin"]]);

const now = new Date().getTime();
const TIMESTAMP_MAP = new Map([["BTC", now], ["ETH", now], ["LTC", now],
["xmr", now], ["xrp", now], ["doge", now], ["dash", now], ["maid", now], ["lsk", now], ["sjcx", now]]);

async function startTask() {
    schedule.scheduleJob('load_cryptocurrency_realtime_price', '10,40 * * * * *', async () => {
        try {

            if (true) {
                mockPriceChange();
            } else {
                updateDataFromCryptonator();
            }
        } catch (error) {
            console.error(error);
        }
    })
}

function updateDataFromCryptonator() {
    const prefix = 'https://api.cryptonator.com/api/ticker/';
    const suffixList = ['btc-usd', 'ltc-usd', 'xmr-usd', 'xrp-usd',
        'doge-usd', 'dash-usd', 'maid-usd', 'lsk-usd', 'sjcx-usd'];

    suffixList.forEach( (suffix) => {
        fetchDataFromCryptonator(prefix + suffix, async (body) => {
            // body: {"ticker":{"base":"BTC","target":"USD","price":"443.7807865468","volume":"31720.1493969300","change":"0.3766203596"},"timestamp":1399490941,"success":true,"error":""}
            if (body.success) {
                let ticker = body.ticker;
                ticker["name"] = NAME_MAP.get(ticker.base);

                // update when timestamp refreshed
                if (TIMESTAMP_MAP.get(ticker.base) < body.timestamp) {
                    let cached_val = await redis_cache.get(ticker["name"]);
                    if (cached_val) {
                        // console.log(cached_val)
                        cached_val = JSON.parse(cached_val);

                        // generate update message
                        let message = {
                            name: ticker["name"],
                            changeList: []
                        }
                        if (ticker.price != cached_val.price) {
                            message.changeList.push({
                                property: "price",
                                value: ticker.price,
                            })
                        }
                        if (ticker.volume != cached_val.volume) {
                            message.changeList.push({
                                property: "price",
                                value: ticker.volume,
                            })
                        }
                        if (ticker.change != cached_val.change) {
                            message.changeList.push({
                                property: "price",
                                value: ticker.change,
                            })
                        }

                        // update cache
                        for (let val of message.changeList) {
                            cached_val[val.property] = val.value;
                        }
                        redis_cache.set(cached_val.name, JSON.stringify(cached_val));

                        // publish message
                        console.log("Published %s to %s", message, channel);
                        redis_pub_sub.publish(channel, JSON.stringify(message));
                    } else {
                        redis_cache.set(ticker["name"], JSON.stringify(ticker));
                    }
                }
            }
        });
    });

    function fetchDataFromCryptonator(url, callback) {
        https.get(url, (res) => {
            console.log('statusCode:', res.statusCode);
            // console.log('headers:', res.headers);
            res.on('data', (res_data) => {
                callback(res_data);
            });
        }).on('error', (err_msg) => {
            console.error(err_msg);
        });
    }
}

async function mockPriceChange() {
    // mock changed currency
    const rand = Math.floor(Math.random() * 10);
    const channel = `currency_info_change`;

    let cached_val = await redis_cache.get(list[rand].name);

    if (cached_val) {
        console.log(cached_val)
        cached_val = JSON.parse(cached_val);
        // generate update message
        let message = {
            name: cached_val.name,
            changeList: [{
                property: "price",
                value: (parseFloat(cached_val.price) + 2) + '',
            }]
        }

        // update cache
        for (let val of message.changeList) {
            cached_val[val.property] = val.value;
        }
        redis_cache.set(cached_val.name, JSON.stringify(cached_val));

        // publish message
        console.log("Published %s to %s", message, channel);
        redis_pub_sub.publish(channel, JSON.stringify(message));
    }
}

module.exports = startTask;
