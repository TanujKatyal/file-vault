package internal

import (
    "time"
)

type User struct {
    ID              uint      `gorm:"primaryKey" json:"id"`
    Username        string    `gorm:"unique;not null" json:"username"`
    Email           string    `gorm:"unique;not null" json:"email"`
    Password        string    `gorm:"not null" json:"-"`
    Role            string    `gorm:"default:user" json:"role"`
    QuotaUsed       int64     `gorm:"default:0" json:"quota_used"`
    QuotaMax        int64     `gorm:"default:10485760" json:"quota_max"`
    StorageSaved    int64     `gorm:"default:0" json:"storage_saved"`
    RateLimitCalls  int       `gorm:"default:2" json:"rate_limit_calls"`
    CreatedAt       time.Time `json:"created_at"`
}

type DataBlock struct {
    ID       uint   `gorm:"primaryKey" json:"id"`
    Hash     string `gorm:"unique;not null;index" json:"hash"`
    Data     []byte `json:"-"`
    Size     int64  `gorm:"not null" json:"size"`
    RefCount int    `gorm:"default:1" json:"ref_count"`
    CreatedAt time.Time `json:"created_at"`
}

type TrieNode struct {
    ID       uint       `gorm:"primaryKey" json:"id"`
    Name     string     `gorm:"not null" json:"name"`
    Path     string     `gorm:"not null;index" json:"path"`
    ParentID *uint      `json:"parent_id,omitempty"`
    Parent   *TrieNode  `json:"parent,omitempty"`
    OwnerID  uint       `gorm:"not null" json:"owner_id"`
    Owner    User       `json:"owner"`
    NodeType string     `gorm:"not null" json:"node_type"` // "file", "directory", "symlink"
    IsPublic bool       `gorm:"default:false" json:"is_public"`
    CreatedAt time.Time `json:"created_at"`
}

type FileNode struct {
    ID            uint      `gorm:"primaryKey" json:"id"`
    TrieNodeID    uint      `gorm:"not null" json:"trie_node_id"`
    TrieNode      TrieNode  `json:"trie_node"`
    OriginalName  string    `gorm:"not null" json:"original_name"`
    Hash          string    `gorm:"not null;index" json:"hash"`
    Size          int64     `gorm:"not null" json:"size"`
    MimeType      string    `gorm:"not null" json:"mime_type"`
    ActualMimeType string   `gorm:"not null" json:"actual_mime_type"`
    DataBlockID   uint      `gorm:"not null" json:"data_block_id"`
    DataBlock     DataBlock `json:"data_block"`
    RefCount      int       `gorm:"default:1" json:"ref_count"`
    Downloads     int       `gorm:"default:0" json:"downloads"`
    Tags          string    `json:"tags"`
    IsDeduped     bool      `gorm:"default:false" json:"is_deduped"`
    CreatedAt     time.Time `json:"created_at"`
}

type DirNode struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    TrieNodeID uint      `gorm:"not null" json:"trie_node_id"`
    TrieNode   TrieNode  `json:"trie_node"`
    CreatedAt  time.Time `json:"created_at"`
}

type SymLinkNode struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    TrieNodeID uint      `gorm:"not null" json:"trie_node_id"`
    TrieNode   TrieNode  `json:"trie_node"`
    TargetPath string    `gorm:"not null" json:"target_path"`
    CreatedAt  time.Time `json:"created_at"`
}

type Share struct {
    ID        uint       `gorm:"primaryKey" json:"id"`
    FileNodeID uint      `gorm:"not null" json:"file_node_id"`
    FileNode  FileNode   `json:"file_node"`
    Token     string     `gorm:"unique;not null" json:"token"`
    Password  string     `json:"-"`
    ExpiresAt *time.Time `json:"expires_at"`
    Downloads int        `gorm:"default:0" json:"downloads"`
    CreatedAt time.Time  `json:"created_at"`
}

type AuditLog struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    UserID     uint      `gorm:"not null" json:"user_id"`
    User       User      `json:"user"`
    Action     string    `gorm:"not null" json:"action"`
    TrieNodeID *uint     `json:"trie_node_id,omitempty"`
    Details    string    `json:"details"`
    IPAddress  string    `json:"ip_address"`
    CreatedAt  time.Time `json:"created_at"`
}
