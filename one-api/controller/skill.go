package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/model"
)

func GetAllSkills(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	category := c.Query("category")
	skills, err := model.GetAllSkills(p*config.ItemsPerPage, config.ItemsPerPage, category)
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
		"data":    skills,
	})
}

func SearchSkills(c *gin.Context) {
	keyword := c.Query("keyword")
	category := c.Query("category")
	skills, err := model.SearchSkills(keyword, category)
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
		"data":    skills,
	})
}

func GetUserSkills(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	skills, err := model.GetUserSkills(userId, p*config.ItemsPerPage, config.ItemsPerPage)
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
		"data":    skills,
	})
}

func GetSkill(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}
	skill, err := model.GetSkillById(id)
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
		"data":    skill,
	})
}

func CreateSkill(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	skill := model.Skill{}
	if err := c.ShouldBindJSON(&skill); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	// validate file type
	ext := strings.ToLower(filepath.Ext(skill.FileName))
	if ext != ".yaml" && ext != ".yml" && ext != ".md" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "仅支持 YAML 和 Markdown 文件",
		})
		return
	}
	if ext == ".yaml" || ext == ".yml" {
		skill.FileType = "yaml"
	} else {
		skill.FileType = "md"
	}
	skill.UserId = userId
	skill.Status = model.SkillStatusEnabled
	skill.CreatedTime = helper.GetTimestamp()
	skill.UpdatedTime = helper.GetTimestamp()
	if err := skill.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Skill 创建成功",
		"data":    skill,
	})
}

func UpdateSkill(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	skill := model.Skill{}
	if err := c.ShouldBindJSON(&skill); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	existing, err := model.GetSkillById(skill.Id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if existing.UserId != userId {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权限修改此 Skill",
		})
		return
	}
	existing.Name = skill.Name
	existing.Description = skill.Description
	existing.Category = skill.Category
	existing.Content = skill.Content
	existing.FileName = skill.FileName
	existing.Version = skill.Version
	existing.UpdatedTime = helper.GetTimestamp()
	if err := existing.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Skill 更新成功",
		"data":    existing,
	})
}

func DeleteSkill(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt(ctxkey.Id)
	role := c.GetInt(ctxkey.Role)
	isAdmin := role >= model.RoleAdminUser
	if err := model.DeleteSkillById(id, userId, isAdmin); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Skill 已删除",
	})
}

func DownloadSkill(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}
	skill, err := model.GetSkillById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	_ = model.IncrementSkillDownloads(id)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", skill.FileName))
	c.Data(http.StatusOK, "application/octet-stream", []byte(skill.Content))
}

func GetInstallCommand(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}
	skill, err := model.GetSkillById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	baseURL := c.Request.Host
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	// get user token for install command
	token := c.Query("token")
	if token == "" {
		token = "sk-YOUR_TOKEN"
	}
	cmd := fmt.Sprintf("mkdir -p .claude/skills && curl -sS -H \"Authorization: Bearer %s\" -o .claude/skills/%s %s://%s/api/skill/%d/download",
		token, skill.FileName, scheme, baseURL, id)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"command":  cmd,
			"file_name": skill.FileName,
		},
	})
}

func GetSkillCategories(c *gin.Context) {
	categories, err := model.GetSkillCategories()
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
		"data":    categories,
	})
}
