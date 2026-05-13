package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/random"
	"github.com/songquanpeng/one-api/model"
)

// SubmitTokenRequest handles user submitting a token request.
func SubmitTokenRequest(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	var request model.TokenRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误：" + err.Error(),
		})
		return
	}
	if request.Name == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "令牌名称不能为空",
		})
		return
	}
	if len(request.Name) > 30 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "令牌名称过长",
		})
		return
	}

	request.UserId = userId
	request.Status = model.TokenRequestStatusPending

	if err := request.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    request,
	})
}

// GetUserTokenRequests returns the current user's token requests.
func GetUserTokenRequests(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	requests, err := model.GetUserTokenRequests(userId, p*config.ItemsPerPage, config.ItemsPerPage)
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
		"data":    requests,
	})
}

// GetAllTokenRequests returns all token requests (admin only).
func GetAllTokenRequests(c *gin.Context) {
	status, _ := strconv.Atoi(c.Query("status"))
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	requests, err := model.GetAllTokenRequests(status, p*config.ItemsPerPage, config.ItemsPerPage)
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
		"data":    requests,
	})
}

// ApproveTokenRequest approves a token request and creates a token.
func ApproveTokenRequest(c *gin.Context) {
	adminUserId := c.GetInt(ctxkey.Id)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的申请 Id",
		})
		return
	}

	request, err := model.GetTokenRequestById(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "申请不存在",
		})
		return
	}

	if request.Status != model.TokenRequestStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("申请状态不是待审批（当前状态：%d）", request.Status),
		})
		return
	}

	// Parse optional review note
	var body struct {
		ReviewNote string `json:"review_note"`
		Quota      *int64 `json:"quota"` // override quota if provided
	}
	c.ShouldBindJSON(&body)

	// Determine quota
	quota := request.Quota
	if body.Quota != nil && *body.Quota > 0 {
		quota = *body.Quota
	}

	// Create the token
	token := model.Token{
		UserId:         request.UserId,
		Name:           request.Name,
		Key:            random.GenerateKey(),
		CreatedTime:    helper.GetTimestamp(),
		AccessedTime:   helper.GetTimestamp(),
		ExpiredTime:    -1, // never expire by default
		RemainQuota:    quota,
		UnlimitedQuota: quota == 0,
		Models:         &request.Models,
	}
	if err := token.Insert(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建令牌失败：" + err.Error(),
		})
		return
	}

	// Update the request
	now := helper.GetTimestamp()
	request.Status = model.TokenRequestStatusApproved
	request.ReviewedBy = &adminUserId
	request.ReviewedTime = &now
	request.CreatedTokenId = &token.Id
	request.CreatedTokenKey = token.Key
	if body.ReviewNote != "" {
		request.ReviewNote = &body.ReviewNote
	}
	if err := request.Update(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "更新申请状态失败：" + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "审批通过，令牌已创建",
		"data": gin.H{
			"request":    request,
			"token_id":   token.Id,
			"token_key":  token.Key,
			"token_name": token.Name,
		},
	})
}

// RejectTokenRequest rejects a token request.
func RejectTokenRequest(c *gin.Context) {
	adminUserId := c.GetInt(ctxkey.Id)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的申请 Id",
		})
		return
	}

	request, err := model.GetTokenRequestById(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "申请不存在",
		})
		return
	}

	if request.Status != model.TokenRequestStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("申请状态不是待审批（当前状态：%d）", request.Status),
		})
		return
	}

	var body struct {
		ReviewNote string `json:"review_note"`
	}
	c.ShouldBindJSON(&body)

	now := helper.GetTimestamp()
	request.Status = model.TokenRequestStatusRejected
	request.ReviewedBy = &adminUserId
	request.ReviewedTime = &now
	if body.ReviewNote != "" {
		request.ReviewNote = &body.ReviewNote
	}
	if err := request.Update(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已拒绝申请",
		"data":    request,
	})
}
