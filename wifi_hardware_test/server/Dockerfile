FROM golang:1-alpine

WORKDIR /app

COPY . .

RUN go install .

CMD [ "server" ]
