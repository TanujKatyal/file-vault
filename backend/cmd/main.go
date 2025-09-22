package main

import (
    "log"
    "net/http"
    "os"
    "path/filepath"
    
    "github.com/gorilla/mux"
    "github.com/joho/godotenv"
    "github.com/rs/cors"
    
    "file-vault/internal"
)

func main() {
    // Load .env from parent directory (root)
    envPath := filepath.Join("..", ".env")
    if err := godotenv.Load(envPath); err != nil {
        log.Printf("Warning: .env file not found at %s", envPath)
    }
    
    app := internal.NewApp()
    
    router := mux.NewRouter()
    
    // Auth routes
    router.HandleFunc("/api/auth/login", app.Login).Methods("POST")
    router.HandleFunc("/api/auth/register", app.Register).Methods("POST")
    
    // Protected routes
    protected := router.PathPrefix("/api").Subrouter()
    protected.Use(app.AuthMiddleware)
    protected.Use(app.RateLimitMiddleware)
    
    // File operations
    protected.HandleFunc("/files", app.UploadFile).Methods("POST")
    protected.HandleFunc("/files", app.GetFiles).Methods("GET")
    protected.HandleFunc("/files/{id}", app.DownloadFile).Methods("GET")
    protected.HandleFunc("/files/{id}", app.DeleteFile).Methods("DELETE")
    
    // User profile
    protected.HandleFunc("/user/me", app.GetProfile).Methods("GET")
    
    // Directory operations
    protected.HandleFunc("/directories", app.CreateDirectory).Methods("POST")
    protected.HandleFunc("/directories", app.ListDirectory).Methods("GET")
    
    // Sharing
    protected.HandleFunc("/files/{id}/share", app.CreateShare).Methods("POST")
    
    // Public sharing (no auth required)
    router.HandleFunc("/api/share/{token}", app.GetSharedFile).Methods("GET")
    
    // Linking
    protected.HandleFunc("/hard-links", app.CreateHardLink).Methods("POST")
    protected.HandleFunc("/soft-links", app.CreateSoftLink).Methods("POST")
    
    // Admin routes
    protected.HandleFunc("/admin/stats", app.GetStorageStats).Methods("GET")
    protected.HandleFunc("/admin/users", app.GetAllUsers).Methods("GET")
    protected.HandleFunc("/admin/users/{id}/quota", app.UpdateUserQuota).Methods("PUT")
    protected.HandleFunc("/admin/audit-logs", app.GetAuditLogs).Methods("GET")
    
    // Health check
    router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status": "healthy"}`))
    }).Methods("GET")
    
    // CORS
    c := cors.New(cors.Options{
        AllowedOrigins: []string{"http://localhost:3000"},
        AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders: []string{"*"},
        AllowCredentials: true,
    })
    
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    
    log.Printf("🚀 Server running on http://localhost:%s", port)
    log.Fatal(http.ListenAndServe(":"+port, c.Handler(router)))
}
