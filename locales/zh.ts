const zh = {
  // nav
  nav: {
    home: 'Home',
    models: 'Models',
    docs: 'Docs',
    marketplace: 'Marketplace',
    signIn: 'Sign in',
    dashboard: 'Dashboard'
  },
  // user menu
  userMenu: {
    profile: 'Profile',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Sign out'
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
    title: 'Model marketplace',
    subtitle: '{count} models available across multiple AI providers',
    search: 'Search models...',
    providers: 'Provider',
    userTier: 'User tier',
    billingType: 'Billing type',
    all: 'All',
    tokenBased: 'Pay per use',
    perCall: 'Pay per call',
    perCallShort: 'Per call',
    tokenBasedShort: 'Per use',
    input: 'Input',
    output: 'Output',
    perUnit: 'Per request',
    inputPrice: 'Input price/M',
    outputPrice: 'Output price/M',
    modelName: 'Model name',
    provider: 'Provider',
    discount: 'Discount',
    noResults: 'No matching models found',
    prevPage: 'Previous',
    nextPage: 'Next',
    copyModel: 'Copy model name',
    signIn: 'Sign in',
    backHome: 'Home'
  },
  // model detail
  modelDetail: {
    back: 'Back to marketplace',
    performance: 'Performance',
    successRate: 'Success rate',
    avgLatency: 'Avg latency',
    avgSpeed: 'Avg speed',
    inputPrice: 'Input price',
    outputPrice: 'Output price',
    priceType: 'Billing type',
    requests24h: '24h requests',
    latencyTrend: 'Latency trend',
    speedTrend: 'Speed (TPS)',
    successRateTrend: 'Success rate trend',
    tokenUsage: 'Usage analytics',
    pricingDetail: 'Pricing details',
    userTier: 'User tier',
    channelDetail: 'Channel breakdown',
    channelName: 'Channel name',
    adminOnly: 'Admin only',
    ttftDesc: 'Time to first token',
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Error',
    noData: 'No data'
  },
  // log billing detail
  logDetail: {
    channelInfo: 'Channel',
    promptTokens: 'Prompt tokens',
    completionTokens: 'Completion tokens',
    cachedTokens: 'Cached tokens',
    cost: 'Cost',
    logContent: 'Log details',
    noDetails: 'No details available',
    modelPrice: 'Model price',
    billingProcess: 'Billing breakdown',
    billingMode: 'Billing mode',
    tokenBilling: 'Token-based billing',
    fixedPrice: 'Fixed price',
    perMillionInput: '/ 1M input tokens',
    perMillionOutput: '/ 1M output tokens',
    perMillionCached: '/ 1M cached tokens',
    perMillionCache5m: '/ 1M 5-min cache creation tokens',
    perMillionCache1h: '/ 1M 1-hr cache creation tokens',
    perMillionCacheRead: '/ 1M cache read tokens',
    perRequest: '/ call',
    referenceOnly: 'For reference only. Actual charges may vary.',
    groupRatio: 'Group multiplier',
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    inputText: 'Text input',
    inputImage: 'Image input',
    outputText: 'Text output',
    outputImage: 'Image output',
    outputReasoning: 'Reasoning output',
    cacheRead: 'Cache read',
    cacheCreation: 'Cache creation',
    claudeCache5m: 'Claude 5-min cache creation',
    claudeCache1h: 'Claude 1-hr cache creation',
    speed: 'Generation speed',
    collapse: 'Collapse details',
    expand: 'Expand details',
    discountBreakdown: 'Discount split',
    tierRatio: 'Tier discount',
    channelDiscount: 'Channel discount',
    userChannelDiscount: 'User channel discount',
    keyIndex: 'Key index'
  },
  // pricing / model ratio settings
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
    fixedPrice: 'Fixed price',
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
    breadcrumbSettings: 'System settings'
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
      models: 'Models',
      pricing: 'Pricing',
      docs: 'Docs',
      changelog: 'Changelog',
      enterprise: 'Enterprise',
      signIn: 'Sign in',
      startBuilding: 'Start building',
      dashboard: 'Dashboard'
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
      primary: 'Primary model'
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
        models: 'Models',
        pricing: 'Pricing',
        dashboard: 'Dashboard',
        changelog: 'Changelog',
        documentation: 'Documentation',
        apiReference: 'API reference',
        sdks: 'SDKs',
        status: 'Status',
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
      copy: 'Copy',
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
        provider: 'Provider',
        model: 'Model',
        tokens: 'tokens',
        latency: 'Latency',
        cost: 'Cost',
        nativeNote: 'Native protocol · Zero translation'
      },
      promptLabel: '>  prompt',
      doneLabel: '✓ Done'
    }
  },
  // dashboard
  dashboard: {
    welcome: 'Hello',
    welcomeBack: 'Welcome back',
    tabs: {
      overview: 'Overview',
      analytics: 'Analytics'
    },
    cards: {
      balance: {
        title: 'Available quota',
        used: 'Used',
        usedRatio: 'Usage'
      },
      throughput: {
        title: 'Live throughput',
        tpm: 'Tokens / min',
        rpm: 'Requests / min',
        qpm: 'Credits / min'
      },
      today: {
        title: "Today's usage",
        requests: 'Requests',
        spend: 'Credits spent'
      }
    },
    popularModels: {
      title: 'Top models',
      description: '{count} models called today'
    }
  },
  // user management
  userPage: {
    title: 'Users',
    countSuffix: 'users',
    description: 'Manage system users',
    addNew: 'Add user',
    columns: {
      id: 'ID',
      username: 'Username',
      displayName: 'Display name',
      email: 'Email',
      group: 'Group',
      statistics: 'Usage stats',
      role: 'Role',
      status: 'Status',
      actions: 'Actions'
    },
    stats: {
      balance: 'Balance',
      used: 'Used',
      requests: 'Requests'
    },
    role: {
      user: 'User',
      admin: 'Admin',
      root: 'Super admin',
      unknown: 'Unknown'
    },
    status: {
      activated: 'Active',
      disabled: 'Disabled',
      unknown: 'Unknown'
    },
    actions: {
      label: 'Actions',
      update: 'Edit',
      delete: 'Delete',
      disable: 'Disable',
      enable: 'Enable',
      promote: 'Promote',
      demote: 'Demote'
    }
  },
  // channel management
  channelPage: {
    title: 'Channels',
    countSuffix: 'channels',
    description: 'Manage AI channels and load balancing',
    addNew: 'Add channel',
    columns: {
      id: 'ID',
      name: 'Name',
      group: 'Group',
      type: 'Type',
      priority: 'Priority',
      weight: 'Weight',
      status: 'Status',
      responseTime: 'Response time',
      usedQuota: 'Used quota',
      actions: 'Actions'
    },
    status: {
      enabled: 'Enabled',
      manuallyDisabled: 'Manually disabled',
      autoDisabled: 'Auto-disabled',
      unknown: 'Unknown',
      updating: 'Updating…'
    },
    bulk: {
      delete: 'Delete',
      disable: 'Disable',
      enable: 'Enable'
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
