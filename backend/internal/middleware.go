package internal

import (
    "context"
    "fmt"
    "net/http"
    "strings"
    "sync"
    
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/time/rate"
)

var rateLimiters = make(map[uint]*rate.Limiter)
var rateLimiterMutex sync.RWMutex

// Fix middleware to match mux.MiddlewareFunc signature
func (app *App) AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "Missing authorization header", http.StatusUnauthorized)
            return
        }
        
        tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
        
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return []byte(app.JWTSecret), nil
        })
        
        if err != nil || !token.Valid {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            http.Error(w, "Invalid token claims", http.StatusUnauthorized)
            return
        }
        
        userID := uint(claims["user_id"].(float64))
        ctx := context.WithValue(r.Context(), "userID", userID)
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Fix rate limiting middleware
func (app *App) RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := app.getUserID(r)
        if userID == 0 {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        var user User
        app.DB.First(&user, userID)
        
        rateLimiterMutex.Lock()
        limiter, exists := rateLimiters[userID]
        if !exists {
            limiter = rate.NewLimiter(rate.Limit(user.RateLimitCalls), user.RateLimitCalls*2)
            rateLimiters[userID] = limiter
        }
        rateLimiterMutex.Unlock()
        
        if !limiter.Allow() {
            w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", user.RateLimitCalls))
            w.Header().Set("X-RateLimit-Remaining", "0")
            w.Header().Set("Retry-After", "1")
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
