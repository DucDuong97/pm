FROM node:18-slim

# Create and move to workdir
WORKDIR /home/node

# Copy package.json
ADD . .

# Install environment
RUN npm install pm2 -g && npm install
RUN apt update && apt install software-properties-common ca-certificates lsb-release apt-transport-https -y && apt install php7.4 -y
# Expose ports needed
EXPOSE 3000

# Start application
CMD ["node", "server.js"]