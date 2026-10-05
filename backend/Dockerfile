# syntax=docker/dockerfile:1
FROM dunglas/frankenphp:1-php8.3-bookworm AS base
RUN install-php-extensions pdo_pgsql redis pcntl intl zip opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app

# dev: dev dependencies included; used for tests and the toolbox
FROM base AS dev
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-scripts --no-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize && touch .env

# prod: what compose runs
FROM base AS prod
# Plain HTTP on :8000; TLS is terminated by whatever sits in front (nginx here, the platform in deploy).
ENV APP_ENV=production APP_DEBUG=false SERVER_NAME=:8000 CADDY_GLOBAL_OPTIONS="auto_https off"
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-dev --no-scripts --no-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative \
 && chown -R www-data:www-data storage bootstrap/cache /data/caddy /config/caddy
USER www-data
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:8000/up || exit 1
