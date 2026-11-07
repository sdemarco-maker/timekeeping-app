FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install && npm run build
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
