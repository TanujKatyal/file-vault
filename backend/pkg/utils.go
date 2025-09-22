package utils

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "mime"
    "net/http"
    "path/filepath"
    "strings"
)

// CalculateHash computes SHA-256 hash of data
func CalculateHash(data []byte) string {
    hash := sha256.Sum256(data)
    return fmt.Sprintf("%x", hash)
}

// ValidateMimeType checks declared vs actual MIME type
func ValidateMimeType(data []byte, filename, declaredMime string) (string, bool) {
    actualMime := http.DetectContentType(data)
    extMime := mime.TypeByExtension(filepath.Ext(filename))
    
    declaredMime = strings.ToLower(strings.TrimSpace(declaredMime))
    actualMime = strings.ToLower(strings.TrimSpace(actualMime))
    
    // Check compatibility
    if declaredMime == actualMime || declaredMime == extMime {
        return actualMime, true
    }
    
    // Check main type compatibility
    declaredMain := strings.Split(declaredMime, "/")[0]
    actualMain := strings.Split(actualMime, "/")[0]
    
    return actualMime, declaredMain == actualMain
}

// GenerateToken creates secure random token for sharing
func GenerateToken() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}

// ValidatePath ensures path doesn't contain reserved characters
func ValidatePath(path string) bool {
    parts := strings.Split(strings.Trim(path, "/"), "/")
    for _, part := range parts {
        if part == "." || part == ".." || part == " " || part == "" {
            return false
        }
    }
    return true
}

// FormatFileSize converts bytes to human readable format
func FormatFileSize(bytes int64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := int64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
