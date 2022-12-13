# ----------------------------
# Multi-stage build 1: Angular
# ----------------------------
FROM node:alpine as builder

# Create a working directory
RUN mkdir /app
WORKDIR /app

# Copy app dependencies
COPY ./package.json ./package-lock.json /app/

# Install angular
RUN npm install --legacy-peer-deps

# Copy app files
COPY . /app

# Allow nginx to access static assets
RUN chmod -R 755 /app/src/assets

# Build app
RUN npm run build -- --output-path=./dist/out

# ---------------------------------
# Multi-stage build 2: nginx Server
# ---------------------------------
FROM nginx

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy output directory from builder to nginx image
COPY --from=builder /app/dist/out /usr/share/nginx/html

# Copy nginx configuration file
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
