FROM node:lts 

WORKDIR /frontend

COPY package.json package-lock.json .
RUN npm install

COPY . .

ENTRYPOINT ["./docker-entrypoint.sh"]