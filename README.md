# cryptocurrency-realtime-price-http-scheduler
setup timer to load data from nomics

## Get Start

```bash
git clone https://github.com/pengkobe/cryptocurrency-realtime-price-http-scheduler
cd cryptocurrency-realtime-price-http-scheduler
npm install

# set redis urls and nomic token Manually in schedule.js or you can config your env variables
vim schedule.js
# const redis_pub_sub = new Redis(process.env.redis_pub_sub_url);
# const redis_cache = new Redis(process.env.redis_cache_url);
# const NOMIC_API_KEY = process.env.nomic_api_key;

node index.js
```

## Deploy with Docker

- build on you own
```bash
docker build -t cryptocurrency-realtime-price-http-scheduler .
# redis url format: redis://default:your_pwd@127.0.0.1:6379/11
docker run --env redis_pub_sub_url={redis_pub_sub_url} \
--env redis_cache_url={redis_cache_url} \
--env nomic_api_key={nomic_api_key} \
cryptocurrency-realtime-price-http-scheduler
```

- or you can pull from docker hub

```bash
docker pull pengkobe/cryptocurrency-realtime-price-http-scheduler
docker run --env redis_pub_sub_url={redis_pub_sub_url} \
--env redis_cache_url={redis_cache_url} \
--env nomic_api_key={nomic_api_key} \
cryptocurrency-realtime-price-http-scheduler
```

## Repo Structure

```
cryptocurrency-realtime-price-http-scheduler/
 ├── index.js (init koa server)
 ├── schedule.js (schedule job to load data from nomic)
 ├── Dockerfile (docker file)
 ├── .dockerignore (docker file)
 ├── package.json
```

## License
MIT@[yipeng.info](https://yipeng.info)