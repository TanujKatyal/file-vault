package internal

import (
    "crypto/sha256"
    "errors"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "path/filepath"
    "strings"
    
    "gorm.io/gorm"
)

// FileSystem - Your C++ FileSystem class
type FileSystem struct {
    DB   *gorm.DB
    Root *TrieNode
}

func NewFileSystem(db *gorm.DB, userID uint) *FileSystem {
    // Create or get root node for user
    var root TrieNode
    err := db.Where("name = ? AND owner_id = ? AND path = ?", "root", userID, "/").First(&root).Error
    if err != nil {
        root = TrieNode{
            Name:     "root",
            Path:     "/",
            OwnerID:  userID,
            NodeType: "directory",
        }
        db.Create(&root)
        
        // Create corresponding DirNode
        dirNode := &DirNode{TrieNodeID: root.ID}
        db.Create(dirNode)
    }
    
    return &FileSystem{DB: db, Root: &root}
}

// Split - Your C++ split function
func (fs *FileSystem) SplitPath(filePath string) []string {
    if filePath == "/" {
        return []string{}
    }
    
    path := strings.TrimPrefix(filePath, "/")
    if path == "" {
        return []string{}
    }
    
    parts := strings.Split(path, "/")
    
    // Validate reserved characters
    for _, part := range parts {
        if part == "." || part == ".." || part == " " || part == "" {
            return nil // Invalid path
        }
    }
    
    return parts
}

// Insert - Your C++ Trie insert function
func (fs *FileSystem) Insert(filePath string, isFile bool, userID uint) (*TrieNode, error) {
    pathParts := fs.SplitPath(filePath)
    if pathParts == nil {
        return nil, errors.New("invalid path: reserved characters not allowed")
    }
    
    currentNode := fs.Root
    currentPath := ""
    
    for i, part := range pathParts {
        currentPath = filepath.Join(currentPath, part)
        isLastPart := (i == len(pathParts)-1)
        
        // Check if node already exists
        var existingNode TrieNode
        err := fs.DB.Where("name = ? AND parent_id = ? AND owner_id = ?", 
            part, currentNode.ID, userID).First(&existingNode).Error
        
        if err == nil {
            // Node exists
            if isLastPart && isFile && existingNode.NodeType == "file" {
                return nil, errors.New("file already exists")
            }
            if !isLastPart && existingNode.NodeType == "file" {
                return nil, errors.New("cannot create file inside another file")
            }
            currentNode = &existingNode
            continue
        }
        
        // Create new node
        nodeType := "directory"
        if isLastPart && isFile {
            nodeType = "file"
        }
        
        newNode := &TrieNode{
            Name:     part,
            Path:     "/" + strings.TrimPrefix(currentPath, "/"),
            ParentID: &currentNode.ID,
            OwnerID:  userID,
            NodeType: nodeType,
        }
        
        if err := fs.DB.Create(newNode).Error; err != nil {
            return nil, err
        }
        
        // Create corresponding specialized node
        if nodeType == "file" {
            // Will be created later with actual file data
        } else {
            dirNode := &DirNode{TrieNodeID: newNode.ID}
            fs.DB.Create(dirNode)
        }
        
        currentNode = newNode
    }
    
    return currentNode, nil
}

// Search - Your C++ search function
func (fs *FileSystem) Search(filePath string, userID uint) (*TrieNode, error) {
    if filePath == "/" {
        return fs.Root, nil
    }
    
    pathParts := fs.SplitPath(filePath)
    if pathParts == nil {
        return nil, errors.New("invalid path")
    }
    
    var node TrieNode
    err := fs.DB.Where("path = ? AND owner_id = ?", filePath, userID).First(&node).Error
    return &node, err
}

// ListDirectory - Your C++ ls function
func (fs *FileSystem) ListDirectory(dirPath string, userID uint) ([]interface{}, error) {
    dirNode, err := fs.Search(dirPath, userID)
    if err != nil {
        return nil, err
    }
    
    if dirNode.NodeType == "file" {
        var fileNode FileNode
        fs.DB.Where("trie_node_id = ?", dirNode.ID).Preload("DataBlock").First(&fileNode)
        return []interface{}{fileNode}, nil
    }
    
    var children []TrieNode
    fs.DB.Where("parent_id = ? AND owner_id = ?", dirNode.ID, userID).Find(&children)
    
    var results []interface{}
    for _, child := range children {
        if child.NodeType == "file" {
            var fileNode FileNode
            fs.DB.Where("trie_node_id = ?", child.ID).Preload("DataBlock").First(&fileNode)
            results = append(results, fileNode)
        } else {
            var dirNode DirNode
            fs.DB.Where("trie_node_id = ?", child.ID).First(&dirNode)
            results = append(results, dirNode)
        }
    }
    
    return results, nil
}

// ProcessFileUpload - Enhanced with your deduplication logic
func (fs *FileSystem) ProcessFileUpload(userID uint, fileHeader *multipart.FileHeader, dirPath string) (*FileNode, error) {
    file, err := fileHeader.Open()
    if err != nil {
        return nil, err
    }
    defer file.Close()

    // Read file data
    data, err := io.ReadAll(file)
    if err != nil {
        return nil, err
    }

    // Check quota
    var user User
    if err := fs.DB.First(&user, userID).Error; err != nil {
        return nil, err
    }
    if user.QuotaUsed+int64(len(data)) > user.QuotaMax {
        return nil, errors.New("quota exceeded")
    }

    // Validate MIME type
    actualMime := http.DetectContentType(data)
    
    // Calculate SHA-256 hash (improved from your encrypt function)
    hash := fs.calculateHash(data)
    
    // Create file path
    fullPath := filepath.Join(dirPath, fileHeader.Filename)
    
    // Insert into Trie structure
    trieNode, err := fs.Insert(fullPath, true, userID)
    if err != nil {
        return nil, err
    }

    // Check for deduplication
    var existingBlock DataBlock
    isDeduped := false
    savedSpace := int64(0)
    
    if err := fs.DB.Where("hash = ?", hash).First(&existingBlock).Error; err == nil {
        // Deduplicated - increment ref count
        existingBlock.RefCount++
        fs.DB.Save(&existingBlock)
        
        isDeduped = true
        savedSpace = int64(len(data))
        
        // Update user savings
        user.StorageSaved += savedSpace
    } else {
        // New file - create data block
        existingBlock = DataBlock{
            Hash:     hash,
            Data:     data,
            Size:     int64(len(data)),
            RefCount: 1,
        }
        fs.DB.Create(&existingBlock)
        
        // Update user quota
        user.QuotaUsed += int64(len(data))
    }
    
    fs.DB.Save(&user)

    // Create FileNode (your C++ FileNode)
    fileNode := &FileNode{
        TrieNodeID:     trieNode.ID,
        OriginalName:   fileHeader.Filename,
        Hash:           hash,
        Size:           int64(len(data)),
        MimeType:       fileHeader.Header.Get("Content-Type"),
        ActualMimeType: actualMime,
        DataBlockID:    existingBlock.ID,
        RefCount:       1,
        IsDeduped:      isDeduped,
    }

    err = fs.DB.Create(fileNode).Error
    
    return fileNode, err
}

// DeleteFile - Your C++ deleteFile with reference counting
func (fs *FileSystem) DeleteFile(filePath string, userID uint) error {
    trieNode, err := fs.Search(filePath, userID)
    if err != nil {
        return err
    }
    
    if trieNode.NodeType != "file" {
        return errors.New("invalid file path")
    }
    
    var fileNode FileNode
    if err := fs.DB.Where("trie_node_id = ?", trieNode.ID).Preload("DataBlock").First(&fileNode).Error; err != nil {
        return err
    }
    
    // Decrement file reference count (your C++ logic)
    fileNode.RefCount--
    
    if fileNode.RefCount <= 0 {
        // Decrement data block reference count
        fileNode.DataBlock.RefCount--
        
        if fileNode.DataBlock.RefCount <= 0 {
            // Delete actual data block
            fs.DB.Delete(&fileNode.DataBlock)
        } else {
            fs.DB.Save(&fileNode.DataBlock)
        }
        
        // Delete file node and trie node
        fs.DB.Delete(&fileNode)
        fs.DB.Delete(trieNode)
        
        // Update user quota if not deduped
        if !fileNode.IsDeduped {
            var user User
            fs.DB.First(&user, userID)
            user.QuotaUsed -= fileNode.Size
            fs.DB.Save(&user)
        }
    } else {
        fs.DB.Save(&fileNode)
    }
    
    return nil
}

// CreateHardLink - Your C++ hardLink function
func (fs *FileSystem) CreateHardLink(srcFilePath, dstFilePath string, userID uint) error {
    // Find source file
    srcNode, err := fs.Search(srcFilePath, userID)
    if err != nil {
        return errors.New("source file not found")
    }
    
    if srcNode.NodeType != "file" {
        return errors.New("source is not a file")
    }
    
    var srcFileNode FileNode
    if err := fs.DB.Where("trie_node_id = ?", srcNode.ID).First(&srcFileNode).Error; err != nil {
        return err
    }
    
    // Create destination trie node
    dstNode, err := fs.Insert(dstFilePath, true, userID)
    if err != nil {
        return err
    }
    
    // Increment reference counts
    srcFileNode.RefCount++
    fs.DB.Save(&srcFileNode)
    
    var dataBlock DataBlock
    fs.DB.First(&dataBlock, srcFileNode.DataBlockID)
    dataBlock.RefCount++
    fs.DB.Save(&dataBlock)
    
    // Create new file node pointing to same data block
    hardLinkFileNode := &FileNode{
        TrieNodeID:     dstNode.ID,
        OriginalName:   srcFileNode.OriginalName,
        Hash:           srcFileNode.Hash,
        Size:           srcFileNode.Size,
        MimeType:       srcFileNode.MimeType,
        ActualMimeType: srcFileNode.ActualMimeType,
        DataBlockID:    srcFileNode.DataBlockID,
        RefCount:       1,
        IsDeduped:      true, // Hard links are always considered deduped
    }
    
    return fs.DB.Create(hardLinkFileNode).Error
}

// CreateSoftLink - Your C++ softLink function  
func (fs *FileSystem) CreateSoftLink(srcFilePath, dstFilePath string, userID uint) error {
    // Create destination trie node
    dstNode, err := fs.Insert(dstFilePath, false, userID) // symlink is not a file
    if err != nil {
        return err
    }
    
    // Update node type
    dstNode.NodeType = "symlink"
    fs.DB.Save(dstNode)
    
    // Create symlink node
    symLinkNode := &SymLinkNode{
        TrieNodeID: dstNode.ID,
        TargetPath: srcFilePath,
    }
    
    return fs.DB.Create(symLinkNode).Error
}

// GetDeduplicationStats returns deduplication statistics
func (fs *FileSystem) GetDeduplicationStats() map[string]interface{} {
    var totalFiles, totalBlocks int64
    var totalLogicalSize, totalPhysicalSize, totalSaved int64

    fs.DB.Model(&FileNode{}).Count(&totalFiles)
    fs.DB.Model(&DataBlock{}).Count(&totalBlocks)
    fs.DB.Model(&FileNode{}).Select("COALESCE(SUM(size), 0)").Scan(&totalLogicalSize)
    fs.DB.Model(&DataBlock{}).Select("COALESCE(SUM(size), 0)").Scan(&totalPhysicalSize)
    fs.DB.Model(&User{}).Select("COALESCE(SUM(storage_saved), 0)").Scan(&totalSaved)

    dedupRatio := float64(0)
    if totalLogicalSize > 0 {
        dedupRatio = float64(totalSaved) / float64(totalLogicalSize) * 100
    }

    return map[string]interface{}{
        "total_files":         totalFiles,
        "unique_blocks":       totalBlocks,
        "logical_size":        totalLogicalSize,
        "physical_size":       totalPhysicalSize,
        "space_saved":         totalSaved,
        "deduplication_ratio": dedupRatio,
        "efficiency":          fmt.Sprintf("%.2f%%", dedupRatio),
    }
}

// Helper functions
func (fs *FileSystem) calculateHash(data []byte) string {
    hash := sha256.Sum256(data)
    return fmt.Sprintf("%x", hash)
}
