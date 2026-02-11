package routing

import (
	"io/fs"
	"os"
	"path"
	"path/filepath"
)

// ListRoutes scans the given directory and returns all significant URL paths
// handled by a static routing server. It includes:
//   - For every directory: /dir and /dir/
//   - For every file: /dir/file.ext
//
// Optionally, if includeIndexHtml is true, it includes /dir/index.html
// when the file exists; otherwise, index.html files are skipped.
func ListRoutes(root string, includeIndexHtml bool) ([]string, error) {
	routes := []string{}

	err := filepath.WalkDir(root, func(fullPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(root, fullPath)
		if err != nil {
			return err
		}

		urlPath := "/" + filepath.ToSlash(rel)
		if urlPath == "/." {
			urlPath = "/"
		}

		if d.IsDir() {
			routes = append(routes, urlPath)
			if urlPath != "/" {
				routes = append(routes, urlPath+"/")
			}

			if includeIndexHtml {
				indexFile := filepath.Join(fullPath, "index.html")
				if _, statErr := os.Stat(indexFile); statErr == nil {
					routes = append(routes, path.Join(urlPath, "index.html"))
				}
			}
			return nil
		}

		if filepath.Base(fullPath) == "index.html" {
			return nil
		}
		routes = append(routes, urlPath)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return routes, nil
}
