# Build local
On development phase, it is recommended to build without docker.
## Requirements
1. Install Rabbitmq, amqplib on PHP: https://www.notion.so/truep/Introduction-5290448181404f67807ce5271f6c8d1b
2. NodeJS: https://nodejs.org/en/download/
3. Run: npm install
4. PM2: https://pm2.keymetrics.io/docs/usage/quick-start/

# How to build with docker
```
docker compose -f docker-compose.yml -f dc.overlay.yml up -d --force-recreate --build
```

# Connection test
localhost:3000/ping
