package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]bool, len(allowedOrigins)+2)
	originSet["tauri://localhost"] = true
	originSet["https://tauri.localhost"] = true
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}

		if !originSet[origin] {
			c.Next()
			return
		}

		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Max-Age", "86400")
		c.Header("Vary", "Origin")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
