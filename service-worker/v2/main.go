package main

import (
	"fmt"
	"test/routing"
)

func main() {
	fmt.Println(routing.ListRoutes("../public", false))
}
