
FROM php:7.4-cli

RUN apt-get update -qq && apt-get install -qqy \
  sudo \
  apt-utils \
  wget curl \
  git \
  jq \
  acl \
  openssl \
  unzip \
  libzip-dev \
  cron \
  libmemcached-dev libldap2-dev \
  libfreetype6-dev libjpeg-dev libwebp-dev libjpeg62-turbo-dev libpng-dev libxpm-dev libapache2-mod-xsendfile \
  imagemagick \
  apt-transport-https lsb-release ca-certificates \
  software-properties-common \
  libbz2-dev \
  libmagickwand-dev \
  libc-client-dev libkrb5-dev \
  && echo "Asia/Ho_Chi_Minh" > /etc/timezone && dpkg-reconfigure -f noninteractive tzdata \
  && echo 'alias ll="ls -lah --color=auto"' >> /etc/bash.bashrc

RUN apt-get install -y libxml2-dev && pear install -a SOAP-0.13.0

RUN pecl install redis \
  && pecl install imagick \
  && pecl install memcached \
  && docker-php-ext-configure gd \
  --with-freetype --with-jpeg --with-xpm --with-webp \
  && docker-php-ext-configure imap --with-kerberos --with-imap-ssl \
  && docker-php-ext-install \
  opcache \
  iconv \
  pdo \
  pdo_mysql \
  zip \
  gd \
  exif \
  bz2 \
  ldap \
  fileinfo \
  bcmath \
  xml \
  imap \
  && docker-php-ext-enable \
  redis \
  imagick \
  gd \
  memcached \
  opcache

# Install APCu and APC backward compatibility
RUN pecl install apcu \
&& pecl install apcu_bc-1.0.5 \
&& docker-php-ext-enable apcu --ini-name 10-docker-php-ext-apcu.ini \
&& docker-php-ext-enable apc --ini-name 20-docker-php-ext-apc.ini

RUN apt-get update && apt-get install -y nodejs npm

# Create and move to workdir
WORKDIR /home/node/worker-mngt

RUN mkdir logs

ADD ./package.json .

# Install environment
RUN npm install pm2 -g && npm install

# Expose ports needed
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
