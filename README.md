
On development phase, it is recommended to build without docker.

# How to build
1. In docker-compose.yml on line 20, replace trueroot with actual trueroot on server.
2. docker-compose up --build

# Connection test
localhost:3000/url
Worker test

# Worker test
pm2 start workers/work.queue.js engineer test.worker
