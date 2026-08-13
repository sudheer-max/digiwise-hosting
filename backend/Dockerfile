FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/* \
    && curl -LO "https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl" \
    && chmod +x kubectl && mv kubectl /usr/local/bin/kubectl
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
