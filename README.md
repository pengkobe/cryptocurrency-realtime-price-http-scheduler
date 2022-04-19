# cryptocurrency-realtime-price-scheduler-scheduler
setup timer to load data from cryptonator


## Support Deploy with Docker

```bash
docker build -t cryptocurrency-realtime-price-scheduler-scheduler .
# showcase: redis://default:your_pwd@127.0.0.1:6379/11
docker run  --env redis_pub_sub_url={redis_pub_sub_url} --env redis_cache_url={redis_cache_url} cryptocurrency-realtime-price-http-scheduler
```

## License
MIT@[yipeng.info](https://yipeng.info)