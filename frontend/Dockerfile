# Stage 1: Build the React app
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Set VITE_API_URL to / so that the app uses relative paths in production.
# This works with the Nginx proxy configuration in Stage 2.
ENV VITE_API_URL=/
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a custom Nginx configuration to serve the frontend and proxy API requests
RUN printf 'server {\n\
    listen 80;\n\
    \n\
    # Serve static files\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    # Proxy API requests to the backend service\n\
    location /api {\n\
        proxy_pass http://backend:5000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_cache_bypass $http_upgrade;\n\
        \n\
        # Increase timeouts for long-running LLM requests\n\
        proxy_read_timeout 300s;\n\
        proxy_connect_timeout 300s;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
