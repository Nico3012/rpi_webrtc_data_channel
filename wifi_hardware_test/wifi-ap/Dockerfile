FROM debian:latest

RUN apt update && apt install -y hostapd dnsmasq

COPY hostapd.conf /etc/hostapd/hostapd.conf
COPY dnsmasq.conf /etc/dnsmasq.conf

CMD ["/bin/bash", "-c", "hostapd /etc/hostapd/hostapd.conf & dnsmasq --conf-file=/etc/dnsmasq.conf --no-daemon"]
