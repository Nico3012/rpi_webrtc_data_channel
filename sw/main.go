package main

import (
	"bytes"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"
)

// Entry represents a virtual file or directory.
type Entry struct {
	Name     string    // base name of file or directory
	Data     []byte    // file content (nil for directory)
	ModTime  time.Time // modification time
	Children []*Entry  // child entries (nil for file)
}

// VirtualFS implements fs.FS backed by a tree of Entry nodes.
type VirtualFS struct {
	Root *Entry
}

// Open traverses the virtual tree according to the requested path.
func (vfs *VirtualFS) Open(name string) (fs.File, error) {
	// Clean path and strip leading slash
	clean := path.Clean(strings.TrimPrefix(name, "/"))
	// Split into segments, ignoring empty and "." segments
	var parts []string
	if clean != "." {
		parts = filterStrings(strings.Split(clean, "/"))
	}

	// Start at root
	node := vfs.Root

	// Traverse path segments
	for _, part := range parts {
		if node.Children == nil {
			return nil, fs.ErrNotExist
		}
		found := false
		for _, child := range node.Children {
			if child.Name == part {
				node = child
				found = true
				break
			}
		}
		if !found {
			return nil, fs.ErrNotExist
		}
	}

	// File or directory?
	if node.Children == nil {
		// File
		return &virtualFile{info: nodeFileInfo{entry: node}, reader: bytes.NewReader(node.Data)}, nil
	}
	// Directory
	return &virtualDir{info: nodeFileInfo{entry: node}, children: node.Children}, nil
}

// filterStrings removes empty and "." segments
func filterStrings(ss []string) []string {
	out := make([]string, 0, len(ss))
	for _, s := range ss {
		if s == "" || s == "." {
			continue
		}
		out = append(out, s)
	}
	return out
}

// virtualFile implements fs.File for a file.
type virtualFile struct {
	reader *bytes.Reader
	info   nodeFileInfo
}

func (f *virtualFile) Read(b []byte) (int, error) { return f.reader.Read(b) }
func (f *virtualFile) Close() error               { return nil }
func (f *virtualFile) Stat() (fs.FileInfo, error) { return f.info, nil }

// virtualDir implements fs.ReadDirFile for a directory.
type virtualDir struct {
	info     nodeFileInfo
	children []*Entry
	pos      int
}

func (d *virtualDir) Read([]byte) (int, error)   { return 0, fs.ErrInvalid }
func (d *virtualDir) Close() error               { return nil }
func (d *virtualDir) Stat() (fs.FileInfo, error) { return d.info, nil }
func (d *virtualDir) ReadDir(n int) ([]fs.DirEntry, error) {
	if n > len(d.children)-d.pos || n <= 0 {
		n = len(d.children) - d.pos
	}
	slice := make([]fs.DirEntry, n)
	for i := range slice {
		slice[i] = dirEntry{info: nodeFileInfo{entry: d.children[d.pos+i]}}
	}
	d.pos += n
	return slice, nil
}

// nodeFileInfo implements fs.FileInfo for an Entry.
type nodeFileInfo struct {
	entry *Entry
}

func (fi nodeFileInfo) Name() string { return fi.entry.Name }
func (fi nodeFileInfo) Size() int64  { return int64(len(fi.entry.Data)) }
func (fi nodeFileInfo) Mode() fs.FileMode {
	if fi.entry.Children != nil {
		return fs.ModeDir | 0555
	}
	return 0444
}
func (fi nodeFileInfo) ModTime() time.Time { return fi.entry.ModTime }
func (fi nodeFileInfo) IsDir() bool        { return fi.entry.Children != nil }
func (fi nodeFileInfo) Sys() any           { return nil }

// dirEntry implements fs.DirEntry for an Entry.
type dirEntry struct {
	info fs.FileInfo
}

func (de dirEntry) Name() string               { return de.info.Name() }
func (de dirEntry) IsDir() bool                { return de.info.IsDir() }
func (de dirEntry) Type() fs.FileMode          { return de.info.Mode().Type() }
func (de dirEntry) Info() (fs.FileInfo, error) { return de.info, nil }

func main() {
	// Build virtual FS tree
	root := &Entry{Name: "", ModTime: time.Now(), Children: []*Entry{
		{Name: "hello.txt", Data: []byte("Hello, world!\n"), ModTime: time.Now()},
		{Name: "docs", ModTime: time.Now(), Children: []*Entry{
			{Name: "readme.txt", Data: []byte("This is the README."), ModTime: time.Now()},
		}},
		{Name: "index.html", Data: []byte("<h1>Hallo Welt!</h1>\n"), ModTime: time.Now()},
	}}

	vfs := &VirtualFS{Root: root}
	http.Handle("/", http.FileServer(http.FS(vfs)))
	http.ListenAndServe(":8080", nil)
}
