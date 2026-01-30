FROM golang:1-alpine

# install dependencies
RUN apk update && apk add iproute2 hostapd dnsmasq

WORKDIR /app

COPY . .

RUN go install .

CMD [ "wifi-ap" ]
