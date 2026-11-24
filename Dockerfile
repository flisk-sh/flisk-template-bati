# A real create-bati app (React + Hono, no database): the scaffolder runs at build time.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
WORKDIR /work
RUN npm create bati@0.0.343 app -- --react --hono --skip-git
WORKDIR /work/app
RUN npm install && npm run build
# The generated production server reads PORT and binds all interfaces.
ENV NODE_ENV=production
RUN chown -R node:node .
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD nc -z 127.0.0.1 ${PORT:-3000} || exit 1
CMD ["npm", "run", "preview"]
