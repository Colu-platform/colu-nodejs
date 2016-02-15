FROM node:latest

RUN apt-get -y update

RUN npm i -g colu

# For mainnet, change to 'ENV COLU_SDK_NETWORK mainnet' and add your API key
ENV COLU_SDK_NETWORK testnet
ENV COLU_SDK_API_KEY your_api_key_here
ENV COLU_SDK_RPC_SERVER_HTTP_PORT 80
ENV COLU_SDK_RPC_SERVER_HOST 0.0.0.0

CMD node $(which colu)