package model

import (
	"github.com/songquanpeng/one-api/common/helper"
)

const (
	TokenRequestStatusPending  = 1
	TokenRequestStatusApproved = 2
	TokenRequestStatusRejected = 3
)

// TokenRequest represents a user's request for a new API token.
// Users submit requests which admins can approve or reject.
type TokenRequest struct {
	Id           int     `json:"id" gorm:"primaryKey"`
	UserId       int     `json:"user_id" gorm:"index"`
	Name         string  `json:"name" gorm:"type:varchar(30)"`
	Models       string  `json:"models" gorm:"type:text"`
	Reason       string  `json:"reason" gorm:"type:text"`
	Quota        int64   `json:"quota" gorm:"bigint;default:0"`
	Status       int     `json:"status" gorm:"default:1"`
	CreatedTime  int64   `json:"created_time" gorm:"bigint"`
	ReviewedBy   *int    `json:"reviewed_by" gorm:"index"`
	ReviewedTime *int64  `json:"reviewed_time" gorm:"bigint"`
	ReviewNote   *string `json:"review_note" gorm:"type:text"`
	// The token created after approval
	CreatedTokenId  *int   `json:"created_token_id" gorm:"index"`
	CreatedTokenKey string `json:"created_token_key" gorm:"type:char(48)"`
}

func GetAllTokenRequests(status int, startIdx int, num int) ([]*TokenRequest, error) {
	var requests []*TokenRequest
	var err error
	query := DB.Order("id desc")
	if status > 0 {
		query = query.Where("status = ?", status)
	}
	err = query.Limit(num).Offset(startIdx).Find(&requests).Error
	return requests, err
}

func GetUserTokenRequests(userId int, startIdx int, num int) ([]*TokenRequest, error) {
	var requests []*TokenRequest
	err := DB.Where("user_id = ?", userId).Order("id desc").Limit(num).Offset(startIdx).Find(&requests).Error
	return requests, err
}

func GetTokenRequestById(id int) (*TokenRequest, error) {
	var request TokenRequest
	err := DB.First(&request, "id = ?", id).Error
	return &request, err
}

func (r *TokenRequest) Insert() error {
	r.CreatedTime = helper.GetTimestamp()
	r.Status = TokenRequestStatusPending
	return DB.Create(r).Error
}

func (r *TokenRequest) Update() error {
	return DB.Model(r).Select("status", "reviewed_by", "reviewed_time", "review_note", "created_token_id", "created_token_key").Updates(r).Error
}

func DeleteTokenRequestById(id int) error {
	return DB.Delete(&TokenRequest{}, "id = ?", id).Error
}
