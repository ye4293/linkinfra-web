'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Copy,
  Terminal,
  KeyRound,
  Network,
  ShieldCheck
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import s from './home.module.css';
import { ProviderLogoMark } from '@/sections/model-plaza/components/provider-logo';

export function HomeSections({
  sampleModel,
  start
}: {
  sampleModel: string;
  start: string;
}) {
  const { lang } = useLocale();
  const c = (cn: string, en: string) => (lang === 'zh' ? cn : en);
  const { docsAddress, serverAddress } = useSystemConfig();
  const [codeTab, setCodeTab] = useState('Python');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const apiBase = `${(serverAddress || 'https://api.linkinfra.ai')
    .replace(/\/+$/, '')
    .replace(/\/v1$/, '')}/v1`;
  const snippets: Record<string, string> = {
    Python: `from openai import OpenAI\nimport os\n\nclient = OpenAI(\n    api_key=os.environ["LINKINFRA_API_KEY"],\n    base_url="${apiBase}"\n)\n\nresponse = client.chat.completions.create(\n    model="${sampleModel}",\n    messages=[{"role": "user", "content": "Hello, world!"}]\n)\n\nprint(response.choices[0].message.content)`,
    'Node.js': `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: process.env.LINKINFRA_API_KEY,\n  baseURL: "${apiBase}"\n});\n\nconst response = await client.chat.completions.create({\n  model: "${sampleModel}",\n  messages: [{ role: "user", content: "Hello, world!" }]\n});\n\nconsole.log(response.choices[0].message.content);`,
    cURL: `curl "${apiBase}/chat/completions" \\\n  -H "Authorization: Bearer $LINKINFRA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${sampleModel}",\n    "messages": [\n      {"role": "user", "content": "Hello, world!"}\n    ]\n  }'`
  };
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(snippets[codeTab]);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <section id="developers" className={s.developerSection}>
        <div className={`${s.container} ${s.developerGrid}`}>
          <div className={s.developerCopy}>
            <span className={s.sectionKicker}>
              {c('为开发者而构建', 'Built for developers')}
            </span>
            <h2>
              {c('几行代码，即刻接入。', 'A few lines. You’re connected.')}
            </h2>
            <p>
              {c(
                '使用熟悉的 OpenAI SDK，配置 API 地址、密钥和模型，即可开始调用。',
                'Use the OpenAI SDK you already know. Set your API endpoint, key, and model to make your first request.'
              )}
            </p>
            <ol className={s.steps}>
              <li>
                <span>01</span>
                <div>
                  <strong>
                    {c('创建你的 API Key', 'Create your API key')}
                  </strong>
                  <p>
                    {c(
                      '登录控制台，在令牌管理中创建密钥。',
                      'Sign in and create a key in token management.'
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>
                    {c('配置接入地址与模型', 'Set your endpoint and model')}
                  </strong>
                  <p>
                    {c(
                      '设置环境变量 LINKINFRA_API_KEY，填入目录中的模型 ID。',
                      'Set LINKINFRA_API_KEY and choose a model ID from the catalog.'
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>
                    {c('发送你的第一条请求', 'Make your first request')}
                  </strong>
                  <p>
                    {c(
                      '安装 SDK，运行示例，在控制台查看调用记录。',
                      'Install the SDK, run the example, and inspect your request logs.'
                    )}
                  </p>
                </div>
              </li>
            </ol>
            <a href={docsAddress || start} className={s.primary}>
              {docsAddress
                ? c('阅读接入文档', 'Read the docs')
                : c('获取 API Key', 'Get your API key')}
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className={s.codeWindow}>
            <div className={s.codeTabs}>
              <div aria-label={c('示例语言', 'Example language')}>
                {Object.keys(snippets).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setCodeTab(tab);
                      setCopied(false);
                      setCopyError(false);
                    }}
                    className={codeTab === tab ? s.activeCode : ''}
                    aria-pressed={codeTab === tab}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                className={s.copyButton}
                onClick={copyCode}
                aria-label={c('复制代码', 'Copy code')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? c('已复制', 'Copied') : c('复制', 'Copy')}
              </button>
            </div>
            <div className={s.codeFile}>
              <span className={s.smallDot} />
              {codeTab === 'Python'
                ? 'quickstart.py'
                : codeTab === 'Node.js'
                ? 'quickstart.mjs'
                : 'terminal.sh'}
              <span>{c('兼容 OpenAI 协议', 'OpenAI-compatible')}</span>
            </div>
            <pre
              className={s.codeBody}
              tabIndex={0}
              aria-label={c('API 接入示例代码', 'API integration example code')}
            >
              <code>
                {snippets[codeTab].split('\n').map((line, i) => (
                  <span className={s.codeLine} key={i}>
                    <span aria-hidden="true">{i + 1}</span>
                    <span
                      className={
                        line.includes('base_url') ||
                        line.includes('baseURL') ||
                        line.includes('curl ')
                          ? s.highlightLine
                          : ''
                      }
                    >
                      {line || ' '}
                    </span>
                  </span>
                ))}
              </code>
            </pre>
            <div className={s.codeFooter}>
              <Terminal size={13} />
              <code>
                {codeTab === 'Python'
                  ? 'pip install openai'
                  : codeTab === 'Node.js'
                  ? 'npm install openai'
                  : c(
                      '在终端运行 · 先设置 API Key 环境变量',
                      'Run in terminal · set your API key environment variable first'
                    )}
              </code>
            </div>
            <span className={s.copyFeedback} role="status">
              {copyError
                ? c(
                    '复制失败，请手动选择代码复制。',
                    'Copy failed. Please select and copy the code manually.'
                  )
                : copied
                ? c('代码已复制', 'Code copied')
                : ''}
            </span>
          </div>
        </div>
      </section>

      <section className={`${s.container} ${s.faqSection}`}>
        <div>
          <h2>{c('常见问题', 'Frequently asked questions')}</h2>
          <p>
            {c(
              '关于接入、计费和模型选择。',
              'On integration, pricing, and choosing models.'
            )}
          </p>
        </div>
        <div className={s.faqList}>
          {[
            [
              c(
                '平台现在支持哪些模型？',
                'Which models are available right now?'
              ),
              c(
                '首页模型区直接读取平台公开目录，可以按厂商和名称筛选。完整模型广场提供具体模型的价格与运行指标；实际可调用范围以你的账号权限和渠道配置为准。',
                'The model explorer reads the public platform catalog. Filter by provider or name, then visit the marketplace for pricing and metrics. Actual access depends on your account and channel configuration.'
              )
            ],
            [
              c('如何计算调用费用？', 'How does pricing work?'),
              c(
                'Token 模型分别展示每百万输入和输出 Tokens 的美元价格；按次模型单独标明每次调用费用。可切换价格分组比较，实际结算以账号所属分组和调用记录为准。',
                'Token models list USD prices per million input and output tokens. Per-call models show their cost per request. Compare price groups in the explorer; your account group and request records determine actual billing.'
              )
            ],
            [
              c(
                '现有项目需要改多少代码？',
                'How much of my existing code needs to change?'
              ),
              c(
                '使用 OpenAI 兼容接口时，通常需要调整 base_url、API Key 和模型 ID。不同模型的参数和功能支持可能不同，建议先用示例或 Playground 验证。',
                'For the OpenAI-compatible interface, usually the base URL, API key, and model ID. Parameters and supported features vary by model, so validate with the example or Playground first.'
              )
            ],
            [
              c(
                '在哪里查看用量和调用问题？',
                'Where can I track usage and debug requests?'
              ),
              c(
                '登录后可在用量统计中查看消耗，在调用日志中定位请求问题，在令牌管理中管理密钥。模型详情页也提供平台已采集的运行指标。',
                'After signing in, use statistics to review consumption, request logs to investigate issues, and token management to manage keys. Model detail pages show operational metrics when available.'
              )
            ]
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span className={s.faqPlus}>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={`${s.container} ${s.finalCta}`}>
        <div>
          <h2>
            {c('开始构建你的下一个应用。', 'Build your next application.')}
          </h2>
          <p>
            {c(
              '一个账户，一把密钥，多种模型。',
              'One account. One key. More possibilities.'
            )}
          </p>
        </div>
        <Link href={start} className={s.primary}>
          {c('获取 API Key', 'Get API key')}
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}

export function HomeFeatures() {
  const { lang } = useLocale();
  const c = (cn: string, en: string) => (lang === 'zh' ? cn : en);
  const features = [
    {
      title: c('统一模型接口', 'Models, connected'),
      text: c(
        '通过熟悉的 API 接入平台模型，快速切换，减少重复集成。',
        'Access models through a familiar API. Switch easily and spend less time on integration.'
      ),
      href: '#models',
      action: c('浏览模型', 'Browse models')
    },
    {
      title: c('清晰透明的价格', 'Transparent pricing'),
      text: c(
        '输入、输出与分组价格清晰可查，按实际用量付费。',
        'Compare input, output, and group pricing. Pay for what you use.'
      ),
      href: '#models',
      action: c('比较价格', 'Compare pricing')
    },
    {
      title: c('可观测的每次调用', 'Visibility into every call'),
      text: c(
        '查看用量、调用日志与已采集的模型指标，了解应用运行情况。',
        'Understand your application with usage, request logs, and observed model metrics.'
      ),
      href: '/dashboard/statistics',
      action: c('查看用量', 'Explore usage')
    },
    {
      title: c('掌握密钥与额度', 'Your keys, your control'),
      text: c(
        '为不同应用管理独立密钥，在控制台统一配置与管理额度。',
        'Manage separate keys for your applications and control quotas from one dashboard.'
      ),
      href: '/dashboard/token',
      action: c('管理 API Key', 'Manage API keys')
    }
  ];
  return (
    <section
      id="platform"
      className={`${s.container} ${s.featureGrid}`}
      aria-label={c('平台能力', 'Platform capabilities')}
    >
      {features.map((feature, index) => (
        <article key={feature.title}>
          <div className={s.featureVisual} aria-hidden="true">
            {index === 0 ? (
              <div className={s.providerDiagram}>
                <ProviderLogoMark provider="Anthropic" size={26} />
                <span />
                <Network size={32} />
                <span />
                <ProviderLogoMark provider="Zhipu" size={26} />
              </div>
            ) : index === 1 ? (
              <div className={s.priceDiagram}>
                <span>
                  INPUT <i />
                </span>
                <span>
                  OUTPUT <i />
                </span>
                <span>
                  TOKENS <i />
                </span>
              </div>
            ) : index === 2 ? (
              <svg viewBox="0 0 240 80" className={s.monitorDiagram}>
                <path d="M0 65H240M0 40H240M0 15H240" className={s.chartGrid} />
                <path
                  d="M0 51H30L42 39L54 49H75L89 20L104 59L116 40H147L164 28L178 42H210L226 32H240"
                  className={s.chartLine}
                />
              </svg>
            ) : (
              <div className={s.keyDiagram}>
                <KeyRound size={23} />
                <span>sk-••••••••••••</span>
                <ShieldCheck size={18} />
              </div>
            )}
          </div>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
          <Link href={feature.href} className={s.textLink}>
            {feature.action}
            <ArrowUpRight size={13} />
          </Link>
        </article>
      ))}
    </section>
  );
}
