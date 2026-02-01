# if docker.io is very slow, use google mirror: docker pull mirror.gcr.io/library/golang:1-alpine
FROM golang:1-alpine

# install dependencies
RUN apk update && apk add iproute2 hostapd dnsmasq

WORKDIR /app

COPY . .

RUN go install .

CMD [ "wifi-ap" ]
