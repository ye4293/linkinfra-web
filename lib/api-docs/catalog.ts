export type DocText = { zh: string; en: string };
export const text = (zh: string, en: string): DocText => ({ zh, en });
export type DocLanguage = 'zh' | 'en';

export interface DocField {
  name: string;
  type: string;
  description: DocText;
  required?: boolean;
  children?: DocField[];
}

export interface ApiDoc {
  slug: string;
  title: DocText;
  description: DocText;
  group: string;
  method: 'POST' | 'GET';
  path: string;
  protocol: string;
  fields: DocField[];
  pathFields?: DocField[];
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  multipart?: boolean;
  binary?: boolean;
  response: unknown;
  responseFields: DocField[];
  note?: DocText;
  streaming?: DocText;
}

const field = (
  name: string,
  type: string,
  zh: string,
  en: string,
  required = false,
  children?: DocField[]
): DocField => ({ name, type, description: text(zh, en), required, children });

const model = field(
  'model',
  'string',
  '模型 ID，可在模型广场中查看。可用性取决于账户分组和渠道配置。',
  'Model ID from the model catalog. Availability depends on your account group and configured channels.',
  true
);
const stream = field(
  'stream',
  'boolean',
  '设为 true 时通过 Server-Sent Events 返回增量结果，默认 false。',
  'Set to true to receive incremental Server-Sent Events. Defaults to false.'
);
const messages = field(
  'messages',
  'array<object>',
  '按对话顺序传入消息列表。',
  'An ordered list of conversation messages.',
  true,
  [
    field(
      'role',
      'string',
      '消息角色，例如 system、user、assistant。',
      'Message role, such as system, user, or assistant.',
      true
    ),
    field(
      'content',
      'string | array',
      '消息文本或多模态内容块；支持的内容类型取决于模型。',
      'Text or multimodal content blocks. Supported content depends on the model.',
      true
    )
  ]
);
const usage = field(
  'usage',
  'object',
  '本次请求的 token 用量。实际扣费请在控制台用量记录中查看。',
  'Token usage for this request. Check usage logs in the console for actual charges.'
);
const contents = field(
  'contents',
  'array<object>',
  'Gemini 格式的对话内容。',
  'Conversation content in the native Gemini format.',
  true,
  [
    field(
      'role',
      'string',
      '内容角色：user 或 model。',
      'Content role: user or model.'
    ),
    field(
      'parts',
      'array<object>',
      '文本、图片或音频内容块。',
      'Text, image, or audio content parts.',
      true,
      [
        field('text', 'string', '文本内容。', 'Text content.'),
        field(
          'inlineData',
          'object',
          '内联媒体数据，包含 mimeType 和 Base64 编码的 data。',
          'Inline media with mimeType and Base64-encoded data.'
        )
      ]
    )
  ]
);
const geminiPath = [
  field(
    'model',
    'string',
    'Gemini 模型 ID，不包含 models/ 前缀。',
    'Gemini model ID without the models/ prefix.',
    true
  )
];
const geminiResponseFields = [
  field(
    'candidates',
    'array<object>',
    '生成结果，内容位于 content.parts。',
    'Generated candidates. Content is in content.parts.'
  ),
  field(
    'usageMetadata',
    'object',
    '输入、输出和总 token 用量。',
    'Input, output, and total token usage.'
  )
];

export const docGroups = [
  { id: 'text', label: text('文本与对话', 'Text & chat') },
  { id: 'images', label: text('图像生成', 'Images') },
  { id: 'audio', label: text('音频与语音', 'Audio & speech') },
  { id: 'embeddings', label: text('向量嵌入', 'Embeddings') },
  { id: 'models', label: text('模型', 'Models') }
];

export const apiDocs: ApiDoc[] = [
  {
    slug: 'api/chat-completions',
    title: text('创建对话', 'Chat completions'),
    group: 'text',
    description: text(
      '通过统一的 OpenAI 兼容接口，与不同厂商的模型进行对话。支持多轮消息、多模态输入、工具调用和流式输出。',
      'Create conversations with models from different providers through one OpenAI-compatible endpoint. Supports multi-turn messages, multimodal input, tool calling, and streaming.'
    ),
    method: 'POST',
    path: '/v1/chat/completions',
    protocol: 'OpenAI',
    fields: [
      model,
      messages,
      stream,
      field(
        'temperature',
        'number',
        '采样温度，通常为 0–2。支持范围取决于模型。',
        'Sampling temperature, typically 0–2. Supported values depend on the model.'
      ),
      field(
        'max_completion_tokens',
        'integer',
        '生成 token 的上限；请确认模型支持该参数。',
        'Upper limit for generated tokens. Check that the model supports this parameter.'
      ),
      field(
        'tools',
        'array<object>',
        '可供模型调用的工具定义。',
        'Definitions of tools the model may call.',
        false,
        [
          field(
            'type',
            'string',
            '工具类型，函数工具使用 function。',
            'Tool type. Use function for function tools.',
            true
          ),
          field(
            'function',
            'object',
            '函数 name、description 和 parameters（JSON Schema）。',
            'Function name, description, and parameters (JSON Schema).',
            true
          )
        ]
      ),
      field(
        'response_format',
        'object',
        '输出格式，例如 {"type":"json_object"}。需模型支持。',
        'Output format, for example {"type":"json_object"}. Requires model support.'
      )
    ],
    body: {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! Tell me about yourself.' }
      ],
      stream: false
    },
    response: {
      id: 'chatcmpl-example',
      object: 'chat.completion',
      created: 1750000000,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! I am an AI assistant. How can I help you?'
          },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 24, completion_tokens: 18, total_tokens: 42 }
    },
    responseFields: [
      field(
        'id',
        'string',
        '本次生成的唯一标识。',
        'Unique identifier for the completion.'
      ),
      field(
        'choices',
        'array<object>',
        '生成结果列表，文本位于 message.content。',
        'Generated choices. Text is in message.content.'
      ),
      usage
    ],
    streaming: text(
      '将 stream 设为 true，逐条读取 data: 事件中的 choices[0].delta.content，收到 data: [DONE] 后结束。使用 cURL 时添加 -N 关闭输出缓冲。',
      'Set stream to true and read choices[0].delta.content from each data: event until data: [DONE]. With cURL, add -N to disable output buffering.'
    )
  },
  {
    slug: 'api/responses',
    title: text('创建响应', 'Responses'),
    group: 'text',
    description: text(
      '使用 OpenAI Responses 格式提交输入，获取文本或工具调用结果。适合使用 Responses API 的应用与客户端。',
      'Submit input in the OpenAI Responses format to generate text or tool calls. Designed for applications and clients using the Responses API.'
    ),
    method: 'POST',
    path: '/v1/responses',
    protocol: 'OpenAI',
    fields: [
      model,
      field(
        'input',
        'string | array',
        '文本输入或结构化输入项。',
        'Text input or structured input items.',
        true
      ),
      field(
        'instructions',
        'string',
        '指导模型行为的系统指令。',
        'System instructions that guide model behavior.'
      ),
      stream,
      field(
        'max_output_tokens',
        'integer',
        '输出 token 数量上限。',
        'Maximum number of output tokens.'
      ),
      field(
        'previous_response_id',
        'string',
        '关联上一次响应；支持情况取决于上游渠道。',
        'Link a previous response. Availability depends on the upstream channel.'
      )
    ],
    body: {
      model: 'gpt-4o-mini',
      input: 'Explain what an API is in one sentence.',
      stream: false
    },
    response: {
      id: 'resp_example',
      object: 'response',
      status: 'completed',
      model: 'gpt-4o-mini',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'An API lets applications communicate through a defined interface.'
            }
          ]
        }
      ],
      usage: { input_tokens: 13, output_tokens: 12, total_tokens: 25 }
    },
    responseFields: [
      field(
        'output',
        'array<object>',
        '输出项；文本消息的 content 中包含 output_text。',
        'Output items. Text message content contains output_text.'
      ),
      field(
        'status',
        'string',
        '响应状态，例如 completed。',
        'Response status, such as completed.'
      ),
      usage
    ],
    streaming: text(
      '流式响应使用命名 SSE 事件，例如 response.output_text.delta 和 response.completed；事件结构不同于 Chat Completions。',
      'Streaming uses named SSE events such as response.output_text.delta and response.completed. The event format differs from Chat Completions.'
    )
  },
  {
    slug: 'api/messages',
    title: text('Claude 原生对话', 'Claude messages'),
    group: 'text',
    description: text(
      '使用 Anthropic Messages 原生格式调用 Claude，兼容 Claude SDK 的消息结构。',
      'Call Claude with the native Anthropic Messages format, compatible with message structures used by the Claude SDK.'
    ),
    method: 'POST',
    path: '/v1/messages',
    protocol: 'Anthropic',
    headers: { 'anthropic-version': '2023-06-01' },
    fields: [
      model,
      field(
        'messages',
        'array<object>',
        'user 和 assistant 消息列表；系统提示请放在 system 字段。',
        'A list of user and assistant messages. Put the system prompt in system.',
        true
      ),
      field(
        'max_tokens',
        'integer',
        '最大生成 token 数。',
        'Maximum number of generated tokens.',
        true
      ),
      field(
        'system',
        'string | array',
        '系统提示文本或内容块。',
        'System prompt text or content blocks.'
      ),
      stream
    ],
    body: {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello, Claude!' }]
    },
    response: {
      id: 'msg_example',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-20250514',
      content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 11, output_tokens: 12 }
    },
    responseFields: [
      field(
        'content',
        'array<object>',
        '生成的内容块，文本块的 type 为 text。',
        'Generated content blocks. Text blocks have type text.'
      ),
      field(
        'stop_reason',
        'string',
        '停止原因，例如 end_turn、max_tokens 或 tool_use。',
        'Stop reason, such as end_turn, max_tokens, or tool_use.'
      ),
      usage
    ],
    note: text(
      '此端点同时支持 Authorization: Bearer 和 x-api-key 鉴权。使用 Anthropic SDK 时，将 base_url 设置为 API 根地址，不附加 /v1。',
      'This endpoint accepts Authorization: Bearer and x-api-key. When using the Anthropic SDK, set base_url to the API root without /v1.'
    ),
    streaming: text(
      '流式输出遵循 Anthropic 的 message_start、content_block_delta、message_stop 等 SSE 事件格式。',
      'Streaming follows Anthropic SSE events, including message_start, content_block_delta, and message_stop.'
    )
  },
  {
    slug: 'api/gemini',
    title: text('Gemini 原生对话', 'Gemini generate content'),
    group: 'text',
    description: text(
      '通过 Gemini 原生接口发送文本和多模态内容，保留 contents、parts 与 generationConfig 等原生结构。',
      'Send text and multimodal content through the native Gemini endpoint, preserving contents, parts, and generationConfig.'
    ),
    method: 'POST',
    path: '/v1beta/models/{model}:generateContent',
    protocol: 'Google Gemini',
    pathFields: geminiPath,
    fields: [
      contents,
      field(
        'generationConfig',
        'object',
        '生成配置，例如 temperature 和 maxOutputTokens。',
        'Generation settings such as temperature and maxOutputTokens.'
      )
    ],
    body: {
      contents: [
        { role: 'user', parts: [{ text: 'Explain how an API gateway works.' }] }
      ]
    },
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                text: 'An API gateway routes client requests to the appropriate service.'
              }
            ]
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 14,
        totalTokenCount: 24
      }
    },
    responseFields: geminiResponseFields,
    note: text(
      '模型 ID 填入 URL 路径。除 Bearer Token 外，也支持 x-goog-api-key 请求头。',
      'Place the model ID in the URL path. Both Bearer tokens and the x-goog-api-key header are supported.'
    ),
    streaming: text(
      '流式调用使用 /v1beta/models/{model}:streamGenerateContent?alt=sse，请求体保持相同。',
      'For streaming, use /v1beta/models/{model}:streamGenerateContent?alt=sse with the same request body.'
    )
  },
  {
    slug: 'api/images',
    title: text('生成图像', 'Image generations'),
    group: 'images',
    description: text(
      '根据文本描述生成图像。不同图像模型支持的尺寸、质量和返回格式有所不同。',
      'Generate images from a text prompt. Supported sizes, quality settings, and response formats vary by model.'
    ),
    method: 'POST',
    path: '/v1/images/generations',
    protocol: 'OpenAI',
    fields: [
      model,
      field(
        'prompt',
        'string',
        '图像的文本描述。',
        'A text description of the desired image.',
        true
      ),
      field(
        'n',
        'integer',
        '生成数量，受模型限制。',
        'Number of images, subject to model limits.'
      ),
      field(
        'size',
        'string',
        '图像尺寸，例如 1024x1024，具体以模型支持为准。',
        'Image size, such as 1024x1024, subject to model support.'
      ),
      field(
        'quality',
        'string',
        '图像质量，可选值因模型而异。',
        'Image quality. Accepted values vary by model.'
      ),
      field(
        'response_format',
        'string',
        '部分模型支持 url 或 b64_json；gpt-image 系列通常返回 Base64。',
        'Some models accept url or b64_json. The gpt-image family generally returns Base64.'
      )
    ],
    body: {
      model: 'gpt-image-1',
      prompt: 'A quiet mountain lake at sunrise, editorial photography.',
      n: 1,
      size: '1024x1024'
    },
    response: {
      created: 1750000000,
      data: [{ b64_json: '<base64-encoded-image>' }]
    },
    responseFields: [
      field(
        'created',
        'integer',
        '生成时间，Unix 秒时间戳。',
        'Creation time as a Unix timestamp in seconds.'
      ),
      field(
        'data',
        'array<object>',
        '图像结果列表，包含 url 或 b64_json。',
        'Image results containing url or b64_json.'
      )
    ],
    note: text(
      '图像生成耗时通常比文本更长，请为客户端设置足够的请求超时。示例中的 Base64 内容已省略。',
      'Image generation can take longer than text. Set a sufficient client timeout. Base64 data is omitted in this example.'
    )
  },
  {
    slug: 'api/audio-speech',
    title: text('文本转语音', 'Text to speech'),
    group: 'audio',
    description: text(
      '将文本转换为自然语音，响应直接返回音频文件。',
      'Convert text into natural speech. The response contains the audio file directly.'
    ),
    method: 'POST',
    path: '/v1/audio/speech',
    protocol: 'OpenAI',
    binary: true,
    fields: [
      model,
      field(
        'input',
        'string',
        '要转换为语音的文本。',
        'Text to convert into speech.',
        true
      ),
      field(
        'voice',
        'string',
        '声音名称，例如 alloy；可选声音取决于模型。',
        'Voice name, such as alloy. Available voices depend on the model.',
        true
      ),
      field(
        'response_format',
        'string',
        '音频格式，例如 mp3、opus、aac、flac、wav 或 pcm，需模型支持。',
        'Audio format such as mp3, opus, aac, flac, wav, or pcm, subject to model support.'
      ),
      field(
        'speed',
        'number',
        '语速，支持范围由上游模型决定。',
        'Speech speed. Supported values depend on the upstream model.'
      )
    ],
    body: {
      model: 'tts-1',
      input: 'Welcome to LinkInfra. Build something great.',
      voice: 'alloy',
      response_format: 'mp3'
    },
    response:
      'HTTP/1.1 200 OK\nContent-Type: audio/mpeg\n\n<binary audio data>',
    responseFields: [
      field(
        'audio',
        'binary',
        '音频二进制数据，请保存为对应格式的文件。',
        'Binary audio data. Save it as a file in the requested format.'
      )
    ]
  },
  {
    slug: 'api/audio-transcriptions',
    title: text('语音转文字', 'Audio transcriptions'),
    group: 'audio',
    description: text(
      '上传音频文件并转录为文字。使用 multipart/form-data 提交文件。',
      'Upload an audio file and transcribe it into text using multipart/form-data.'
    ),
    method: 'POST',
    path: '/v1/audio/transcriptions',
    protocol: 'OpenAI',
    multipart: true,
    fields: [
      model,
      field(
        'file',
        'file',
        '音频文件，例如 mp3、wav、m4a。大小和格式限制由上游决定。',
        'An audio file, such as mp3, wav, or m4a. File size and format limits depend on the upstream.',
        true
      ),
      field(
        'language',
        'string',
        '音频语言的 ISO-639-1 代码，例如 zh 或 en。',
        'ISO-639-1 language code, such as zh or en.'
      ),
      field(
        'prompt',
        'string',
        '可选上下文，用于指导转录风格和专有名词。',
        'Optional context to guide transcription style and proper nouns.'
      ),
      field(
        'response_format',
        'string',
        '返回格式，例如 json 或 text，需模型支持。',
        'Response format, such as json or text, subject to model support.'
      )
    ],
    body: { model: 'whisper-1', file: 'audio.mp3', response_format: 'json' },
    response: { text: 'Welcome to LinkInfra.' },
    responseFields: [
      field(
        'text',
        'string',
        '转录得到的文字。示例为默认 JSON 返回格式。',
        'Transcribed text. The example uses the default JSON response format.'
      )
    ],
    note: text(
      '上传文件时由 HTTP 客户端自动生成 multipart boundary，不要手动设置 Content-Type。',
      'Let the HTTP client generate the multipart boundary. Do not manually set Content-Type for file uploads.'
    )
  },
  {
    slug: 'api/gemini-audio',
    title: text('Gemini 原生语音', 'Gemini native audio'),
    group: 'audio',
    description: text(
      '使用 Gemini 原生格式生成语音，通过 generationConfig 指定音频输出和声音。',
      'Generate speech in the native Gemini format. Configure audio output and voice with generationConfig.'
    ),
    method: 'POST',
    path: '/v1beta/models/{model}:generateContent',
    protocol: 'Google Gemini',
    pathFields: geminiPath,
    fields: [
      contents,
      field(
        'generationConfig',
        'object',
        '语音生成配置。',
        'Speech generation settings.',
        true,
        [
          field(
            'responseModalities',
            'array<string>',
            '使用 ["AUDIO"] 请求音频输出。',
            'Use ["AUDIO"] to request audio output.',
            true
          ),
          field(
            'speechConfig',
            'object',
            '声音配置。',
            'Voice settings.',
            true,
            [
              field(
                'voiceConfig',
                'object',
                '设置 prebuiltVoiceConfig.voiceName，例如 Kore。',
                'Set prebuiltVoiceConfig.voiceName, for example Kore.',
                true
              )
            ]
          )
        ]
      )
    ],
    body: {
      contents: [
        { parts: [{ text: 'Say cheerfully: Welcome to LinkInfra!' }] }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    },
    response: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/L16;codec=pcm;rate=24000',
                  data: '<base64-encoded-audio>'
                }
              }
            ]
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 80,
        totalTokenCount: 92
      }
    },
    responseFields: geminiResponseFields,
    note: text(
      '请选择支持语音输出的 Gemini 模型，例如 gemini-2.5-flash-preview-tts。响应的 inlineData.data 是 Base64 音频，请依据 mimeType 解码；原始 PCM 不能直接作为 MP3 播放。',
      'Choose a speech-capable model, such as gemini-2.5-flash-preview-tts. inlineData.data contains Base64 audio. Decode according to mimeType; raw PCM cannot be played as an MP3 file.'
    )
  },
  {
    slug: 'api/embeddings',
    title: text('创建向量嵌入', 'Create embeddings'),
    group: 'embeddings',
    description: text(
      '将文本转换为数值向量，用于语义搜索、相似度匹配和检索增强生成（RAG）。',
      'Turn text into numerical vectors for semantic search, similarity matching, and retrieval-augmented generation (RAG).'
    ),
    method: 'POST',
    path: '/v1/embeddings',
    protocol: 'OpenAI',
    fields: [
      model,
      field(
        'input',
        'string | array<string>',
        '单条文本或文本列表。',
        'A single text input or a list of texts.',
        true
      ),
      field(
        'encoding_format',
        'string',
        '向量编码格式：float 或 base64。',
        'Embedding encoding: float or base64.'
      ),
      field(
        'dimensions',
        'integer',
        '输出维度，仅支持可配置维度的模型。',
        'Output dimensions, for models that support configurable dimensions.'
      )
    ],
    body: {
      model: 'text-embedding-3-small',
      input: 'Build with one API.',
      encoding_format: 'float'
    },
    response: {
      object: 'list',
      data: [
        { object: 'embedding', index: 0, embedding: [0.0123, -0.0345, 0.0567] }
      ],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 5, total_tokens: 5 }
    },
    responseFields: [
      field(
        'data',
        'array<object>',
        '向量列表，index 对应输入顺序，embedding 为向量数据。',
        'Embeddings in input order, with index and embedding values.'
      ),
      usage
    ],
    note: text(
      '示例向量仅展示前三个维度，实际维度由模型和 dimensions 参数决定。',
      'Only the first three dimensions are shown. Actual dimensions depend on the model and the dimensions parameter.'
    )
  },
  {
    slug: 'api/models',
    title: text('获取模型列表', 'List models'),
    group: 'models',
    description: text(
      '获取服务注册的模型目录，供兼容 OpenAI 的客户端发现模型 ID。实际调用可用性取决于账户分组与渠道配置。',
      'List the registered model catalog for OpenAI-compatible clients. Actual availability depends on your account group and channel configuration.'
    ),
    method: 'GET',
    path: '/v1/models',
    protocol: 'OpenAI',
    fields: [],
    response: {
      object: 'list',
      data: [
        {
          id: 'gpt-4o-mini',
          object: 'model',
          created: 1721174400,
          owned_by: 'openai'
        }
      ]
    },
    responseFields: [
      field(
        'object',
        'string',
        '列表类型，值为 list。',
        'Object type, with value list.'
      ),
      field(
        'data',
        'array<object>',
        '模型对象列表，使用 id 作为请求的 model 参数。',
        'Model objects. Use id as the model parameter in requests.'
      )
    ]
  }
];

export const guideDocs = [
  {
    slug: 'quickstart',
    title: text('快速开始', 'Quickstart'),
    description: text(
      '几分钟内完成第一次 API 调用。',
      'Make your first API request in minutes.'
    )
  },
  {
    slug: 'authentication',
    title: text('身份验证', 'Authentication'),
    description: text(
      'API Key、请求地址与协议配置。',
      'API keys, base URLs, and protocol configuration.'
    )
  },
  {
    slug: 'errors',
    title: text('错误处理', 'Error handling'),
    description: text(
      '理解 HTTP 状态码并处理请求失败。',
      'Understand HTTP status codes and handle failed requests.'
    )
  }
];

export const allDocs = [...guideDocs, ...apiDocs];

export function findApiDoc(slug: string) {
  return apiDocs.find((doc) => doc.slug === slug);
}

export function resolveApiRoot(address: string): string | null {
  try {
    const url = new URL(address.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.href.replace(/\/+$/, '').replace(/\/v1$/, '');
  } catch {
    return null;
  }
}
