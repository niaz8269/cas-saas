# CAS ERP — API runtime (dev). PHP pinned to 8.3 per ADR-0001.
FROM php:8.3-fpm-alpine

RUN apk add --no-cache icu-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev libwebp-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install \
        bcmath \
        gd \
        intl \
        opcache \
        pcntl \
        pdo_mysql \
        zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
