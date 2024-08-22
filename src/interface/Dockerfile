# ----------------------------
# Multi-stage build 1: Angular
# ----------------------------
FROM node:alpine as builder

# Create a working directory
RUN mkdir -p /src/interface
WORKDIR /src/interface

# Copy app dependencies
COPY ./package.json ./package-lock.json /src/interface/

# Install angular
RUN npm install

# Copy app files
COPY . /src/interface

# Allow nginx to access static assets
RUN chmod -R 755 /src/interface/src/assets

# Build app
RUN npm run build -- --configuration production --output-path=./dist/out

# ---------------------------------
# Multi-stage build 2: nginx Server
# ---------------------------------
FROM nginx

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy output directory from builder to nginx image
COPY --from=builder /src/interface/dist/out /usr/share/nginx/html

# Copy nginx configuration files
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx/uwsgi_params /etc/nginx/uwsgi_params
