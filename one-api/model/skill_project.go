package model

import (
	"errors"
)

const (
	ProjectStatusEnabled  = 1
	ProjectStatusDisabled = 2
)

type SkillProject struct {
	Id          int    `json:"id" gorm:"primaryKey"`
	UserId      int    `json:"user_id" gorm:"index"`
	UserName    string `json:"user_name" gorm:"-"`
	Name        string `json:"name" gorm:"uniqueIndex;size:128;not null"`
	Description string `json:"description" gorm:"type:text"`
	Status      int    `json:"status" gorm:"default:1"`
	SkillCount  int    `json:"skill_count" gorm:"-"`
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime int64  `json:"updated_time" gorm:"bigint"`
}

func (p *SkillProject) Insert() error {
	return DB.Create(p).Error
}

func (p *SkillProject) Update() error {
	return DB.Model(p).Select("name", "description", "status", "updated_time").Updates(p).Error
}

func GetSkillProjectById(id int) (*SkillProject, error) {
	if id == 0 {
		return nil, errors.New("id 为空")
	}
	var project SkillProject
	err := DB.First(&project, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	fillProjectUserName(&project)
	return &project, nil
}

func GetAllSkillProjects(startIdx int, num int, keyword string) ([]*SkillProject, error) {
	var projects []*SkillProject
	query := DB.Where("status = ?", ProjectStatusEnabled)
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&projects).Error
	if err != nil {
		return nil, err
	}
	fillProjectUserNames(projects)
	return projects, nil
}

func GetSkillProjectCount() (int64, error) {
	var count int64
	err := DB.Model(&SkillProject{}).Where("status = ?", ProjectStatusEnabled).Count(&count).Error
	return count, err
}

func DeleteSkillProjectById(id int, userId int, isAdmin bool) error {
	if id == 0 {
		return errors.New("id 为空")
	}
	project, err := GetSkillProjectById(id)
	if err != nil {
		return err
	}
	if !isAdmin && project.UserId != userId {
		return errors.New("无权限删除此项目")
	}
	// Check if project has skills
	var count int64
	DB.Model(&Skill{}).Where("project_id = ?", id).Count(&count)
	if count > 0 {
		return errors.New("项目下存在 Skill，无法删除")
	}
	return DB.Delete(project).Error
}

func UpdateSkillProjectById(id int, userId int, isAdmin bool, updates map[string]interface{}) error {
	if id == 0 {
		return errors.New("id 为空")
	}
	project, err := GetSkillProjectById(id)
	if err != nil {
		return err
	}
	if !isAdmin && project.UserId != userId {
		return errors.New("无权限修改此项目")
	}
	return DB.Model(&SkillProject{}).Where("id = ?", id).Updates(updates).Error
}

func GetProjectSkillCount(projectId int) int64 {
	var count int64
	DB.Model(&Skill{}).Where("project_id = ?", projectId).Count(&count)
	return count
}

func fillProjectUserName(project *SkillProject) {
	var user User
	if err := DB.Select("username", "display_name").First(&user, "id = ?", project.UserId).Error; err == nil {
		project.UserName = user.DisplayName
		if project.UserName == "" {
			project.UserName = user.Username
		}
	}
}

func fillProjectUserNames(projects []*SkillProject) {
	if len(projects) == 0 {
		return
	}
	userIds := make(map[int]bool)
	for _, p := range projects {
		userIds[p.UserId] = true
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
	for _, p := range projects {
		if u, ok := userMap[p.UserId]; ok {
			p.UserName = u.DisplayName
			if p.UserName == "" {
				p.UserName = u.Username
			}
		}
	}
}

// EnsureDefaultProject ensures at least one project exists for migration purposes.
// Called during DB migration.
func EnsureDefaultProject() {
	var count int64
	DB.Model(&SkillProject{}).Count(&count)
	if count == 0 {
		defaultProject := &SkillProject{
			UserId:      1, // root user
			Name:        "默认项目",
			Description: "系统自动创建的默认项目",
			Status:      ProjectStatusEnabled,
			CreatedTime: 0,
			UpdatedTime: 0,
		}
		DB.Create(defaultProject)
	}
}

// MigrateSkillsToProjects assigns existing Skills without a project to the default project.
func MigrateSkillsToProjects() {
	EnsureDefaultProject()

	var defaultProject SkillProject
	if err := DB.First(&defaultProject).Error; err != nil {
		return
	}

	// Update skills with project_id = 0 to the default project
	DB.Model(&Skill{}).Where("project_id = 0 OR project_id IS NULL").Update("project_id", defaultProject.Id)
}
