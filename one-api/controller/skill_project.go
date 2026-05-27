package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/model"
)

func GetAllSkillProjects(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	keyword := c.Query("keyword")
	projects, err := model.GetAllSkillProjects(p*config.ItemsPerPage, config.ItemsPerPage, keyword)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	// Fill skill counts
	for _, proj := range projects {
		proj.SkillCount = int(model.GetProjectSkillCount(proj.Id))
	}
	total, _ := model.GetSkillProjectCount()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    projects,
		"total":   total,
	})
}

func GetSkillProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}
	project, err := model.GetSkillProjectById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	project.SkillCount = int(model.GetProjectSkillCount(project.Id))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    project,
	})
}

func CreateSkillProject(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	project := model.SkillProject{}
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if project.Name == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "项目名称不能为空",
		})
		return
	}
	project.UserId = userId
	project.Status = model.ProjectStatusEnabled
	project.CreatedTime = helper.GetTimestamp()
	project.UpdatedTime = helper.GetTimestamp()
	if err := project.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "项目创建成功",
		"data":    project,
	})
}

func UpdateSkillProject(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	role := c.GetInt(ctxkey.Role)
	isAdmin := role >= model.RoleAdminUser

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Status      int    `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	updates := map[string]interface{}{
		"updated_time": helper.GetTimestamp(),
	}
	if body.Name != "" {
		updates["name"] = body.Name
	}
	if body.Description != "" {
		updates["description"] = body.Description
	}
	if body.Status > 0 {
		updates["status"] = body.Status
	}

	if err := model.UpdateSkillProjectById(id, userId, isAdmin, updates); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "项目更新成功",
	})
}

func DeleteSkillProject(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	role := c.GetInt(ctxkey.Role)
	isAdmin := role >= model.RoleAdminUser

	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteSkillProjectById(id, userId, isAdmin); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "项目已删除",
	})
}
