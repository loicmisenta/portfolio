FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV HOST=0.0.0.0 PORT=3001 DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/dist/client ./dist/client
COPY --chown=node:node server.mjs ./
COPY --chown=node:node content ./content
COPY --chown=node:node scripts/setup.mjs ./scripts/setup.mjs
RUN mkdir data && chown node:node data
USER node
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "server.mjs"]
