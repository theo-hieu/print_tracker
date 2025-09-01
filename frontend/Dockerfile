FROM node:18-bullseye
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV VITE_API_BASE=http://backend:5000/api
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","3000"]
