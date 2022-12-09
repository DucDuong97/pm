
FROM node:16-alpine

ARG ENV

# Create and move to workdir
WORKDIR /home/node/worker-mngt

COPY ./package.json ./

RUN npm install && mkdir logs

RUN npm install pm2 -g

COPY ./src/ ./src/
ADD ./cert/ ./cert/

EXPOSE 3000

CMD ["node", "src/server.js"]
