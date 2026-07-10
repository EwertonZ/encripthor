FROM node:20-alpine
WORKDIR /app

# Prisma generate precisa de DATABASE_URL mesmo em build
ENV DATABASE_URL="postgresql://encripthor:encripthor123@postgres:5432/encripthor"

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
