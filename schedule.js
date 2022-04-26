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
["XMR", "Monero"], ["XRP", "Ripple"], ["DOGE", "Dogecoin"], ["DASH", "Dash"], ["MAID2", "MaidSafeeCoin"], ["LSK", "Lisk"], ["SJCX", "Storjcoin"]]);

const now = new Date('1999-12-01').getTime();
const TIMESTAMP_MAP = new Map([["BTC", now], ["ETH", now], ["LTC", now],
["XMR", now], ["XRP", now], ["DOGE", now], ["DASH", now], ["MAID2", now], ["LSK", now], ["SJCX", now]]);

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

    // get ids string, split by ,
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
            // update message
            let updateMessage = {
                name: curr_data["name"],
                changeList: []
            }

            if (curr_data.status === "inactive") {
                let cached_val = await redis_cache.get(curr_data["name"]);
                if (cached_val) {
                    cached_val = JSON.parse(cached_val);

                    if (cached_val.price != "Unknown") {
                        updateMessage.changeList.push({
                            property: "price",
                            value: "Unknown",
                        })
                    }
                    if (cached_val.volume != "Unknown") {
                        updateMessage.changeList.push({
                            property: "volume",
                            value: "Unknown",
                        })
                    }
                    if (cached_val.change != "Unknown") {
                        updateMessage.changeList.push({
                            property: "change",
                            value: "Unknown",
                        })
                    }
                    // publish message
                    if (updateMessage.changeList.length > 0) {
                        console.log("Published %s to %s", updateMessage, 'currency_info_change');
                        redis_pub_sub.publish('currency_info_change', JSON.stringify(updateMessage));
                        cacheData(redis_cache, curr_data);
                    }

                } else {
                    cacheData(redis_cache, curr_data);
                }
                continue;
            }

            // update when timestamp refreshed
            let refreshTime = new Date(curr_data.price_timestamp).getTime();
            if (TIMESTAMP_MAP.get(curr_data.currency) < refreshTime) {
                TIMESTAMP_MAP.set(curr_data.currency, refreshTime);
                let cached_val = await redis_cache.get(curr_data["name"]);
                if (cached_val) {
                    cached_val = JSON.parse(cached_val);

                    if (curr_data.price != cached_val.price) {
                        updateMessage.changeList.push({
                            property: "price",
                            value: curr_data.price,
                        })
                    }
                    if (curr_data["1d"] && curr_data["1d"].volume != cached_val.volume) {
                        updateMessage.changeList.push({
                            property: "volume",
                            value: curr_data["1d"].volume,
                        })
                    }
                    if (curr_data["1d"] && curr_data["1d"].price_change != cached_val.change) {
                        updateMessage.changeList.push({
                            property: "change",
                            value: curr_data["1d"].price_change,
                        })
                    }

                    if (updateMessage.changeList.length > 0) {
                        // save refreshed data to redis
                        cacheData(redis_cache, curr_data);

                        // publish message
                        console.log("Published %s to %s", updateMessage, 'currency_info_change');
                        redis_pub_sub.publish('currency_info_change', JSON.stringify(updateMessage));
                    }
                } else {
                    cacheData(redis_cache, curr_data);
                }
            }
        }
    });

    function cacheData(redis_cache, curr_data) {
        if (curr_data.status === "inactive") {
            redis_cache.set(curr_data["name"], JSON.stringify({
                name: curr_data["name"],
                price: 'Unknown',
                volume: 'Unknown',
                change: 'Unknown',
            }));
        } else {
            redis_cache.set(curr_data["name"], JSON.stringify({
                name: curr_data["name"],
                price: curr_data.price,
                volume: curr_data["1d"].volume,
                change: curr_data["1d"].price_change,
            }));
        }
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
