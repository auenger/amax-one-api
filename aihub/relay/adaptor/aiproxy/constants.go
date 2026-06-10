package aiproxy

import "github.com/yzw/aihub/relay/adaptor/openai"

var ModelList = []string{""}

func init() {
	ModelList = openai.ModelList
}
