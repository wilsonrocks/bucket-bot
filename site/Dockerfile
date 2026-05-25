FROM node:24-alpine

WORKDIR /app

COPY .output .
COPY ca.pem ca.pem
ENV NODE_EXTRA_CA_CERTS=/app/ca.pem

EXPOSE 3000

CMD ["node", "server/index.mjs"]
