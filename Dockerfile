FROM node:latest

# update OS
RUN apt-get -y update

# install redis
RUN wget http://download.redis.io/redis-stable.tar.gz
RUN tar xvzf redis-stable.tar.gz
RUN cd redis-stable && make
RUN cp redis-stable/src/redis-server /usr/local/bin/ 
RUN cp redis-stable/src/redis-cli /usr/local/bin/ 
RUN mkdir -p /etc/redis
RUN mkdir -p /var/redis
RUN mkdir -p /var/redis/6379
RUN cp redis-stable/utils/redis_init_script /etc/init.d/redis_6379
ADD redis.conf /tmp/6379.conf
RUN cp /tmp/6379.conf /etc/redis/6379.conf
RUN update-rc.d redis_6379 defaults
RUN chmod -R a+w /var/redis/
RUN chmod -R a+w /var/run/
RUN chmod -R a+w /var/log/

# install colu
RUN npm i -g colu

# in mainnet, change the network (testnet -> mainnet) and add your API key (https://www.colu.co/getapikey)
ENV COLU_SDK_NETWORK testnet
ENV COLU_SDK_API_KEY your_api_key_here
ENV COLU_SDK_RPC_SERVER_HTTP_PORT 80
ENV COLU_SDK_RPC_SERVER_HOST 0.0.0.0
ENV COLU_SDK_REDIS_PORT 6379

# start redis and colu server
CMD redis-server & node $(which colu)