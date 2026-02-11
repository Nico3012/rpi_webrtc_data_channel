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

	// Walk through the directory tree
	err := filepath.WalkDir(root, func(fullPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Compute the relative path under root
		rel, err := filepath.Rel(root, fullPath)
		if err != nil {
			return err
		}

		// Normalize to slash-separated URL path
		urlPath := "/" + filepath.ToSlash(rel)

		// Handle root special case
		if urlPath == "/." {
			urlPath = "/"
		}

		if d.IsDir() {
			// Add directory paths: without and with trailing slash
			routes = append(routes, urlPath)
			if urlPath != "/" {
				routes = append(routes, urlPath+"/")
			}

			// If index.html exists and flag is true, include it
			if includeIndexHtml {
				indexFile := filepath.Join(fullPath, "index.html")
				if _, statErr := os.Stat(indexFile); statErr == nil {
					routes = append(routes, path.Join(urlPath, "index.html"))
				}
			}
		} else {
			// It's a file: skip index.html here to avoid duplicates
			if filepath.Base(fullPath) == "index.html" {
				return nil
			}
			// Include other files
			routes = append(routes, urlPath)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return routes, nil
}
