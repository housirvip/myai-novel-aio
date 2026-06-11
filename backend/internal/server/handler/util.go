package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"myai-novel-go/internal/domain/shared"
	"myai-novel-go/internal/server/middleware"
)

func ok(c *gin.Context, v any)     { c.JSON(http.StatusOK, gin.H{"data": v}) }
func created(c *gin.Context, v any) { c.JSON(http.StatusCreated, gin.H{"data": v}) }
func accepted(c *gin.Context, v any) { c.JSON(http.StatusAccepted, gin.H{"data": v}) }

func logMutation(c *gin.Context, resource, op string, bookID, id int64) {
	middleware.Logger(c).Info(resource+"."+op, zap.Int64("bookId", bookID), zap.Int64("id", id))
}

func parseLimit(c *gin.Context, def, maxV int) (int, error) {
	raw := c.Query("limit")
	if raw == "" {
		return def, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return 0, shared.BadRequest("invalid limit query param")
	}
	if n > maxV {
		n = maxV
	}
	return n, nil
}

func bind(c *gin.Context, v any) error {
	if err := c.ShouldBindJSON(v); err != nil {
		return shared.BadRequestDetails("invalid request body", err.Error())
	}
	return nil
}
