FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/build ./build
# Provide SOFYA_API_KEY at runtime: docker run -e SOFYA_API_KEY=ay_live_... sofya-mcp
ENTRYPOINT ["node", "build/index.js"]
