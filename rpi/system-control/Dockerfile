# if docker.io is very slow, use google mirror: docker pull mirror.gcr.io/library/golang:1-alpine
FROM golang:1-alpine

# install dependencies: util-linux provides nsenter to run host-level systemctl commands
RUN apk update && apk add util-linux

WORKDIR /app

COPY . .

RUN go install .

CMD [ "system-control" ]
