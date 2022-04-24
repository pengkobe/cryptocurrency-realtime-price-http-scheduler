#制定node镜像的版本
FROM node:14.16.1
#声明作者
MAINTAINER yipeng
#移动当前目录下面的文件到app目录下
ADD . /app/
#进入到app目录下面，类似cd
WORKDIR /app
#安装依赖
RUN npm install
#对外暴露的端口
EXPOSE 7007

# 环境变量设置
#  redis://default:pwd@127.0.0.1:6379/10
ENV redis_pub_sub_url
# redis://default:pwd@127.0.0.1:6379/11
ENV redis_cache_url 
# you can get it from:  https://p.nomics.com/cryptocurrency-bitcoin-api
ENV nomic_api_key 
#程序启动脚本
CMD ["npm", "start"]