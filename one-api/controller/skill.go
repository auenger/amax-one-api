package controller

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
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
	projectId, _ := strconv.Atoi(c.Query("project_id"))
	skills, err := model.GetAllSkills(p*config.ItemsPerPage, config.ItemsPerPage, category, projectId)
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
	projectId, _ := strconv.Atoi(c.Query("project_id"))
	skills, err := model.GetUserSkills(userId, p*config.ItemsPerPage, config.ItemsPerPage, projectId)
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

// extractSkillMdFromZip reads a ZIP archive and extracts the content of skill.md.
// Returns the content, the sanitized filename base, and any error.
// Enforces path traversal protection.
func extractSkillMdFromZip(data []byte) (string, string, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", "", fmt.Errorf("无效的 ZIP 文件: %v", err)
	}

	var skillMdContent string
	var baseName string

	for _, f := range reader.File {
		// Path traversal protection: reject entries with ".." or absolute paths
		cleanName := filepath.Clean(f.Name)
		if strings.Contains(cleanName, "..") || strings.HasPrefix(cleanName, "/") {
			continue
		}

		// Look for skill.md (case-insensitive) at any level
		base := filepath.Base(cleanName)
		if strings.EqualFold(base, "skill.md") {
			rc, err := f.Open()
			if err != nil {
				continue
			}
			content, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				continue
			}
			skillMdContent = string(content)
			// Use the parent directory name as base name
			dir := filepath.Dir(cleanName)
			if dir != "." && dir != "" {
				baseName = filepath.Base(dir)
			}
		}
	}

	if skillMdContent == "" {
		return "", "", fmt.Errorf("ZIP 中未找到 skill.md")
	}

	if baseName == "" {
		baseName = "skill"
	}

	return skillMdContent, baseName, nil
}

// CreateSkill handles both JSON (simple/text) and multipart/form-data (file upload) requests.
func CreateSkill(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	contentType := c.GetHeader("Content-Type")

	skill := model.Skill{}

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Multipart upload: file-based
		if err := c.Request.ParseMultipartForm(model.MaxArchiveSize); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "请求解析失败，文件可能过大",
			})
			return
		}

		// Parse metadata fields from form
		skill.Name = c.PostForm("name")
		skill.Description = c.PostForm("description")
		skill.Category = c.PostForm("category")
		skill.Version = c.PostForm("version")
		projectIdStr := c.PostForm("project_id")
		if projectIdStr != "" {
			skill.ProjectId, _ = strconv.Atoi(projectIdStr)
		}

		// Validate project_id
		if skill.ProjectId <= 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "请选择所属项目",
			})
			return
		}

		// Verify project exists
		if _, err := model.GetSkillProjectById(skill.ProjectId); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "项目不存在",
			})
			return
		}

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "请选择要上传的文件",
			})
			return
		}
		defer file.Close()

		ext := strings.ToLower(filepath.Ext(header.Filename))

		if ext == ".md" {
			// Simple skill: read text content
			data, err := io.ReadAll(file)
			if err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "文件读取失败",
				})
				return
			}
			skill.Content = string(data)
			skill.FileName = header.Filename
			skill.FileType = "md"
			skill.SkillType = model.SkillTypeSimple

			// Auto-fill name from filename if not provided
			if skill.Name == "" {
				skill.Name = strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
			}
		} else if ext == ".zip" {
			// Complex skill: ZIP archive
			if header.Size > model.MaxArchiveSize {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "文件大小超过 20MB 限制",
				})
				return
			}

			data, err := io.ReadAll(file)
			if err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "文件读取失败",
				})
				return
			}

			// Try to extract skill.md from ZIP
			skillMdContent, baseName, extractErr := extractSkillMdFromZip(data)
			if extractErr != nil {
				// No skill.md found — check if description provided as fallback
				if skill.Description == "" {
					c.JSON(http.StatusOK, gin.H{
						"success": false,
						"message": "ZIP 中未找到 skill.md，请提供描述信息",
					})
					return
				}
				// Use user-provided description as content
				skill.Content = skill.Description
			} else {
				skill.Content = skillMdContent
				if skill.Name == "" {
					skill.Name = baseName
				}
			}

			skill.FileName = header.Filename
			skill.FileType = "zip"
			skill.SkillType = model.SkillTypeComplex
			skill.Archive = data
			skill.ArchiveSize = header.Size
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "仅支持 .md 和 .zip 文件",
			})
			return
		}
	} else {
		// Legacy JSON upload (backward compatible)
		if err := c.ShouldBindJSON(&skill); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		// Validate project_id
		if skill.ProjectId <= 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "请选择所属项目",
			})
			return
		}
		// Verify project exists
		if _, err := model.GetSkillProjectById(skill.ProjectId); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "项目不存在",
			})
			return
		}
		ext := strings.ToLower(filepath.Ext(skill.FileName))
		if ext == ".yaml" || ext == ".yml" {
			skill.FileType = "yaml"
		} else {
			skill.FileType = "md"
		}
		skill.SkillType = model.SkillTypeSimple
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

// UpdateSkill handles both JSON and multipart/form-data updates.
func UpdateSkill(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	role := c.GetInt(ctxkey.Role)
	isAdmin := role >= model.RoleAdminUser
	contentType := c.GetHeader("Content-Type")

	var existing *model.Skill
	var err error

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Multipart update with file
		idStr := c.PostForm("id")
		if idStr == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "缺少 ID",
			})
			return
		}
		id, _ := strconv.Atoi(idStr)
		existing, err = model.GetSkillById(id)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Update metadata fields if provided
		if name := c.PostForm("name"); name != "" {
			existing.Name = name
		}
		if desc := c.PostForm("description"); desc != "" {
			existing.Description = desc
		}
		if cat := c.PostForm("category"); cat != "" {
			existing.Category = cat
		}
		if ver := c.PostForm("version"); ver != "" {
			existing.Version = ver
		}

		// Handle file update
		file, header, fileErr := c.Request.FormFile("file")
		if fileErr == nil {
			defer file.Close()
			ext := strings.ToLower(filepath.Ext(header.Filename))

			if ext == ".md" {
				data, _ := io.ReadAll(file)
				existing.Content = string(data)
				existing.FileName = header.Filename
				existing.FileType = "md"
				existing.SkillType = model.SkillTypeSimple
				existing.Archive = nil
				existing.ArchiveSize = 0
			} else if ext == ".zip" {
				if header.Size > model.MaxArchiveSize {
					c.JSON(http.StatusOK, gin.H{
						"success": false,
						"message": "文件大小超过 20MB 限制",
					})
					return
				}
				data, _ := io.ReadAll(file)
				skillMdContent, _, extractErr := extractSkillMdFromZip(data)
				if extractErr == nil {
					existing.Content = skillMdContent
				}
				existing.FileName = header.Filename
				existing.FileType = "zip"
				existing.SkillType = model.SkillTypeComplex
				existing.Archive = data
				existing.ArchiveSize = header.Size
			}
		}
	} else {
		// Legacy JSON update
		skill := model.Skill{}
		if err := c.ShouldBindJSON(&skill); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		existing, err = model.GetSkillById(skill.Id)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		existing.Name = skill.Name
		existing.Description = skill.Description
		existing.Category = skill.Category
		existing.Content = skill.Content
		existing.FileName = skill.FileName
		existing.Version = skill.Version
		if skill.ProjectId > 0 {
			existing.ProjectId = skill.ProjectId
		}
	}

	if !isAdmin && existing.UserId != userId {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权限修改此 Skill",
		})
		return
	}

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

// DownloadSkill returns content as text/markdown for simple skills,
// or the full ZIP archive for complex skills.
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

	if skill.SkillType == model.SkillTypeComplex && len(skill.Archive) > 0 {
		// Complex skill: return ZIP archive
		c.Data(http.StatusOK, "application/zip", skill.Archive)
	} else {
		// Simple skill: return text content
		c.Data(http.StatusOK, "text/markdown; charset=utf-8", []byte(skill.Content))
	}
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
			"command":   cmd,
			"file_name": skill.FileName,
			"skill_type": skill.SkillType,
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

// UpgradeSkill creates a new version of an existing skill.
// The old skill is archived and the new skill becomes the active version.
func UpgradeSkill(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	role := c.GetInt(ctxkey.Role)
	isAdmin := role >= model.RoleAdminUser

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(model.MaxArchiveSize); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "请求解析失败，文件可能过大",
		})
		return
	}

	// Get the source skill ID
	skillIdStr := c.PostForm("skill_id")
	if skillIdStr == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "缺少 skill_id",
		})
		return
	}
	skillId, _ := strconv.Atoi(skillIdStr)
	if skillId <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 skill_id",
		})
		return
	}

	// Get the existing skill
	existing, err := model.GetSkillById(skillId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "原 Skill 不存在",
		})
		return
	}

	// Permission check: only owner or admin can upgrade
	if !isAdmin && existing.UserId != userId {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权限升级此 Skill",
		})
		return
	}

	// Cannot upgrade an archived skill
	if existing.IsArchived {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "归档版本的 Skill 不能升级",
		})
		return
	}

	// Parse the uploaded file
	file, header, fileErr := c.Request.FormFile("file")
	if fileErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "请选择要上传的文件",
		})
		return
	}
	defer file.Close()

	// Build new skill from existing
	newSkill := model.Skill{
		UserId:          existing.UserId,
		ProjectId:       existing.ProjectId,
		Name:            existing.Name,
		Category:        existing.Category,
		ParentVersionId: existing.Id,
		Status:          model.SkillStatusEnabled,
		CreatedTime:     helper.GetTimestamp(),
		UpdatedTime:     helper.GetTimestamp(),
	}

	// Override version if provided
	if ver := c.PostForm("version"); ver != "" {
		newSkill.Version = ver
	} else {
		newSkill.Version = existing.Version
	}
	if desc := c.PostForm("description"); desc != "" {
		newSkill.Description = desc
	} else {
		newSkill.Description = existing.Description
	}

	// Process uploaded file
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == ".md" {
		data, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "文件读取失败",
			})
			return
		}
		newSkill.Content = string(data)
		newSkill.FileName = header.Filename
		newSkill.FileType = "md"
		newSkill.SkillType = model.SkillTypeSimple
	} else if ext == ".zip" {
		if header.Size > model.MaxArchiveSize {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "文件大小超过 20MB 限制",
			})
			return
		}
		data, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "文件读取失败",
			})
			return
		}
		skillMdContent, _, extractErr := extractSkillMdFromZip(data)
		if extractErr != nil {
			if newSkill.Description == "" {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "ZIP 中未找到 skill.md，请提供描述信息",
				})
				return
			}
			newSkill.Content = newSkill.Description
		} else {
			newSkill.Content = skillMdContent
		}
		newSkill.FileName = header.Filename
		newSkill.FileType = "zip"
		newSkill.SkillType = model.SkillTypeComplex
		newSkill.Archive = data
		newSkill.ArchiveSize = header.Size
	} else {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "仅支持 .md 和 .zip 文件",
		})
		return
	}

	// Archive the old skill and create the new one in a transaction
	tx := model.DB.Begin()

	// Archive old skill
	if err := tx.Model(existing).Updates(map[string]interface{}{
		"is_archived":  true,
		"updated_time": helper.GetTimestamp(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "归档旧版本失败: " + err.Error(),
		})
		return
	}

	// Create new skill
	if err := tx.Create(&newSkill).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "创建新版本失败: " + err.Error(),
		})
		return
	}

	tx.Commit()

	// Fill user/project names for response
	newSkill.UserName = existing.UserName
	newSkill.ProjectName = existing.ProjectName

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Skill 升级成功",
		"data":    newSkill,
	})
}

// GetSkillVersions returns version history for a skill.
func GetSkillVersions(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的 ID",
		})
		return
	}

	versions, err := model.GetSkillVersionHistory(id)
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
		"data":    versions,
	})
}
