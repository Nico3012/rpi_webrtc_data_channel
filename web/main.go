package main

import (
	"log"
	"net/http"
)

func main() {
	log.Fatalln(http.ListenAndServe(":80", http.FileServer(http.Dir("public"))))
}
