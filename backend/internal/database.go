package internal

import (
    "log"
    "os"
    
    "golang.org/x/crypto/bcrypt"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func ConnectDB() *gorm.DB {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://postgres:postgres@localhost:5432/filevault?sslmode=disable"
    }
    
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    
    // Auto-migrate all models
    err = db.AutoMigrate(
        &User{},
        &DataBlock{},
        &TrieNode{},
        &FileNode{},
        &DirNode{},
        &SymLinkNode{},
        &Share{},
        &AuditLog{},
    )
    
    if err != nil {
        log.Fatal("Failed to migrate database:", err)
    }
    
    // Create admin user if not exists
    var adminUser User
    if err := db.Where("role = ?", "admin").First(&adminUser).Error; err != nil {
        hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
        admin := &User{
            Username:  "admin",
            Email:     "admin@filevault.com",
            Password:  string(hashedPassword),
            Role:      "admin",
            QuotaMax:  1024 * 1024 * 1024, // 1GB for admin
        }
        db.Create(admin)
        log.Println("Admin user created: admin@filevault.com / admin123")
    }
    
    return db
}
