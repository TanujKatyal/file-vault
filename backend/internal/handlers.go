package internal

import (
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "strconv"
    "time"
    
    "github.com/gorilla/mux"
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"
    
    "file-vault/pkg"
)

type App struct {
    DB         *gorm.DB
    JWTSecret  string
    FileSystem *FileSystem
}

func NewApp() *App {
    db := ConnectDB()
    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        jwtSecret = "default-secret-change-in-production"
    }
    
    app := &App{
        DB:        db,
        JWTSecret: jwtSecret,
    }
    return app
}

// Auth handlers
func (app *App) Register(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Username string `json:"username"`
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    
    user := &User{
        Username: req.Username,
        Email:    req.Email,
        Password: string(hashedPassword),
    }
    
    if err := app.DB.Create(user).Error; err != nil {
        http.Error(w, "User already exists", http.StatusConflict)
        return
    }
    
    token := app.generateJWT(user.ID)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "token": token,
        "user":  user,
    })
}

func (app *App) Login(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    
    json.NewDecoder(r.Body).Decode(&req)
    
    var user User
    if err := app.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    token := app.generateJWT(user.ID)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "token": token,
        "user":  user,
    })
}

// File handlers
func (app *App) UploadFile(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    fs := NewFileSystem(app.DB, userID)
    
    r.ParseMultipartForm(32 << 20) // 32MB
    
    files := r.MultipartForm.File["files"]
    dirPath := r.FormValue("directory")
    if dirPath == "" {
        dirPath = "/"
    }
    
    var uploadedFiles []FileNode
    var errors []string
    
    for _, fileHeader := range files {
        file, err := fs.ProcessFileUpload(userID, fileHeader, dirPath)
        if err != nil {
            errors = append(errors, fmt.Sprintf("%s: %s", fileHeader.Filename, err.Error()))
            continue
        }
        uploadedFiles = append(uploadedFiles, *file)
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "uploaded_files": uploadedFiles,
        "errors":        errors,
    })
}

func (app *App) GetFiles(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var files []FileNode
    query := app.DB.Where("trie_node_id IN (SELECT id FROM trie_nodes WHERE owner_id = ? OR is_public = ?)", userID, true)
    
    // Apply filters
    if name := r.URL.Query().Get("name"); name != "" {
        query = query.Where("original_name ILIKE ?", "%"+name+"%")
    }
    if mimeType := r.URL.Query().Get("mime_type"); mimeType != "" {
        query = query.Where("actual_mime_type LIKE ?", mimeType+"%")
    }
    
    query.Preload("TrieNode").Preload("DataBlock").Find(&files)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(files)
}

func (app *App) DownloadFile(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    fileID, _ := strconv.Atoi(vars["id"])
    userID := app.getUserID(r)
    
    var fileNode FileNode
    if err := app.DB.Preload("TrieNode").Preload("DataBlock").First(&fileNode, fileID).Error; err != nil {
        http.Error(w, "File not found", http.StatusNotFound)
        return
    }
    
    // Check permissions
    if fileNode.TrieNode.OwnerID != userID && !fileNode.TrieNode.IsPublic {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }
    
    // Increment download counter
    fileNode.Downloads++
    app.DB.Save(&fileNode)
    
    w.Header().Set("Content-Type", fileNode.ActualMimeType)
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileNode.OriginalName))
    w.Write(fileNode.DataBlock.Data)
}

func (app *App) DeleteFile(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    fileID, _ := strconv.Atoi(vars["id"])
    userID := app.getUserID(r)
    
    var fileNode FileNode
    if err := app.DB.Preload("TrieNode").First(&fileNode, fileID).Error; err != nil {
        http.Error(w, "File not found", http.StatusNotFound)
        return
    }
    
    if fileNode.TrieNode.OwnerID != userID {
        http.Error(w, "Only uploader can delete their files", http.StatusForbidden)
        return
    }
    
    fs := NewFileSystem(app.DB, userID)
    if err := fs.DeleteFile(fileNode.TrieNode.Path, userID); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "File deleted successfully"})
}

// Directory handlers
func (app *App) CreateDirectory(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var req struct {
        Path     string `json:"path"`
        IsPublic bool   `json:"is_public"`
    }
    
    json.NewDecoder(r.Body).Decode(&req)
    
    fs := NewFileSystem(app.DB, userID)
    trieNode, err := fs.Insert(req.Path, false, userID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if req.IsPublic {
        trieNode.IsPublic = true
        app.DB.Save(trieNode)
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(trieNode)
}

func (app *App) ListDirectory(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    dirPath := r.URL.Query().Get("path")
    if dirPath == "" {
        dirPath = "/"
    }
    
    fs := NewFileSystem(app.DB, userID)
    contents, err := fs.ListDirectory(dirPath, userID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(contents)
}

// Sharing handlers
func (app *App) CreateShare(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    fileID, _ := strconv.Atoi(vars["id"])
    
    var req struct {
        Password  string `json:"password,omitempty"`
        ExpiresIn int    `json:"expires_in,omitempty"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    token := utils.GenerateToken()
    share := &Share{
        FileNodeID: uint(fileID),
        Token:      token,
    }

    if req.Password != "" {
        hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        share.Password = string(hashedPassword)
    }

    if req.ExpiresIn > 0 {
        expiresAt := time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
        share.ExpiresAt = &expiresAt
    }

    app.DB.Create(share)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(share)
}

func (app *App) GetSharedFile(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    token := vars["token"]
    password := r.URL.Query().Get("password")
    
    var share Share
    if err := app.DB.Where("token = ?", token).Preload("FileNode.DataBlock").First(&share).Error; err != nil {
        http.Error(w, "Share not found or expired", http.StatusNotFound)
        return
    }
    
    // Check expiration
    if share.ExpiresAt != nil && time.Now().After(*share.ExpiresAt) {
        http.Error(w, "Share has expired", http.StatusGone)
        return
    }
    
    // Check password
    if share.Password != "" {
        if password == "" {
            http.Error(w, "Password required", http.StatusUnauthorized)
            return
        }
        if err := bcrypt.CompareHashAndPassword([]byte(share.Password), []byte(password)); err != nil {
            http.Error(w, "Invalid password", http.StatusUnauthorized)
            return
        }
    }
    
    // Increment share download counter
    share.Downloads++
    app.DB.Save(&share)
    
    // Serve file
    w.Header().Set("Content-Type", share.FileNode.ActualMimeType)
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", share.FileNode.OriginalName))
    w.Write(share.FileNode.DataBlock.Data)
}

// Link handlers
func (app *App) CreateHardLink(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var req struct {
        SourcePath string `json:"source_path"`
        DestPath   string `json:"dest_path"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    fs := NewFileSystem(app.DB, userID)
    if err := fs.CreateHardLink(req.SourcePath, req.DestPath, userID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Hard link created"})
}

func (app *App) CreateSoftLink(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var req struct {
        SourcePath string `json:"source_path"`
        DestPath   string `json:"dest_path"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    fs := NewFileSystem(app.DB, userID)
    if err := fs.CreateSoftLink(req.SourcePath, req.DestPath, userID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Soft link created"})
}

// Admin handlers
func (app *App) GetAllUsers(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var currentUser User
    if app.DB.First(&currentUser, userID).Error != nil || currentUser.Role != "admin" {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }
    
    var users []User
    app.DB.Find(&users)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func (app *App) UpdateUserQuota(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    vars := mux.Vars(r)
    targetUserID, _ := strconv.Atoi(vars["id"])
    
    var currentUser User
    if app.DB.First(&currentUser, userID).Error != nil || currentUser.Role != "admin" {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }
    
    var req struct {
        QuotaMax int64 `json:"quota_max"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    var user User
    if app.DB.First(&user, targetUserID).Error != nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }
    
    user.QuotaMax = req.QuotaMax
    app.DB.Save(&user)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (app *App) GetStorageStats(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var user User
    if app.DB.First(&user, userID).Error != nil || user.Role != "admin" {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }
    
    fs := NewFileSystem(app.DB, userID)
    stats := fs.GetDeduplicationStats()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(stats)
}

func (app *App) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
    userID := app.getUserID(r)
    
    var user User
    if app.DB.First(&user, userID).Error != nil || user.Role != "admin" {
        http.Error(w, "Access denied", http.StatusForbidden)
        return
    }
    
    var logs []AuditLog
    app.DB.Preload("User").Order("created_at desc").Limit(100).Find(&logs)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(logs)
}

// Helper methods
func (app *App) generateJWT(userID uint) string {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
    })
    
    tokenString, _ := token.SignedString([]byte(app.JWTSecret))
    return tokenString
}

func (app *App) getUserID(r *http.Request) uint {
    userID := r.Context().Value("userID")
    if userID == nil {
        return 0
    }
    return userID.(uint)
}
