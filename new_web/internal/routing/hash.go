package routing

import (
	"hash/fnv"
	"io"
	"os"
	"path/filepath"
	"sort"
)

// HashDirectory efficiently computes a unique hash for the contents and structure of a directory.
func HashDirectory(root string) (uint64, error) {
	hasher := fnv.New64a()
	var paths []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		paths = append(paths, path)
		return nil
	})
	if err != nil {
		return 0, err
	}

	sort.Strings(paths)

	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			return 0, err
		}
		hasher.Write([]byte(path))
		hasher.Write([]byte(info.Mode().String()))

		if info.Mode().IsRegular() {
			f, err := os.Open(path)
			if err != nil {
				return 0, err
			}
			defer f.Close()

			buf := make([]byte, 32*1024)
			for {
				n, err := f.Read(buf)
				if n > 0 {
					hasher.Write(buf[:n])
				}
				if err != nil {
					if err == io.EOF {
						break
					}
					return 0, err
				}
			}
		}
	}

	return hasher.Sum64(), nil
}
