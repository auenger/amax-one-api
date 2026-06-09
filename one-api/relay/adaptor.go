package relay

import (
	"github.com/yzw/aihub/relay/adaptor"
	"github.com/yzw/aihub/relay/adaptor/aiproxy"
	"github.com/yzw/aihub/relay/adaptor/ali"
	"github.com/yzw/aihub/relay/adaptor/anthropic"
	"github.com/yzw/aihub/relay/adaptor/aws"
	"github.com/yzw/aihub/relay/adaptor/baidu"
	"github.com/yzw/aihub/relay/adaptor/cloudflare"
	"github.com/yzw/aihub/relay/adaptor/cohere"
	"github.com/yzw/aihub/relay/adaptor/coze"
	"github.com/yzw/aihub/relay/adaptor/deepl"
	"github.com/yzw/aihub/relay/adaptor/gemini"
	"github.com/yzw/aihub/relay/adaptor/ollama"
	"github.com/yzw/aihub/relay/adaptor/openai"
	"github.com/yzw/aihub/relay/adaptor/palm"
	"github.com/yzw/aihub/relay/adaptor/proxy"
	"github.com/yzw/aihub/relay/adaptor/replicate"
	"github.com/yzw/aihub/relay/adaptor/tencent"
	"github.com/yzw/aihub/relay/adaptor/vertexai"
	"github.com/yzw/aihub/relay/adaptor/xunfei"
	"github.com/yzw/aihub/relay/adaptor/zhipu"
	"github.com/yzw/aihub/relay/apitype"
)

func GetAdaptor(apiType int) adaptor.Adaptor {
	switch apiType {
	case apitype.AIProxyLibrary:
		return &aiproxy.Adaptor{}
	case apitype.Ali:
		return &ali.Adaptor{}
	case apitype.Anthropic:
		return &anthropic.Adaptor{}
	case apitype.AwsClaude:
		return &aws.Adaptor{}
	case apitype.Baidu:
		return &baidu.Adaptor{}
	case apitype.Gemini:
		return &gemini.Adaptor{}
	case apitype.OpenAI:
		return &openai.Adaptor{}
	case apitype.PaLM:
		return &palm.Adaptor{}
	case apitype.Tencent:
		return &tencent.Adaptor{}
	case apitype.Xunfei:
		return &xunfei.Adaptor{}
	case apitype.Zhipu:
		return &zhipu.Adaptor{}
	case apitype.Ollama:
		return &ollama.Adaptor{}
	case apitype.Coze:
		return &coze.Adaptor{}
	case apitype.Cohere:
		return &cohere.Adaptor{}
	case apitype.Cloudflare:
		return &cloudflare.Adaptor{}
	case apitype.DeepL:
		return &deepl.Adaptor{}
	case apitype.VertexAI:
		return &vertexai.Adaptor{}
	case apitype.Proxy:
		return &proxy.Adaptor{}
	case apitype.Replicate:
		return &replicate.Adaptor{}
	}
	return nil
}
