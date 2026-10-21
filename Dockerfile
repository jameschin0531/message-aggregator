# One image for the API (which also serves the inbox) and the worker. The command picks the role.
FROM node:22-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production WEB_DIST=/app/web
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY --from=web /web/dist /app/web
USER node
EXPOSE 3000
CMD ["npm", "start"]
