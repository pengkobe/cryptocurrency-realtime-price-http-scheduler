const schedule = require('node-schedule');
// const http = require('http');
const https = require('https');
const Redis = require("ioredis");
const redis_pub_sub = new Redis(process.env.redis_pub_sub_url);
const redis_cache = new Redis(process.env.redis_cache_url);

let list = mockData(redis_cache);

async function startTask() {
    schedule.scheduleJob('load_price', '10,40 * * * * *', async () => {
        try {
            // let url = 'https://api.cryptonator.com/api/ticker/btc-usd';
            // //{"ticker":{"base":"BTC","target":"USD","price":"443.7807865468","volume":"31720.1493969300","change":"0.3766203596"},"timestamp":1399490941,"success":true,"error":""}
            // https.get(url, function (response, response, body) {
            //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            //     console.log('body:', body); // Print the HTML for the Google homepage.
            // });

            // mock changed currency
            const rand = Math.floor(Math.random() * 10);
            const channel = `currency_info_change`;

            // generate update message
            let message = {
                name: list[rand].name,
                changeList: [{
                    property: "price",
                    value: (parseFloat(list[rand].price) + 2) + '',
                }]
            }

            // update cache
            let cache_val = await redis_cache.get(list[rand].name);
            if (cache_val) {
                console.log(cache_val)
                cache_val = JSON.parse(cache_val);
                for (let val of message.changeList) {
                    cache_val[val.property] = val.value;
                }
                redis_cache.set(list[rand].name, JSON.stringify(cache_val));

                // publish message
                console.log("Published %s to %s", message, channel);
                redis_pub_sub.publish(channel, JSON.stringify(message));
            }

        } catch (error) {
            console.error(error);
        }
    })
}

// mock
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

module.exports = startTask;
