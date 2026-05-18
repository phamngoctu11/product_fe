# STAGE 1: Build ứng dụng Angular
FROM node:22-alpine AS build
WORKDIR /app

# Copy package.json và cài đặt thư viện
COPY package*.json ./
RUN apk add --no-cache python3 make g++ libc6-compat && \
    npm install --legacy-peer-deps

# Copy toàn bộ mã nguồn và build ra production
COPY . .
RUN NODE_OPTIONS="--max_old_space_size=4096" npm run build -- --configuration=production

# STAGE 2: Triển khai lên Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy thư mục dist vừa build sang Nginx (Angular 17+ thường lưu ở thư mục browser)
COPY --from=build /app/dist/fe_product/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
