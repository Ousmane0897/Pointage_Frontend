# Step 1: Build the Angular app
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production


# Step 2: Serve the app using Nginx
FROM nginx:alpine

# Copy built Angular app from builder image
COPY --from=builder /app/dist/pointage-agents /usr/share/nginx/html

# Replace default Nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]