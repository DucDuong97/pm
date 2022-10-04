# Build local
On development phase, it is recommended to build without docker.
## Requirements
1. Install Rabbitmq, amqplib on PHP: https://www.notion.so/truep/Introduction-5290448181404f67807ce5271f6c8d1b
2. NodeJS: https://nodejs.org/en/download/
3. Run: npm install
4. PM2: https://pm2.keymetrics.io/docs/usage/quick-start/

# How to build with docker
1. In docker-compose.yml on line 20, replace trueroot with actual trueroot on server.
2. docker-compose up --build

# Connection test
localhost:3000/url
