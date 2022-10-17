
FROM node:16-alpine

# Create and move to workdir
WORKDIR /home/node/worker-mngt

COPY ./package.json ./

RUN npm install && mkdir logs

RUN npm install pm2 -g

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
