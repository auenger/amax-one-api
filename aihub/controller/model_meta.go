package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yzw/aihub/model"
)

// GetModelMetas returns all model metadata records.
func GetModelMetas(c *gin.Context) {
	metas, err := model.GetModelMetas()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    metas,
	})
}

// UpdateModelMeta creates or updates a model metadata record.
func UpdateModelMeta(c *gin.Context) {
	var body struct {
		ModelName  string `json:"model_name"`
		Multimodal bool   `json:"multimodal"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid request: " + err.Error(),
		})
		return
	}
	if body.ModelName == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "model_name is required",
		})
		return
	}

	meta := &model.ModelMeta{
		ModelName:  body.ModelName,
		Multimodal: body.Multimodal,
	}
	if err := model.UpsertModelMeta(meta); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	model.InvalidateMultimodalCache()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// ScanNewModelsHandler scans all channels for models not yet in model_metas
// and creates new records.
func ScanNewModelsHandler(c *gin.Context) {
	total, newCount, err := model.ScanNewModels()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"total":      total,
			"new_models": newCount,
		},
	})
}

// BatchUpdateModelMetas handles batch updates from the management UI.
func BatchUpdateModelMetas(c *gin.Context) {
	var body struct {
		Updates []struct {
			ModelName  string `json:"model_name"`
			Multimodal bool   `json:"multimodal"`
		} `json:"updates"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid request: " + err.Error(),
		})
		return
	}

	for _, u := range body.Updates {
		if u.ModelName == "" {
			continue
		}
		meta := &model.ModelMeta{
			ModelName:  u.ModelName,
			Multimodal: u.Multimodal,
		}
		_ = model.UpsertModelMeta(meta)
	}

	model.InvalidateMultimodalCache()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"updated": strconv.Itoa(len(body.Updates)),
		},
	})
}
