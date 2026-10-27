'use client';

/* eslint-disable @next/next/no-img-element -- User-provided and generated images include data URLs. */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { useLocale } from '@/components/providers/locale-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { clientApiKey, maskedApiKey } from '@/lib/client-setup';
import {
  buildImageRequest,
  buildMessageContent,
  CHAT_IMAGE_TYPES,
  EDIT_IMAGE_TYPES,
  getImageUrls,
  getTextContent,
  ImageRequest,
  isGptImageModel,
  isImageUrl,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  MessageContent,
  normalizeImageResponse,
  PlaygroundMessage,
  PlaygroundMode,
  readChatResponse,
  readImageFile,
  requestError
} from '@/lib/playground';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Check,
  ChevronsUpDown,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Settings2,
  Square,
  Trash2,
  User,
  X
} from 'lucide-react';

interface SearchableOption {
  value: string;
  label: string;
}
interface TokenOption {
  id: number;
  key: string;
  name: string;
  status: number;
}

function SearchableSelect({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  value,
  options,
  disabled,
  compact = false,
  onChange
}: {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  value: string;
  options: SearchableOption[];
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="min-w-0 space-y-2">
      {!compact && <Label className="text-xs">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            className="h-10 w-full justify-between gap-2 px-3 text-sm font-normal"
            disabled={disabled}
          >
            <span className="min-w-0 truncate text-left">
              {selectedOption?.label || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[max(260px,var(--radix-popover-trigger-width))] max-w-[calc(100vw-24px)] overflow-hidden p-0 shadow-lg"
          align="start"
          collisionPadding={12}
          sideOffset={6}
        >
          <Command className="h-auto max-h-[var(--radix-popover-content-available-height)] [&_[cmdk-input-wrapper]]:shrink-0">
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-64 min-h-0 flex-1 overscroll-contain">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer items-start gap-2 py-2.5 text-sm"
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="min-w-0 break-words leading-5 [overflow-wrap:anywhere]">
                      {option.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PlaygroundPage() {
  const { data: session } = useSession();
  const { lang } = useLocale();
  const text = useCallback(
    (en: string, zh: string) => (lang === 'zh' ? zh : en),
    [lang]
  );
  const [models, setModels] = useState<string[]>([]);
  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [mode, setMode] = useState<PlaygroundMode>('chat');
  const [selectedModels, setSelectedModels] = useState({ chat: '', image: '' });
  const selectedModel = selectedModels[mode];
  const [selectedTokenKey, setSelectedTokenKey] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [history, setHistory] = useState<
    Record<PlaygroundMode, PlaygroundMessage[]>
  >({ chat: [], image: [] });
  const messages = history[mode];
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant.'
  );
  const [isBusy, setIsBusy] = useState(false);
  const [isReadingImages, setIsReadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [imageSettings, setImageSettings] = useState<
    Omit<ImageRequest, 'model' | 'prompt'>
  >({ size: 'auto', quality: 'auto', output_format: 'png', n: 1 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [modelError, setModelError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const followOutputRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readingRef = useRef(false);
  const dragDepthRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const modelOptions = useMemo(
    () =>
      [...models]
        .sort((a, b) => {
          if (mode === 'image')
            return (
              Number(isGptImageModel(b)) - Number(isGptImageModel(a)) ||
              a.localeCompare(b)
            );
          return a.localeCompare(b);
        })
        .map((id) => ({ value: id, label: id })),
    [models, mode]
  );
  const tokenOptions = useMemo(
    () =>
      tokens.map((token) => ({
        value: token.key,
        label: `${token.name || 'API Key'} (${maskedApiKey(token.key)})`
      })),
    [tokens]
  );
  const selectedToken = tokens.find((token) => token.key === selectedTokenKey);

  useEffect(() => {
    if (followOutputRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isBusy ? 'auto' : 'smooth',
        block: 'end'
      });
    }
  }, [messages, isBusy]);
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      clearTimeout(copyTimerRef.current);
    },
    []
  );
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [inputValue]);

  const loadConnection = useCallback(async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      fetch('/api/playground/models', { cache: 'no-store' }).then(
        async (res) => {
          const json = await res.json();
          if (!res.ok || !json.success)
            throw new Error(requestError(json, 'Failed to load models.'));
          const list: string[] = Array.isArray(json.data)
            ? Array.from(
                new Set<string>(
                  json.data.filter(
                    (item: unknown): item is string =>
                      typeof item === 'string' && !!item.trim()
                  )
                )
              )
            : [];
          list.sort((a, b) => a.localeCompare(b));
          if (!list.length)
            throw new Error('No models are available for your account.');
          setModels(list);
          setSelectedModels((prev) => ({
            chat: list.includes(prev.chat)
              ? prev.chat
              : list.find((model) => !isGptImageModel(model)) || '',
            image: list.includes(prev.image)
              ? prev.image
              : list.find((model) => model === 'gpt-image-1.5') ||
                list.find(isGptImageModel) ||
                ''
          }));
          setModelError('');
        }
      ),
      fetch('/api/token?page=1&pagesize=100', { cache: 'no-store' }).then(
        async (res) => {
          const json = await res.json();
          if (!res.ok || !json.success)
            throw new Error(requestError(json, 'Failed to load API keys.'));
          const list: TokenOption[] = Array.isArray(json.data?.list)
            ? json.data.list.filter(
                (item: TokenOption) =>
                  item &&
                  typeof item.key === 'string' &&
                  !!item.key.trim() &&
                  item.status === 1
              )
            : [];
          if (!list.length)
            throw new Error(
              'No enabled API keys. Create a key on the Keys page.'
            );
          setTokens(list);
          setSelectedTokenKey((prev) =>
            list.some((token) => token.key === prev) ? prev : list[0].key
          );
          setTokenError('');
        }
      )
    ]);
    if (results[0].status === 'rejected') {
      setModels([]);
      setSelectedModels({ chat: '', image: '' });
      setModelError(requestError(results[0].reason));
    }
    if (results[1].status === 'rejected') {
      setTokens([]);
      setSelectedTokenKey('');
      setTokenError(requestError(results[1].reason));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user?.accessToken) void loadConnection();
  }, [session?.user?.accessToken, loadConnection]);

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (abortControllerRef.current || readingRef.current || !files.length)
        return;
      const allowedTypes =
        mode === 'image' ? EDIT_IMAGE_TYPES : CHAT_IMAGE_TYPES;
      if (files.some((file) => !allowedTypes.includes(file.type))) {
        toast.error(
          text(
            'Use PNG, JPEG or WebP images (GIF is also supported in chat).',
            '请使用 PNG、JPEG 或 WebP 图片；聊天模式也支持 GIF。'
          )
        );
        return;
      }
      if (files.some((file) => !file.size || file.size > MAX_IMAGE_BYTES)) {
        toast.error(
          text(
            'Each image must be nonempty and no larger than 20 MB.',
            '图片不能为空，且每张不得超过 20 MB。'
          )
        );
        return;
      }
      if (imageUrls.length + files.length > MAX_IMAGE_COUNT) {
        toast.error(
          text('You can attach up to 16 images.', '最多可添加 16 张图片。')
        );
        return;
      }
      readingRef.current = true;
      setIsReadingImages(true);
      try {
        const urls = await Promise.all(files.map(readImageFile));
        setImageUrls((prev) => [...prev, ...urls]);
      } catch (error) {
        toast.error(requestError(error));
      } finally {
        readingRef.current = false;
        setIsReadingImages(false);
      }
    },
    [imageUrls.length, mode, text]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    disabled: isBusy || isReadingImages,
    onDrop: handleImageFiles
  });

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
    if (!files.length) return;
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text/plain');
    if (pastedText) {
      const start = event.currentTarget.selectionStart;
      const end = event.currentTarget.selectionEnd;
      setInputValue(
        (prev) => prev.slice(0, start) + pastedText + prev.slice(end)
      );
    }
    void handleImageFiles(files);
  };

  const attachImageUrls = (urls: string[]) => {
    if (isBusy || isReadingImages) return false;
    if (urls.some((url) => !isImageUrl(url))) {
      toast.error(
        text(
          'Enter a valid HTTP or HTTPS image URL.',
          '请输入有效的 HTTP 或 HTTPS 图片地址。'
        )
      );
      return false;
    }
    if (imageUrls.length + urls.length > MAX_IMAGE_COUNT) {
      toast.error(
        text('You can attach up to 16 images.', '最多可添加 16 张图片。')
      );
      return false;
    }
    setImageUrls((prev) => [...prev, ...urls]);
    requestAnimationFrame(() => textareaRef.current?.focus());
    return true;
  };

  const addImageUrl = () => {
    if (attachImageUrls([urlInput.trim()])) {
      setUrlInput('');
      setUrlOpen(false);
    }
  };

  const previewImage = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleSend = async () => {
    const prompt = inputValue.trim();
    if (
      abortControllerRef.current ||
      readingRef.current ||
      (!prompt && (mode === 'image' || !imageUrls.length)) ||
      !selectedModel ||
      !selectedTokenKey
    )
      return;
    const controller = new AbortController();
    followOutputRef.current = true;
    abortControllerRef.current = controller;
    const submittedMode = mode;
    const submittedImages = [...imageUrls];
    const userMessage: PlaygroundMessage = {
      role: 'user',
      content: buildMessageContent(prompt, submittedImages)
    };
    const updateMessages = (
      update: (prev: PlaygroundMessage[]) => PlaygroundMessage[]
    ) =>
      setHistory((prev) => ({
        ...prev,
        [submittedMode]: update(prev[submittedMode])
      }));
    updateMessages((prev) => [
      ...prev,
      userMessage,
      { role: 'assistant', content: '' }
    ]);
    setInputValue('');
    setImageUrls([]);
    setIsBusy(true);
    let assistantContent: MessageContent = '';
    const updateAssistant = (content: MessageContent, error = false) =>
      updateMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content, error }
      ]);
    try {
      const apiKey = clientApiKey(selectedTokenKey);
      let response: Response;
      if (submittedMode === 'image') {
        const request = await buildImageRequest(
          { ...imageSettings, model: selectedModel, prompt },
          apiKey,
          submittedImages,
          controller.signal
        );
        response = await fetch('/api/playground/images', {
          method: 'POST',
          ...request,
          signal: controller.signal
        });
      } else {
        response = await fetch('/api/playground/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            apiKey,
            model: selectedModel,
            messages: [
              ...(systemPrompt
                ? [{ role: 'system', content: systemPrompt }]
                : []),
              ...messages
                .filter(
                  (message) =>
                    !message.error &&
                    (getTextContent(message.content) ||
                      getImageUrls(message.content).length)
                )
                .map(({ role, content }) => ({ role, content })),
              userMessage
            ],
            stream: streamEnabled,
            temperature,
            max_tokens: maxTokens
          })
        });
      }
      if (!response.ok) {
        const raw = await response.text();
        let error: unknown = raw;
        try {
          error = JSON.parse(raw);
        } catch {
          /* The gateway can return plain text errors. */
        }
        throw new Error(requestError(error, `HTTP ${response.status}`));
      }
      if (submittedMode === 'image') {
        assistantContent = normalizeImageResponse(
          await response.json(),
          imageSettings.output_format
        );
        updateAssistant(assistantContent);
      } else {
        await readChatResponse(response, (delta) => {
          assistantContent = getTextContent(assistantContent) + delta;
          updateAssistant(assistantContent);
        });
      }
    } catch (error) {
      const cancelled = controller.signal.aborted;
      const message = cancelled
        ? text('Generation stopped.', '已停止生成。')
        : requestError(error);
      if (!cancelled || !getTextContent(assistantContent)) {
        updateMessages((prev) => [
          ...prev.slice(0, -2),
          { ...userMessage, error: true },
          { role: 'assistant', content: message, error: true }
        ]);
        setInputValue(prompt);
        setImageUrls(submittedImages);
      }
      if (!cancelled) toast.error(message);
    } finally {
      abortControllerRef.current = null;
      setIsBusy(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleCopy = async (content: MessageContent, index: number) => {
    try {
      await navigator.clipboard.writeText(
        [
          getTextContent(content),
          ...getImageUrls(content).map((url) =>
            url.startsWith('data:')
              ? text('[Image attachment]', '[图片附件]')
              : url
          )
        ]
          .filter(Boolean)
          .join('\n')
      );
      setCopiedIdx(index);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      toast.error(
        text('Could not copy to the clipboard.', '无法复制到剪贴板。')
      );
    }
  };

  const changeMode = (value: PlaygroundMode) => {
    followOutputRef.current = true;
    setMode(value);
    setCopiedIdx(null);
  };
  const canSend =
    !!selectedModel &&
    !!selectedTokenKey &&
    !isReadingImages &&
    (!!inputValue.trim() || (mode === 'chat' && imageUrls.length > 0));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6 xl:flex-nowrap">
        <h1 className="mr-auto text-base font-semibold tracking-tight xl:mr-2">
          Playground
        </h1>
        <div
          className="flex rounded-lg bg-muted p-1"
          role="group"
          aria-label={text('Playground mode', 'Playground 模式')}
        >
          {(['chat', 'image'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant="ghost"
              disabled={isBusy || isReadingImages}
              aria-pressed={mode === value}
              onClick={() => changeMode(value)}
              className={cn(
                'h-8 gap-1.5 px-3 text-xs',
                mode === value && 'bg-background shadow-sm hover:bg-background'
              )}
            >
              {value === 'chat' ? (
                <MessageSquare className="h-3.5 w-3.5" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {value === 'chat' ? text('Chat', '聊天') : text('Image', '生图')}
            </Button>
          ))}
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:flex-1">
          <div className="min-w-0 flex-1 xl:max-w-sm">
            <SearchableSelect
              compact
              label={text('Model', '模型')}
              value={selectedModel}
              options={modelOptions}
              disabled={isBusy || isReadingImages || !models.length}
              placeholder={
                isLoading
                  ? text('Loading models…', '正在加载模型…')
                  : text('Select model', '选择模型')
              }
              searchPlaceholder={text('Search models…', '搜索模型…')}
              emptyText={text('No matching models.', '没有匹配的模型。')}
              onChange={(value) => {
                const nextMode = isGptImageModel(value) ? 'image' : mode;
                setSelectedModels((prev) => ({ ...prev, [nextMode]: value }));
                changeMode(nextMode);
              }}
            />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={isBusy || !messages.length}
              aria-label={text('Clear conversation', '清空记录')}
              title={text('Clear conversation', '清空记录')}
              onClick={() => {
                setHistory((prev) => ({ ...prev, [mode]: [] }));
                setCopiedIdx(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={text('Settings', '设置')}
                  title={text('Settings', '设置')}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-[92vw] max-w-sm flex-col gap-0 p-0">
                <SheetHeader className="border-b px-5 py-4 text-left">
                  <SheetTitle>{text('Settings', '设置')}</SheetTitle>
                  <SheetDescription>
                    {mode === 'chat'
                      ? text('Connection and chat parameters', '连接与聊天参数')
                      : text(
                          'Connection and image parameters',
                          '连接与生图参数'
                        )}
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="min-h-0 flex-1">
                  <fieldset
                    disabled={isBusy}
                    className="min-w-0 space-y-6 p-5 disabled:opacity-60"
                  >
                    <SearchableSelect
                      label="API Key"
                      value={selectedTokenKey}
                      options={tokenOptions}
                      disabled={isBusy || !tokens.length}
                      onChange={setSelectedTokenKey}
                      placeholder={text('Select API key', '选择 API Key')}
                      searchPlaceholder={text(
                        'Search API keys…',
                        '搜索 API Key…'
                      )}
                      emptyText={text('No matching keys.', '没有匹配的 Key。')}
                    />
                    <div className="border-t" />
                    {mode === 'image' ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {text(
                            'Use a GPT Image model. Add reference images to edit or remix them.',
                            '选择 GPT Image 模型。添加参考图片即可进行编辑或再创作。'
                          )}
                        </p>
                        <SettingSelect
                          label={text('Size', '尺寸')}
                          value={imageSettings.size}
                          onChange={(size) =>
                            setImageSettings((prev) => ({
                              ...prev,
                              size: size as ImageRequest['size']
                            }))
                          }
                          options={[
                            { value: 'auto', label: text('Auto', '自动') },
                            {
                              value: '1024x1024',
                              label: text(
                                'Square · 1024 × 1024',
                                '方形 · 1024 × 1024'
                              )
                            },
                            {
                              value: '1536x1024',
                              label: text(
                                'Landscape · 1536 × 1024',
                                '横向 · 1536 × 1024'
                              )
                            },
                            {
                              value: '1024x1536',
                              label: text(
                                'Portrait · 1024 × 1536',
                                '竖向 · 1024 × 1536'
                              )
                            }
                          ]}
                        />
                        <SettingSelect
                          label={text('Quality', '画质')}
                          value={imageSettings.quality}
                          onChange={(quality) =>
                            setImageSettings((prev) => ({
                              ...prev,
                              quality: quality as ImageRequest['quality']
                            }))
                          }
                          options={[
                            { value: 'auto', label: text('Auto', '自动') },
                            { value: 'low', label: text('Low', '低') },
                            { value: 'medium', label: text('Medium', '中') },
                            { value: 'high', label: text('High', '高') }
                          ]}
                        />
                        <SettingSelect
                          label={text('Format', '格式')}
                          value={imageSettings.output_format}
                          onChange={(format) =>
                            setImageSettings((prev) => ({
                              ...prev,
                              output_format:
                                format as ImageRequest['output_format']
                            }))
                          }
                          options={['png', 'jpeg', 'webp'].map((value) => ({
                            value,
                            label: value.toUpperCase()
                          }))}
                        />
                        <SettingSelect
                          label={text('Number of images', '生成数量')}
                          value={String(imageSettings.n)}
                          onChange={(n) =>
                            setImageSettings((prev) => ({
                              ...prev,
                              n: Number(n)
                            }))
                          }
                          options={[1, 2, 3, 4].map((n) => ({
                            value: String(n),
                            label: String(n)
                          }))}
                        />
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="system-prompt">
                            {text('System prompt', '系统提示词')}
                          </Label>
                          <Textarea
                            id="system-prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={5}
                            className="resize-y text-sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="stream">
                            {text('Stream response', '流式输出')}
                          </Label>
                          <Switch
                            id="stream"
                            checked={streamEnabled}
                            onCheckedChange={setStreamEnabled}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <Label htmlFor="temperature">
                              {text('Temperature', '温度')}
                            </Label>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {temperature}
                            </span>
                          </div>
                          <Slider
                            id="temperature"
                            aria-label={text('Temperature', '温度')}
                            value={[temperature]}
                            onValueChange={([value]) => setTemperature(value)}
                            min={0}
                            max={2}
                            step={0.1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max-tokens">
                            {text('Max output tokens', '最大输出 Token')}
                          </Label>
                          <Input
                            id="max-tokens"
                            type="number"
                            value={maxTokens}
                            min={1}
                            max={128000}
                            onChange={(e) =>
                              setMaxTokens(
                                Math.min(
                                  128000,
                                  Math.max(1, parseInt(e.target.value, 10) || 1)
                                )
                              )
                            }
                          />
                        </div>
                      </>
                    )}
                  </fieldset>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {(modelError || tokenError) && (
        <Alert variant="destructive" className="mx-4 mt-3 w-auto shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{[modelError, tokenError].filter(Boolean).join(' ')}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={loadConnection}
            >
              {text('Retry', '重试')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps({
          className: 'relative flex min-h-0 flex-1 flex-col',
          'data-testid': 'playground-dropzone',
          // Track the overlay synchronously: file extraction on dragenter can
          // finish after a fast drop and leave react-dropzone's indicator active.
          onDragEnterCapture: (event: React.DragEvent) => {
            if (
              !event.dataTransfer.types.some((type) =>
                ['Files', 'text/uri-list'].includes(type)
              ) ||
              isBusy ||
              isReadingImages
            )
              return;
            dragDepthRef.current += 1;
            setIsDragging(true);
          },
          onDragLeaveCapture: () => {
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (!dragDepthRef.current) setIsDragging(false);
          },
          onDragOverCapture: (event: React.DragEvent) => {
            if (
              event.dataTransfer.types.some((type) =>
                ['Files', 'text/uri-list'].includes(type)
              )
            )
              event.preventDefault();
          },
          onDropCapture: (event: React.DragEvent) => {
            dragDepthRef.current = 0;
            setIsDragging(false);
            if (isBusy || isReadingImages) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            if (!event.dataTransfer.types.includes('Files')) {
              const urls = event.dataTransfer
                .getData('text/uri-list')
                .split(/\r?\n/)
                .map((url) => url.trim())
                .filter((url) => url && !url.startsWith('#'));
              if (urls.length) {
                event.preventDefault();
                event.stopPropagation();
                attachImageUrls(urls);
              }
            }
          }
        })}
      >
        <input
          {...getInputProps({
            accept:
              mode === 'image'
                ? 'image/png,image/jpeg,image/webp'
                : 'image/png,image/jpeg,image/webp,image/gif',
            'aria-label': text('Attach images', '添加图片')
          })}
        />
        {isDragging && (
          <div
            className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/95"
            role="status"
          >
            <div className="space-y-3 text-center">
              <ImagePlus className="mx-auto h-10 w-10 text-primary" />
              <p className="font-medium">
                {text('Drop images here', '松开即可添加图片')}
              </p>
              <p className="text-sm text-muted-foreground">
                {text(
                  'PNG, JPEG, WebP · Up to 20 MB each',
                  'PNG、JPEG、WebP · 每张最多 20 MB'
                )}
              </p>
            </div>
          </div>
        )}
        <ScrollArea
          className="min-h-0 flex-1"
          onScrollCapture={(event) => {
            const viewport = event.target as HTMLElement;
            if (viewport.hasAttribute('data-radix-scroll-area-viewport')) {
              followOutputRef.current =
                viewport.scrollHeight -
                  viewport.scrollTop -
                  viewport.clientHeight <
                100;
            }
          }}
        >
          <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-8">
            {!messages.length && (
              <div className="flex min-h-[28vh] flex-col items-center justify-center py-8 text-center sm:min-h-[40vh]">
                <div className="mb-5 rounded-2xl border bg-muted/30 p-4">
                  {mode === 'chat' ? (
                    <MessageSquare className="h-7 w-7 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <h2 className="text-xl font-medium tracking-tight">
                  {mode === 'chat'
                    ? text('What would you like to explore?', '想聊些什么？')
                    : text('Turn an idea into an image', '把想法变成图片')}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {mode === 'chat'
                    ? text(
                        'Send a message, or drop an image to start.',
                        '输入消息，或直接拖入图片开始对话。'
                      )
                    : text(
                        'Describe your idea, or drop a reference image to edit.',
                        '描述你想要的画面，或拖入参考图进行编辑。'
                      )}
                </p>
                {mode === 'image' && !selectedModel && !isLoading && (
                  <p className="mt-4 max-w-sm text-xs text-muted-foreground">
                    {text(
                      'Select an available GPT Image model or its configured alias above.',
                      '请在上方选择可用的 GPT Image 模型或已配置的模型别名。'
                    )}
                  </p>
                )}
              </div>
            )}
            {messages.map((message, index) => {
              const content = getTextContent(message.content);
              const images = getImageUrls(message.content);
              const pending =
                isBusy &&
                index === messages.length - 1 &&
                message.role === 'assistant';
              return (
                <article
                  key={index}
                  className={cn(
                    'group rounded-2xl p-4',
                    message.role === 'user'
                      ? 'border bg-muted/30'
                      : 'bg-background'
                  )}
                >
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    {message.role === 'user'
                      ? text('You', '你')
                      : text('Assistant', '助手')}
                    {!pending && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-7 w-7 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
                        aria-label={text('Copy message', '复制消息')}
                        onClick={() => handleCopy(message.content, index)}
                      >
                        {copiedIdx === index ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                  {content && (
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]',
                        message.error &&
                          message.role === 'assistant' &&
                          'text-destructive'
                      )}
                      role={
                        message.error && message.role === 'assistant'
                          ? 'alert'
                          : undefined
                      }
                    >
                      {content}
                    </div>
                  )}
                  {images.length > 0 && (
                    <div
                      className={cn(
                        'mt-3 grid gap-3',
                        message.role === 'assistant'
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      )}
                    >
                      {images.map((url, imageIndex) => (
                        <div
                          key={imageIndex}
                          className="overflow-hidden rounded-xl border bg-muted/20"
                        >
                          <button
                            type="button"
                            onClick={() => previewImage(url)}
                            className="block w-full"
                            aria-label={text(
                              `Preview image ${imageIndex + 1}`,
                              `预览图片 ${imageIndex + 1}`
                            )}
                          >
                            <img
                              src={url}
                              alt={text(
                                `Image ${imageIndex + 1}`,
                                `图片 ${imageIndex + 1}`
                              )}
                              className={cn(
                                'w-full object-contain',
                                message.role === 'assistant'
                                  ? 'max-h-96'
                                  : 'h-32'
                              )}
                            />
                          </button>
                          {message.role === 'assistant' && (
                            <div className="flex flex-wrap border-t">
                              <button
                                type="button"
                                disabled={isBusy || isReadingImages}
                                onClick={() => attachImageUrls([url])}
                                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs hover:bg-muted disabled:opacity-50"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                                {text('Use as reference', '用作参考图')}
                              </button>
                              <a
                                href={url}
                                download={
                                  url.startsWith('data:')
                                    ? `playground-${index}-${imageIndex + 1}.${
                                        url.startsWith('data:image/webp')
                                          ? 'webp'
                                          : url.startsWith('data:image/jpeg')
                                          ? 'jpg'
                                          : 'png'
                                      }`
                                    : undefined
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs hover:bg-muted"
                              >
                                {url.startsWith('data:') ? (
                                  <Download className="h-3.5 w-3.5" />
                                ) : (
                                  <ExternalLink className="h-3.5 w-3.5" />
                                )}
                                {url.startsWith('data:')
                                  ? text('Download', '下载图片')
                                  : text('Open original', '打开原图')}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {pending && !content && (
                    <div
                      className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
                      role="status"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === 'image'
                        ? text(
                            'Creating your image… This may take a few minutes.',
                            '正在生成图片，可能需要几分钟…'
                          )
                        : text('Thinking…', '正在思考…')}
                    </div>
                  )}
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-5">
          <div
            className="mx-auto max-w-4xl rounded-2xl border bg-background shadow-sm transition-shadow focus-within:border-muted-foreground/50 focus-within:shadow-md"
            data-testid="playground-composer"
          >
            {imageUrls.length > 0 && (
              <div className="flex max-h-36 gap-2 overflow-x-auto px-4 pt-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative shrink-0 rounded-lg border bg-muted/30"
                  >
                    <button
                      type="button"
                      onClick={() => previewImage(url)}
                      aria-label={text(
                        `Preview attachment ${index + 1}`,
                        `预览附件 ${index + 1}`
                      )}
                    >
                      <img
                        src={url}
                        alt={text(
                          `Attachment ${index + 1}`,
                          `附件 ${index + 1}`
                        )}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || isReadingImages}
                      onClick={() =>
                        setImageUrls((prev) =>
                          prev.filter((_, current) => current !== index)
                        )
                      }
                      className="absolute right-1 top-1 rounded-full border bg-background p-1 shadow-sm hover:bg-muted disabled:opacity-50"
                      aria-label={text(
                        `Remove attachment ${index + 1}`,
                        `移除附件 ${index + 1}`
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                ) {
                  event.preventDefault();
                  if (canSend) void handleSend();
                }
              }}
              aria-label={text('Prompt', '提示词')}
              placeholder={
                mode === 'chat'
                  ? text(
                      'Message, paste or drop images here…',
                      '输入消息，粘贴或拖入图片…'
                    )
                  : imageUrls.length
                  ? text(
                      'Describe how to edit these images…',
                      '描述你希望如何修改这些图片…'
                    )
                  : text(
                      'Describe an image, or drop a reference here…',
                      '描述想要的画面，或拖入参考图片…'
                    )
              }
              rows={2}
              disabled={isBusy}
              className="max-h-[180px] min-h-[76px] resize-none rounded-2xl border-0 bg-transparent px-4 py-4 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm"
            />
            <div className="flex items-center gap-1 px-3 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={open}
                disabled={isBusy || isReadingImages}
                aria-label={text('Attach images', '添加图片')}
                title={text('Attach images', '添加图片')}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Popover open={urlOpen} onOpenChange={setUrlOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isBusy || isReadingImages}
                    aria-label={text('Add image URL', '添加图片链接')}
                    title={text('Add image URL', '添加图片链接')}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-80 max-w-[calc(100vw-24px)] space-y-3"
                >
                  <Label htmlFor="image-url">
                    {text('Image URL', '图片链接')}
                  </Label>
                  <Input
                    id="image-url"
                    type="url"
                    value={urlInput}
                    placeholder="https://…"
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                  />
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={!urlInput.trim()}
                    onClick={addImageUrl}
                  >
                    {text('Add image', '添加图片')}
                  </Button>
                </PopoverContent>
              </Popover>
              <span
                className="ml-1 min-w-0 truncate text-xs text-muted-foreground"
                role="status"
              >
                {isReadingImages ? (
                  text('Reading images…', '正在读取图片…')
                ) : imageUrls.length ? (
                  text(
                    `${imageUrls.length} attached`,
                    `已添加 ${imageUrls.length} 张`
                  )
                ) : (
                  <span className="hidden sm:inline">
                    {text('Drop or paste images', '可直接拖入或粘贴图片')}
                  </span>
                )}
              </span>
              <div className="ml-auto">
                {isBusy ? (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => abortControllerRef.current?.abort()}
                    aria-label={text('Stop generating', '停止生成')}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="rounded-xl"
                    disabled={!canSend}
                    onClick={handleSend}
                    aria-label={
                      mode === 'chat'
                        ? text('Send message', '发送消息')
                        : text('Generate image', '生成图片')
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
            <span className="truncate">
              {selectedToken
                ? `${text('Key', '密钥')}: ${
                    selectedToken.name || maskedApiKey(selectedToken.key)
                  }`
                : text(
                    'Select an API key in Settings',
                    '请在设置中选择 API Key'
                  )}
            </span>
            <span className="hidden shrink-0 sm:inline">
              {text(
                'Enter to send · Shift + Enter for a new line',
                'Enter 发送 · Shift + Enter 换行'
              )}
            </span>
          </div>
        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[95dvh] max-w-4xl overflow-auto">
          <DialogTitle>{text('Image preview', '图片预览')}</DialogTitle>
          <DialogDescription className="sr-only">
            {text('Full image preview', '完整图片预览')}
          </DialogDescription>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={text('Image preview', '图片预览')}
              className="max-h-[75dvh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
