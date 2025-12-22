package utils

import (
	"os"
	"path/filepath"
)

// PathExists 检查路径是否存在
func PathExists(path string) bool {
	_, err := os.Stat(path)
	if err == nil {
		return true
	}
	if os.IsNotExist(err) {
		return false
	}
	return false
}

// EnsureDir 确保目录存在
func EnsureDir(path string) error {
	dir := filepath.Dir(path)
	if !PathExists(dir) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
}

// GetExecutableDir 获取可执行文件所在目录
func GetExecutableDir() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	return filepath.Dir(exe)
}
