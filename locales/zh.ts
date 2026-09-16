const zh = {
  // nav
  nav: {
    home: '首页',
    models: '模型',
    docs: '文档',
    marketplace: '模型广场',
    signIn: '登录',
    dashboard: 'Console'
  },
  // user menu
  userMenu: {
    profile: '个人资料',
    billing: '钱包与账单',
    settings: '设置',
    logout: '退出登录'
  },
  // Hero
  hero: {
    titlePrefix: 'Unified AI Model',
    titleHighlight: 'API Gateway',
    description:
      'Supports OpenAI, Claude, Gemini, DeepSeek, and all major LLMs. One API for every AI capability — unified auth, unified billing, effortless model switching.',
    getStarted: 'Get started',
    viewDocs: 'View docs'
  },
  // stats
  stats: {
    models: 'Models supported',
    modelsValue: '100+',
    developers: 'Developers',
    developersValue: '10,000+',
    uptime: 'Uptime',
    uptimeValue: '99.9%',
    apiCalls: 'Daily requests',
    apiCallsValue: '10M+'
  },
  // features
  features: {
    title: 'Core capabilities',
    subtitle: 'The easiest way for developers to integrate AI models',
    multiModel: {
      title: 'Multi-model aggregation',
      description:
        'Supports OpenAI, Claude, Gemini, DeepSeek, and dozens of leading AI models — all accessible through one unified API.'
    },
    billing: {
      title: 'Unified billing',
      description:
        'Manage usage and costs across all models from a single account. Better pricing, full transparency.'
    },
    performance: {
      title: 'High availability, low latency',
      description:
        'Multi-region deployment with intelligent load balancing and automatic failover for maximum uptime.'
    },
    security: {
      title: 'Security & compliance',
      description:
        'Enterprise-grade encryption, granular access controls, API key management, and full audit logging.'
    },
    sdk: {
      title: 'Developer-friendly',
      description:
        'OpenAI SDK-compatible. Comprehensive API docs and code samples — integrate in minutes with zero learning curve.'
    },
    monitoring: {
      title: 'Real-time monitoring',
      description:
        'Visual usage dashboard to track token consumption, request latency, and call success rates in real time.'
    }
  },
  // CTA
  cta: {
    title: 'Start building today',
    description: 'Sign up for free credits and try every AI model instantly.',
    button: 'Sign up free'
  },
  // Footer
  footer: {
    rights: 'All rights reserved.'
  },
  // model marketplace
  modelPlaza: {
    title: '模型广场',
    subtitle: '共 {count} 个模型，覆盖多家 AI 提供商',
    search: '搜索模型…',
    providers: '提供商',
    userTier: '用户等级',
    billingType: '计费方式',
    all: '全部',
    tokenBased: '按 Token',
    perCall: '按次',
    perCallShort: '按次',
    tokenBasedShort: '按 Token',
    billingExplanation:
      '按 Token：根据输入和输出的 Token 数量计费。按次：每次请求按标价计费。/M 表示每百万 Token。',
    input: '输入',
    output: '输出',
    perUnit: '每次请求',
    inputPrice: '输入价格 / 百万 Token',
    outputPrice: '输出价格 / 百万 Token',
    modelName: '模型名称',
    provider: '提供商',
    discount: '折扣',
    noResults: '没有匹配的模型',
    prevPage: '上一页',
    nextPage: '下一页',
    copyModel: '复制模型名称',
    signIn: '登录',
    backHome: '首页'
  },
  // model detail
  modelDetail: {
    back: '返回模型广场',
    performance: '性能',
    successRate: '成功率',
    avgLatency: '平均延迟',
    avgSpeed: '平均速度',
    inputPrice: '输入价格',
    outputPrice: '输出价格',
    priceType: '计费方式',
    requests24h: '24 小时请求量',
    latencyTrend: '延迟趋势',
    speedTrend: '生成速度（Token/秒）',
    successRateTrend: '成功率趋势',
    tokenUsage: '用量分析',
    pricingDetail: '价格详情',
    userTier: '用户等级',
    channelDetail: '渠道详情',
    channelName: '渠道名称',
    adminOnly: '仅管理员可见',
    ttftDesc: '首个 Token 延迟',
    healthy: '正常',
    degraded: '性能下降',
    down: '错误',
    noData: '暂无数据'
  },
  // log billing detail
  logDetail: {
    channelInfo: '渠道',
    promptTokens: '输入 Token',
    completionTokens: '输出 Token',
    cachedTokens: '缓存 Token',
    cost: '费用',
    logContent: '请求详情',
    noDetails: '暂无详情',
    modelPrice: '模型价格',
    billingProcess: '计费明细',
    billingMode: '计费模式',
    tokenBilling: '按 Token 计费',
    fixedPrice: '按次价格',
    perMillionInput: '/ 1M input tokens',
    perMillionOutput: '/ 1M output tokens',
    perMillionCached: '/ 1M cached tokens',
    perMillionCache5m: '/ 1M 5-min cache creation tokens',
    perMillionCache1h: '/ 1M 1-hr cache creation tokens',
    perMillionCacheRead: '/ 1M cache read tokens',
    perRequest: '/ call',
    referenceOnly: 'For reference only. Actual charges may vary.',
    groupRatio: 'Group multiplier',
    inputTokens: '输入 Token',
    outputTokens: '输出 Token',
    inputText: 'Text input',
    inputImage: 'Image input',
    outputText: 'Text output',
    outputImage: 'Image output',
    outputReasoning: 'Reasoning output',
    cacheRead: 'Cache read',
    cacheCreation: 'Cache creation',
    claudeCache5m: 'Claude 5-min cache creation',
    claudeCache1h: 'Claude 1-hr cache creation',
    speed: '生成速度',
    collapse: '收起详情',
    expand: '展开详情',
    discountBreakdown: 'Discount split',
    tierRatio: 'Tier discount',
    channelDiscount: 'Channel discount',
    userChannelDiscount: 'User channel discount',
    keyIndex: 'Key index'
  },
  // pricing / model ratio settings
  durationPricing: {
    title: '按时长计费',
    description:
      '按上游返回的音频转写时长计费，单位为美元/分钟，不足一分钟按实际秒数折算，并应用分组折扣。视频模型请在“视频定价”中配置。',
    models: '模型名称',
    modelsHint:
      '每行一个模型，所有填写的模型使用相同单价。请填写客户端请求使用的完整模型名。',
    model: '模型名称',
    price: '时长单价（美元/分钟）',
    priceHint: '填写 0 表示免费，留空不会设置价格。',
    example: '示例：90 秒 × 0.006 美元/分钟 ÷ 60 = 0.009 美元（折扣前）。',
    save: '保存时长价格',
    saving: '保存中…',
    saved: '时长计费配置已保存。',
    saveFailed: '时长计费配置保存失败。',
    loadFailed: '无法加载时长计费配置，请刷新重试。',
    unsupported: '当前后端不支持时长计费，请先更新后端。',
    invalid: '请填写至少一个模型，以及大于或等于 0 的有效价格。',
    remove: '取消按时长计费',
    removeHint:
      '取消后移除时长价格，恢复已有的按次或 Token 配置。必须按时长计费的模型需要重新设置时长价格才能使用。',
    refresh: '刷新',
    search: '搜索按时长计费的模型…',
    billingType: '计费方式',
    perDuration: '按时长',
    actions: '操作',
    edit: '编辑',
    loading: '加载中…',
    empty: '暂无匹配的时长价格。',
    configure: '配置按时长计费',
    configureSelected: '为所选模型设置时长价格'
  },
  pricing: {
    title: 'Model pricing',
    tabRatioSettings: 'Model ratios',
    tabVisualPricing: 'Visual ratio editor',
    tabUnsetModels: 'Models without ratios',
    tabVideoPricing: 'Video model pricing',
    saving: 'Saving...',
    save: 'Save settings',
    saveSuccess: 'Saved.',
    saveFailed: 'Save failed. Please try again.',
    jsonInvalid: '{field} contains invalid JSON. Please check the syntax.',
    fixedPrice: '按次价格',
    fixedPriceHint: 'Cost per call in USD. Takes priority over model ratio.',
    modelRatio: 'Model ratio',
    cacheRatio: 'Prompt cache ratio',
    cacheRatioHint:
      'Price multiplier for cached tokens relative to input tokens (e.g. Claude cache read is 0.1, a 90% discount).',
    completionRatio: 'Completion ratio (custom models only)',
    completionRatioHint: 'Applies to custom models only.',
    imageInputRatio: 'Image input ratio (select models only)',
    imageOutputRatio: 'Image output ratio (select models only)',
    audioInputRatio: 'Audio input ratio (select models only)',
    audioOutputRatio: 'Audio output ratio (select models only)',
    breadcrumbSettings: '系统设置'
  },
  // channel form (billing)
  channelForm: {
    discountLabel: 'Channel discount multiplier',
    discountPlaceholder: '1.0 = no discount, 0.7 = 30% off'
  },
  // user × channel type discount editor
  channelRatios: {
    title: 'Channel type discounts',
    descriptionPrefix:
      'Multiplied with channel and tier discounts after being set. Example: set to 0.8, final charge is',
    formulaCode: 'model list price × channel discount × tier discount × 0.8',
    descriptionSuffix: 'Leave blank to default to 1.0.'
  },
  // v3 Landing page
  landing: {
    nav: {
      models: '模型',
      pricing: 'Pricing',
      docs: '文档',
      changelog: 'Changelog',
      enterprise: 'Enterprise',
      signIn: '登录',
      startBuilding: 'Start building',
      dashboard: 'Console'
    },
    hero: {
      badgeTag: 'New',
      badgeText: 'Claude Opus 4.7 is now available',
      titleLine1: 'One key.',
      titleLine2Em: 'Every frontier model.',
      lede: "Speak OpenAI, Anthropic, and Google's native protocols directly — drop it into the SDK you're already using. No translation layer, no rewrites, no lock-in.",
      createAccount: 'Sign up free →',
      readDocs: 'Read the docs',
      subtle: 'Free credits · No credit card · Cancel anytime'
    },
    marquee: {
      label: '· One API · Every provider ·'
    },
    statement: {
      line1Strong: 'One key.',
      line1Em: 'Every model.',
      line2Em: 'Zero lock-in.',
      sub: 'Built for shipping teams. Automatic failover, production-grade observability, enterprise SLA — out of the box.'
    },
    models: {
      eyebrow: 'Top models this week',
      title: 'Frontier models,',
      titleEm: 'ranked.',
      viewAll: 'View all 180+ models'
    },
    pillars: {
      eyebrow: 'Built for production',
      title: 'Not a middleman.',
      titleEm: 'Infrastructure.',
      sub: 'Everything you need to run AI in production — without building your own gateway.',
      integration: {
        num: '01 · Integration',
        title: 'Every model,',
        titleEm: 'one key.',
        desc: 'Switch between 180+ models by changing a single string. No SDK changes, no vendor lock-in, no weekend migrations.'
      },
      reliability: {
        num: '02 · Reliability',
        title: 'Automatic',
        titleEm: 'failover.',
        desc: "When a provider goes down, we route to the next best endpoint in the same family. Your app won't even blink."
      },
      observability: {
        num: '03 · Observability',
        title: 'Insights,',
        titleEm: 'on by default.',
        desc: 'Every request logs cost, latency, tokens, and model. Per-key analytics, anomaly webhooks, and usage dashboards included.'
      }
    },
    apps: {
      eyebrow: 'Built on EZLINK',
      title: 'Teams shipping AI',
      titleEm: 'at scale.',
      sub: 'From weekend projects to Series C companies — these apps are routing through EZLINK this week.',
      seeAll: 'See all apps',
      primary: '主要模型'
    },
    trust: {
      eyebrow: 'Enterprise',
      title: 'Ready for',
      titleEm: 'the last mile.',
      sub: 'Everything procurement, security, and legal will ask — answered before they ask.',
      talkToSales: 'Talk to sales',
      compliance: {
        label: 'Compliance',
        value: 'SOC 2 Type II',
        sub: 'GDPR · HIPAA eligible'
      },
      availability: {
        label: 'Availability',
        value: '99.99% SLA',
        sub: 'Contractual. Credits on breach.'
      },
      support: {
        label: 'Support',
        value: 'Dedicated 24/7',
        sub: 'Shared Slack · 15-min response'
      },
      deployment: {
        label: 'Deployment',
        value: 'Single-tenant',
        sub: 'VPC · Self-hostable'
      }
    },
    finalCta: {
      titleLine1: 'Any model,',
      titleEm: '',
      titleLine2: 'shipping today.',
      sub: 'Free credits on signup. No credit card. No lock-in.',
      createAccount: 'Sign up free →',
      readDocs: 'Read the docs'
    },
    footer: {
      aboutDesc:
        'The production-ready unified AI gateway. One API, every frontier model, zero vendor lock-in.',
      sections: {
        product: 'Product',
        developers: 'Developers',
        company: 'Company',
        legal: 'Legal'
      },
      links: {
        models: '模型',
        pricing: 'Pricing',
        dashboard: 'Console',
        changelog: 'Changelog',
        documentation: 'Documentation',
        apiReference: 'API reference',
        sdks: 'SDKs',
        status: '状态',
        enterprise: 'Enterprise',
        security: 'Security',
        blog: 'Blog',
        careers: 'Careers',
        terms: 'Terms',
        privacy: 'Privacy',
        sla: 'SLA',
        dpa: 'DPA'
      },
      copyright: 'All rights reserved.',
      status: 'All systems operational'
    },
    playground: {
      replay: 'Replay',
      copy: '复制',
      copied: 'Copied',
      status: {
        ready: 'Ready',
        streaming: 'Streaming…'
      },
      file: {
        curl: 'request.sh',
        python: 'example.py',
        javascript: 'example.js'
      },
      metrics: {
        provider: '提供商',
        model: 'Model',
        tokens: 'tokens',
        latency: 'Latency',
        cost: '费用',
        nativeNote: 'Native protocol · Zero translation'
      },
      promptLabel: '>  prompt',
      doneLabel: '✓ Done'
    }
  },
  // dashboard
  dashboard: {
    welcome: '你好',
    welcomeBack: '欢迎回来',
    tabs: {
      overview: '概览',
      analytics: '分析'
    },
    cards: {
      balance: {
        title: '可用额度',
        used: '已用额度',
        usedRatio: '用量记录'
      },
      throughput: {
        title: '实时吞吐量',
        tpm: 'Token / 分钟',
        rpm: '请求 / 分钟',
        qpm: '额度 / 分钟'
      },
      today: {
        title: '今日用量',
        requests: '请求数',
        spend: '已消耗额度'
      }
    },
    popularModels: {
      title: '热门模型',
      description: '今日调用了 {count} 个模型'
    }
  },
  // user management
  userPage: {
    title: '用户',
    countSuffix: 'users',
    description: 'Manage system users',
    addNew: 'Add user',
    columns: {
      id: 'ID',
      username: 'Username',
      displayName: 'Display name',
      email: 'Email',
      group: 'Group',
      inviter: '邀请人',
      statistics: 'Usage stats',
      role: 'Role',
      status: '状态',
      actions: '操作'
    },
    stats: {
      balance: '余额',
      used: '已用额度',
      requests: '请求数'
    },
    role: {
      user: '用户',
      admin: 'Admin',
      root: 'Super admin',
      unknown: '未知'
    },
    status: {
      activated: 'Active',
      disabled: '已禁用',
      unknown: '未知'
    },
    actions: {
      label: '操作',
      update: 'Edit',
      delete: '删除',
      disable: '禁用',
      enable: '启用',
      promote: 'Promote',
      demote: 'Demote'
    }
  },
  // channel management
  channelPage: {
    title: '渠道',
    countSuffix: 'channels',
    description: 'Manage AI channels and load balancing',
    addNew: 'Add channel',
    columns: {
      id: 'ID',
      name: '名称',
      group: 'Group',
      type: 'Type',
      priority: 'Priority',
      weight: 'Weight',
      status: '状态',
      responseTime: 'Response time',
      usedQuota: 'Used quota',
      actions: '操作'
    },
    status: {
      enabled: '已启用',
      manuallyDisabled: 'Manually disabled',
      autoDisabled: 'Auto-disabled',
      unknown: '未知',
      updating: 'Updating…'
    },
    bulk: {
      delete: '删除',
      disable: '禁用',
      enable: '启用'
    },
    response: {
      untested: 'Untested',
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      slow: 'Needs optimization',
      lastTest: 'Last tested'
    },
    overlay: {
      processing: 'Processing…'
    }
  }
};

// Deep type that widens all string literals to string
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export default zh;
export type Locale = DeepString<typeof zh>;
