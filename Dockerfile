FROM node:14.16.1
MAINTAINER yipeng

ADD . /app/
WORKDIR /app

RUN npm install
EXPOSE 7007

#  redis://default:pwd@127.0.0.1:6379/10
ENV redis_pub_sub_url empty
# redis://default:pwd@127.0.0.1:6379/11
ENV redis_cache_url empty
# you can get it from:  https://p.nomics.com/cryptocurrency-bitcoin-api
ENV nomic_api_key empty

CMD ["npm", "start"]