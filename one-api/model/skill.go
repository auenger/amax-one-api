package model

import (
	"errors"

	"gorm.io/gorm"
)

const (
	SkillStatusEnabled  = 1
	SkillStatusDisabled = 2
)

type Skill struct {
	Id          int    `json:"id"`
	UserId      int    `json:"user_id" gorm:"index"`
	UserName    string `json:"user_name" gorm:"-"`
	Name        string `json:"name" gorm:"index"`
	Description string `json:"description" gorm:"type:text"`
	Category    string `json:"category" gorm:"size:64;index"`
	Content     string `json:"content" gorm:"type:longtext"`
	FileName    string `json:"file_name" gorm:"size:256"`
	FileType    string `json:"file_type" gorm:"size:16"`
	Version     string `json:"version" gorm:"size:32"`
	Downloads   int    `json:"downloads" gorm:"default:0"`
	Status      int    `json:"status" gorm:"default:1"`
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime int64  `json:"updated_time" gorm:"bigint"`
}

func (s *Skill) Insert() error {
	return DB.Create(s).Error
}

func (s *Skill) Update() error {
	return DB.Model(s).Select("name", "description", "category", "content", "file_name", "file_type", "version", "status", "updated_time").Updates(s).Error
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
	return &skill, nil
}

func GetAllSkills(startIdx int, num int, category string) ([]*Skill, error) {
	var skills []*Skill
	query := DB.Where("status = ?", SkillStatusEnabled)
	if category != "" {
		query = query.Where("category = ?", category)
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
	query := DB.Where("status = ?", SkillStatusEnabled)
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

func GetUserSkills(userId int, startIdx int, num int) ([]*Skill, error) {
	var skills []*Skill
	err := DB.Where("user_id = ?", userId).Order("id desc").Limit(num).Offset(startIdx).Find(&skills).Error
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
