package model

import (
	"errors"

	"gorm.io/gorm"
)

const (
	SkillStatusEnabled  = 1
	SkillStatusDisabled = 2

	SkillTypeSimple  = "simple"
	SkillTypeComplex = "complex"

	MaxArchiveSize = 20 * 1024 * 1024 // 20MB
)

type Skill struct {
	Id              int    `json:"id"`
	UserId          int    `json:"user_id" gorm:"index"`
	UserName        string `json:"user_name" gorm:"-"`
	ProjectId       int    `json:"project_id" gorm:"index;not null"`
	ProjectName     string `json:"project_name" gorm:"-"`
	Name            string `json:"name" gorm:"size:128;index:idx_project_name"`
	Description     string `json:"description" gorm:"type:text"`
	Category        string `json:"category" gorm:"size:64;index"`
	Content         string `json:"content" gorm:"type:longtext"`
	FileName        string `json:"file_name" gorm:"size:256"`
	FileType        string `json:"file_type" gorm:"size:16"`
	SkillType       string `json:"skill_type" gorm:"size:16;default:'simple'"`
	Archive         []byte `json:"-" gorm:"type:longblob"`
	ArchiveSize     int64  `json:"archive_size"`
	Version         string `json:"version" gorm:"size:32"`
	ParentVersionId int    `json:"parent_version_id" gorm:"default:0;index"`
	IsArchived      bool   `json:"is_archived" gorm:"default:false;index"`
	Downloads       int    `json:"downloads" gorm:"default:0"`
	Status          int    `json:"status" gorm:"default:1"`
	CreatedTime     int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime     int64  `json:"updated_time" gorm:"bigint"`
}

func (s *Skill) Insert() error {
	return DB.Create(s).Error
}

func (s *Skill) Update() error {
	return DB.Model(s).Select("name", "description", "category", "content", "file_name", "file_type", "skill_type", "archive", "archive_size", "version", "status", "project_id", "updated_time").Updates(s).Error
}

func (s *Skill) Delete() error {
	return DB.Delete(s).Error
}

func GetSkillById(id int) (*Skill, error) {
	if id == 0 {
		return nil, errors.New("id 为空")
	}
	var skill Skill
	err := DB.First(&skill, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	// fill user name
	var user User
	if err := DB.Select("username", "display_name").First(&user, "id = ?", skill.UserId).Error; err == nil {
		skill.UserName = user.DisplayName
		if skill.UserName == "" {
			skill.UserName = user.Username
		}
	}
	// fill project name
	var project SkillProject
	if err := DB.Select("name").First(&project, "id = ?", skill.ProjectId).Error; err == nil {
		skill.ProjectName = project.Name
	}
	return &skill, nil
}

func GetAllSkills(startIdx int, num int, category string, projectId int) ([]*Skill, error) {
	var skills []*Skill
	query := DB.Where("status = ? AND is_archived = ?", SkillStatusEnabled, false)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if projectId > 0 {
		query = query.Where("project_id = ?", projectId)
	}
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&skills).Error
	if err != nil {
		return nil, err
	}
	fillUserNames(skills)
	return skills, nil
}

func SearchSkills(keyword string, category string) ([]*Skill, error) {
	var skills []*Skill
	query := DB.Where("status = ? AND is_archived = ?", SkillStatusEnabled, false)
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	err := query.Order("id desc").Find(&skills).Error
	if err != nil {
		return nil, err
	}
	fillUserNames(skills)
	return skills, nil
}

func GetUserSkills(userId int, startIdx int, num int, projectId int) ([]*Skill, error) {
	var skills []*Skill
	query := DB.Where("user_id = ?", userId)
	if projectId > 0 {
		query = query.Where("project_id = ?", projectId)
	}
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&skills).Error
	if err != nil {
		return nil, err
	}
	fillUserNames(skills)
	return skills, nil
}

func DeleteSkillById(id int, userId int, isAdmin bool) error {
	if id == 0 {
		return errors.New("id 为空")
	}
	skill, err := GetSkillById(id)
	if err != nil {
		return err
	}
	if !isAdmin && skill.UserId != userId {
		return errors.New("无权限删除此 Skill")
	}
	return skill.Delete()
}

func IncrementSkillDownloads(id int) error {
	return DB.Model(&Skill{}).Where("id = ?", id).UpdateColumn("downloads", gorm.Expr("downloads + ?", 1)).Error
}

func GetSkillCategories() ([]string, error) {
	var categories []string
	err := DB.Model(&Skill{}).Where("status = ?", SkillStatusEnabled).Distinct("category").Pluck("category", &categories).Error
	return categories, err
}

func fillUserNames(skills []*Skill) {
	if len(skills) == 0 {
		return
	}
	userIds := make(map[int]bool)
	for _, s := range skills {
		userIds[s.UserId] = true
	}
	var users []User
	ids := make([]int, 0, len(userIds))
	for id := range userIds {
		ids = append(ids, id)
	}
	DB.Select("id", "username", "display_name").Where("id IN ?", ids).Find(&users)
	userMap := make(map[int]User)
	for _, u := range users {
		userMap[u.Id] = u
	}
	for _, s := range skills {
		if u, ok := userMap[s.UserId]; ok {
			s.UserName = u.DisplayName
			if s.UserName == "" {
				s.UserName = u.Username
			}
		}
	}
}

// GetSkillVersionHistory returns all versions of a skill by following the parent chain.
func GetSkillVersionHistory(skillId int) ([]*Skill, error) {
	// Walk up to find the root of the version chain
	currentId := skillId
	visited := make(map[int]bool)
	for {
		if visited[currentId] {
			break
		}
		visited[currentId] = true
		var s Skill
		if err := DB.First(&s, "id = ?", currentId).Error; err != nil {
			break
		}
		if s.ParentVersionId == 0 {
			currentId = s.Id
			break
		}
		currentId = s.ParentVersionId
	}
	rootId := currentId

	// BFS to collect all descendants
	var all []*Skill
	root, err := GetSkillById(rootId)
	if err != nil {
		return nil, err
	}
	all = append(all, root)

	queue := []int{rootId}
	for len(queue) > 0 {
		var children []*Skill
		DB.Where("parent_version_id IN ? AND status = ?", queue, SkillStatusEnabled).Find(&children)
		queue = nil
		for _, child := range children {
			all = append(all, child)
			queue = append(queue, child.Id)
		}
	}

	// Sort by ID descending (newest first)
	for i := 0; i < len(all)-1; i++ {
		for j := i + 1; j < len(all); j++ {
			if all[i].Id < all[j].Id {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	return all, nil
}

// CheckSkillNameUnique checks if a skill name is unique within a project (non-archived).
func CheckSkillNameUnique(name string, projectId int, excludeId int) bool {
	var count int64
	query := DB.Model(&Skill{}).Where("name = ? AND project_id = ? AND is_archived = ? AND status = ?", name, projectId, false, SkillStatusEnabled)
	if excludeId > 0 {
		query = query.Where("id != ?", excludeId)
	}
	query.Count(&count)
	return count == 0
}
