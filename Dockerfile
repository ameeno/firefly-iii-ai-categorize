FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json", "./"]
RUN npm ci --production
COPY . .
CMD ["node", "index.js"]
