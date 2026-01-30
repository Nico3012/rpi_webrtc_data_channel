FROM golang:1

RUN apt update && apt install -y iproute2 hostapd dnsmasq

WORKDIR /app

COPY . .

RUN go install .

CMD [ "wifi-ap" ]
