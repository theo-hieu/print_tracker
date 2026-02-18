FROM node:18-bullseye

WORKDIR /usr/src/app

COPY package*.json ./

# Install all dependencies (including devDependencies for tsc)
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript to dist/
RUN npm run build

ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && npm start"]
