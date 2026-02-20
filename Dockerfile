FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3777
EXPOSE 3777
CMD ["npm", "start"]
