const axios = require('axios');
const Redis = require("ioredis");
const schedule = require('node-schedule');

const redis_pub_sub_url = process.env.redis_pub_sub_url;
const redis_cache_url = process.env.redis_cache_url;
const nomic_api_key = process.env.nomic_api_key;
const redis_pub_sub = new Redis(redis_pub_sub_url);
const redis_cache = new Redis(redis_cache_url);
const NOMIC_API_KEY = nomic_api_key;

const NAME_MAP = new Map([["BTC", "Bitcoin"], ["ETH", "Ether"], ["LTC", "Litecoin"],
["XMR", "Monero"], ["XRP", "Ripple"], ["DOGE", "Dogecoin"], ["DASH", "Dash"], ["MAID", "MaidSafeeCoin"], ["LSK", "Lisk"], ["SJCX", "Storjcoin"]]);

const now = new Date('1999-12-01').getTime();
const TIMESTAMP_MAP = new Map([["BTC", now], ["ETH", now], ["LTC", now],
["XMR", now], ["XRP", now], ["DOGE", now], ["DASH", now], ["MAID", now], ["LSK", now], ["SJCX", now]]);

async function startTask() {
    // load data from nomic every 30s
    if (!redis_pub_sub_url || !redis_cache_url || !nomic_api_key ||
        redis_pub_sub_url == "empty" || redis_cache_url == "empty" || nomic_api_key == "empty"
    ) {
        console.error('Please set these environment variables correctly: redis_pub_sub_url, redis_cache_url, nomic_api_key');
        return;
    }

    schedule.scheduleJob('load_cryptocurrency_realtime_price', '10,40 * * * * *', async () => {
        try {
            updateDataFromNomics();
        } catch (error) {
            console.error(error);
        }
    })
}

function updateDataFromNomics() {

    // get id array, split by ,
    let IDS = '';
    NAME_MAP.forEach((val, key) => {
        if (IDS !== '') {
            IDS += ',' + key;
        } else {
            IDS = key;
        }
    });

    fetchDataFromNomics(`https://api.nomics.com/v1/currencies/ticker?key=${NOMIC_API_KEY}&ids=${IDS}&interval=1d`, async (response) => {
        let res_data = response.data;
        for (let curr_data of res_data) {
            curr_data["name"] = NAME_MAP.get(curr_data.currency);

            // update when timestamp refreshed
            let refreshTime = new Date(curr_data.price_timestamp).getTime();
            if (TIMESTAMP_MAP.get(curr_data.currency) < refreshTime) {
                TIMESTAMP_MAP.set(curr_data.currency, refreshTime);
                let cached_val = await redis_cache.get(curr_data["name"]);
                if (cached_val) {
                    cached_val = JSON.parse(cached_val);

                    // generate update message
                    let message = {
                        name: curr_data["name"],
                        changeList: []
                    }
                    if (curr_data.price != cached_val.price) {
                        message.changeList.push({
                            property: "price",
                            value: curr_data.price,
                        })
                    }
                    if (curr_data["1d"].volume != cached_val.volume) {
                        message.changeList.push({
                            property: "volume",
                            value: curr_data["1d"].volume,
                        })
                    }
                    if (curr_data["1d"].price_change != cached_val.price_change) {
                        message.changeList.push({
                            property: "change",
                            value: curr_data["1d"].price_change,
                        })
                    }

                    // save refreshed data to redis
                    cacheData(redis_cache, curr_data);

                    // publish message
                    console.log("Published %s to %s", message, 'currency_info_change');
                    redis_pub_sub.publish('currency_info_change', JSON.stringify(message));
                } else {
                    cacheData(redis_cache, curr_data);
                }
            }
        }
    });

    function cacheData(redis_cache, curr_data) {
        redis_cache.set(curr_data["name"], JSON.stringify({
            name: curr_data["name"],
            price: curr_data.price,
            volume: curr_data["1d"].volume,
            change: curr_data["1d"].price_change,
        }));
    }

    function fetchDataFromNomics(url, callback) {
        axios
            .get(url)
            .then(response => {
                callback(response);
            }).catch(err => {
                if (err.response.status === 401) {
                    console.error('Your api key is not valid!')
                } else {
                    console.error(err);
                }
            });
    }
}

module.exports = startTask;
