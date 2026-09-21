'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUploader } from '@/components/file-uploader';
import { Channel } from '@/lib/types/channel';
import { useLocale } from '@/components/providers/locale-provider';
import request from '@/app/lib/clientFetch';
import JSONEditor from '@/components/json-editor';
import { ModelSelectModal } from './model-select-modal';

const formSchema = z.object({
  type: z.string().min(1, {
    message: 'Type is required.'
  }),
  name: z.string().min(1, {
    message: 'Name is required.'
  }),
  groups: z.array(z.string()).min(1, {
    message: 'Please select at least one group.'
  }),
  key: z.string().optional(),
  // 新增批量创建相关字段
  batch_create: z.boolean().default(false),
  aggregate_mode: z.boolean().default(false),
  batch_keys: z.string().optional(),
  // 多密钥配置选项
  key_selection_mode: z.number().default(1), // 0=轮询, 1=随机
  batch_import_mode: z.number().default(1), // 0=覆盖, 1=追加
  // Vertex AI 配置选项（移除，直接同时支持手动输入和文件上传）
  // key: z.string().superRefine((val, ctx) => {
  //   const type = (ctx.path[0] === 'type') ? ctx.path[0] : '';
  //   if (type !== '33' && type !== '42' && !val) {
  //     ctx.addIssue({
  //       code: z.ZodIssueCode.custom,
  //       message: 'Key is required for this channel type.'
  //     });
  //   }
  // }),

  base_url: z.string().optional(),
  other: z.string().optional(),
  region: z.string().optional(),
  provider: z.string().trim().max(128).optional(),
  ak: z.string().optional(),
  sk: z.string().optional(),
  vertex_ai_project_id: z.string().optional(),
  vertex_ai_adc: z.string().optional(),
  google_storage: z.string().optional(),
  // Vertex AI 新增配置
  vertex_key_type: z.enum(['json', 'api_key']).optional(), // 密钥格式
  vertex_model_region: z.string().optional(), // 模型专用区域 JSON
  // AWS Bedrock 密钥格式
  aws_key_type: z.string().optional(), // ak_sk 或 api_key，空则自动识别
  user_id: z.string().optional(),
  model_mapping: z.string().optional(),
  header_override: z.string().optional(), // 自定义请求头覆盖
  models: z.array(z.string(), {
    required_error: 'Please select at least one model.'
  }),
  customModelName: z.string().optional(),
  priority: z
    .number()
    .min(0, {
      message: 'Priority must be 0 or greater.'
    })
    .optional(),
  weight: z
    .number()
    .min(0, {
      message: 'Weight must be 0 or greater.'
    })
    .optional(),
  discount: z
    .number()
    .min(0.01, {
      message: 'Discount multiplier must be greater than 0.'
    })
    .max(1, {
      message: 'Discount multiplier cannot exceed 1.'
    })
    .optional(),
  auto_disabled: z.boolean().default(true),
  auto_enabled: z.boolean().default(true),
  // 测试模型：指定自动测试渠道时使用的模型名
  test_model: z.string().optional(),
  // 新增：支持 Token 计数功能（仅 Anthropic 和 AWS Claude 渠道）
  support_count_tokens: z.boolean().default(false),
  // Beta 过滤模式（Claude 相关渠道：Anthropic/AWS Claude/Vertex AI）
  beta_filter_mode: z.string().optional()

  // company: z.string().min(1, {
  //   message: 'Company name is required.'
  // }),
  // gender: z.enum(['male', 'female', 'other'], {
  //   required_error: 'Please select a gender.'
  // })
});

interface ModelOption {
  id: string;
  // 添加其他可能的字段
}

interface ModelTypesOption {
  key: string;
  value: string;
  text: string;
}

// 使用 Omit 来从 Channel 接口中排除 type 字段，然后重新定义它。这样可以避免类型冲突。
interface ParamsOption extends Omit<Channel, 'type'> {
  type: number | string;
  group?: string;
  groups?: string[];
  models?: string;
  config?: string;
  priority?: number;
  weight?: number;
  batch_create?: boolean;
  batch_keys?: string;
  auto_disabled?: boolean;
  auto_enabled?: boolean;
  test_model?: string;
  aggregate_mode?: boolean;
  key_selection_mode?: number;
  batch_import_mode?: number;
}

export default function ChannelForm() {
  const router = useRouter();
  const { channelId } = useParams();
  const { t } = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [modelTypes, setModelTypes] = useState<ModelTypesOption[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [relatedModels, setRelatedModels] = useState<Record<string, string[]>>(
    {}
  );
  const [channelData, setChannelData] = useState<Object | null>(null);
  const [vertexAiFiles, setVertexAiFiles] = useState<File[]>([]);

  // Vertex AI 配置相关状态
  const [vertexInputMode, setVertexInputMode] = useState<'upload' | 'manual'>(
    'upload'
  );
  const [vertexRegionMode, setVertexRegionMode] = useState<'visual' | 'manual'>(
    'visual'
  );
  const [vertexModelRegions, setVertexModelRegions] = useState<
    Array<{ model: string; region: string }>
  >([]);

  // 模型搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ModelOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取上游模型列表相关状态
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [modelSelectModalOpen, setModelSelectModalOpen] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // 上游模型巡检相关状态
  const [upstreamOtherSettings, setUpstreamOtherSettings] = useState<
    Record<string, any>
  >({});
  const [upstreamCheckEnabled, setUpstreamCheckEnabled] = useState(false);
  const [upstreamAutoSyncEnabled, setUpstreamAutoSyncEnabled] = useState(false);
  const [upstreamAutoDeleteEnabled, setUpstreamAutoDeleteEnabled] =
    useState(false);
  const [upstreamDetectResult, setUpstreamDetectResult] = useState<{
    addModels: string[];
    removeModels: string[];
    lastCheckTime: number;
  } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isApplyingUpstream, setIsApplyingUpstream] = useState(false);

  // 复制到剪贴板的功能
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 显示复制成功提示
      const notification = document.createElement('div');
      notification.className =
        'fixed top-4 right-4 z-50 rounded-lg bg-green-500 px-4 py-2 text-white shadow-lg transition-all duration-300 transform translate-x-0';
      notification.textContent = `Copied: ${text}`;
      document.body.appendChild(notification);

      // 3秒后移除提示
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      alert(`Copy failed: ${text}`);
    }
  };

  // 模型搜索功能
  const searchModels = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // 首先从本地已有的模型选项中搜索
      const localResults = modelOptions.filter((model) =>
        model.id.toLowerCase().includes(query.toLowerCase())
      );

      // 模拟API搜索（可以根据需要实现真正的API调用）
      // 这里您可以调用实际的搜索API
      setSearchResults(localResults);

      // 如果需要从服务器搜索更多模型，可以在这里添加API调用
      // const apiResults = await fetch(`/api/models/search?q=${encodeURIComponent(query)}`);
      // const moreResults = await apiResults.json();
      // setSearchResults([...localResults, ...moreResults.data]);
    } catch (error) {
      console.error('搜索模型失败:', error);
      // 搜索失败时至少显示本地结果
      const localResults = modelOptions.filter((model) =>
        model.id.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(localResults);
    } finally {
      setIsSearching(false);
    }
  };

  // 添加搜索结果中的模型到已选择列表
  const addModelFromSearch = (modelId: string, currentModels: string[]) => {
    if (!currentModels.includes(modelId)) {
      const newModels = [...currentModels, modelId];
      return newModels;
    }
    return currentModels;
  };

  // 获取上游模型列表
  const fetchUpstreamModels = async () => {
    setIsFetchingModels(true);
    try {
      let response;

      // 编辑模式：channelId 存在且不是 'create'
      const isEditMode = channelId && channelId !== 'create';

      if (isEditMode) {
        // 编辑模式：使用已有渠道ID获取
        response = await fetch(`/api/channel/fetch_models/${channelId}`);
      } else {
        // 新建模式：使用当前表单中的 key 和 base_url
        const key = form.getValues('key');
        const baseUrl = form.getValues('base_url');
        const channelType = form.getValues('type');

        if (!key) {
          const { toast } = await import('sonner');
          toast.error('Enter an API key first.');
          setIsFetchingModels(false);
          return;
        }

        response = await fetch('/api/channel/fetch_models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_url: baseUrl,
            type: parseInt(channelType as string),
            key: key
          })
        });
      }

      const data = await response.json();

      if (data.success && data.data) {
        const models = data.data as string[];
        // 去重
        const uniqueModels = Array.from(new Set(models));
        setFetchedModels(uniqueModels);
        setModelSelectModalOpen(true);

        const { toast } = await import('sonner');
        toast.success(`Fetched ${uniqueModels.length} models.`);
      } else {
        const { toast } = await import('sonner');
        toast.error(data.message || 'Failed to load models.');
      }
    } catch (error: any) {
      console.error('Failed to fetch upstream models:', error);
      const { toast } = await import('sonner');
      toast.error(error.message || 'Failed to load models.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  // 上游模型巡检：立即检测
  const handleDetectUpstream = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/channel/upstream_updates/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(channelId) }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUpstreamDetectResult({
          addModels: data.data.add_models || [],
          removeModels: data.data.remove_models || [],
          lastCheckTime: data.data.last_check_time || 0
        });
        const { toast } = await import('sonner');
        const addCount = (data.data.add_models || []).length;
        const rmCount = (data.data.remove_models || []).length;
        toast.success(
          `Scan complete: ${addCount} added, ${rmCount} to remove.`
        );
      } else {
        const { toast } = await import('sonner');
        toast.error(data.message || 'Scan failed.');
      }
    } catch (e: any) {
      const { toast } = await import('sonner');
      toast.error(e.message || 'Scan failed.');
    } finally {
      setIsDetecting(false);
    }
  };

  // 上游模型巡检：应用变更
  const handleApplyUpstream = async (
    addModels: string[],
    removeModels: string[],
    ignoreModels: string[]
  ) => {
    setIsApplyingUpstream(true);
    try {
      const res = await fetch('/api/channel/upstream_updates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(channelId),
          add_models: addModels,
          remove_models: removeModels,
          ignore_models: ignoreModels
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        // 更新表单中的模型列表
        if (data.data.models) {
          form.setValue('models', data.data.models.split(',').filter(Boolean));
        }
        setUpstreamDetectResult({
          addModels: data.data.remaining_models || [],
          removeModels: data.data.remaining_remove_models || [],
          lastCheckTime: Math.floor(Date.now() / 1000)
        });
        const { toast } = await import('sonner');
        toast.success(
          `Applied: ${(data.data.added_models || []).length} added, ${
            (data.data.removed_models || []).length
          } removed.`
        );
      } else {
        const { toast } = await import('sonner');
        toast.error(data.message || 'Apply failed.');
      }
    } catch (e: any) {
      const { toast } = await import('sonner');
      toast.error(e.message || 'Apply failed.');
    } finally {
      setIsApplyingUpstream(false);
    }
  };

  // 处理模型选择确认
  const handleModelSelectConfirm = (selectedModels: string[]) => {
    const currentModels = form.getValues('models') || [];
    // 合并已有模型和新选择的模型（去重）
    const mergedModels = Array.from(
      new Set([...currentModels, ...selectedModels])
    );
    form.setValue('models', mergedModels);
    setModelSelectModalOpen(false);
  };

  // 文件解析预览状态
  interface ParsedFileInfo {
    fileName: string;
    projectId: string;
    status: 'success' | 'error';
    error?: string;
  }
  const [parsedFilesPreview, setParsedFilesPreview] = useState<
    ParsedFileInfo[]
  >([]);

  // 删除单个文件的处理函数
  const handleRemoveFile = (index: number) => {
    const removedFile = parsedFilesPreview[index];
    const newFiles = parsedFilesPreview.filter((_, i) => i !== index);
    setParsedFilesPreview(newFiles);

    // 同时更新实际的文件列表
    const newVertexAiFiles = vertexAiFiles.filter((_, i) => i !== index);
    setVertexAiFiles(newVertexAiFiles);

    // 如果删除的是成功解析的文件，需要从相应的文本字段中移除对应的JSON内容
    if (removedFile.status === 'success') {
      const isBatchCreate =
        form.watch('batch_create') && channelId === 'create';
      const isAggregateMode = isBatchCreate && form.watch('aggregate_mode');
      const isMultiKey = (channelData as any)?.multi_key_info?.is_multi_key;

      // 注意：这里简化处理，实际项目中可能需要更精确的匹配和删除逻辑
      // 由于JSON内容可能被修改过，这里只是提示用户手动检查
      if (isBatchCreate || isAggregateMode || isMultiKey) {
        console.log(
          `已删除文件 ${removedFile.fileName} (${removedFile.projectId})，请检查相应的密钥字段是否需要手动调整`
        );
      } else {
        // 单个渠道创建模式下，如果删除的是当前使用的文件，清空相关字段
        const currentProjectId = form.getValues('vertex_ai_project_id');
        if (currentProjectId === removedFile.projectId) {
          form.setValue('vertex_ai_project_id', '');
          form.setValue('vertex_ai_adc', '');
        }
      }
    }
  };

  useEffect(() => {
    setIsLoading(true);

    const initializeData = async () => {
      try {
        // 准备所有需要的请求
        const requests = [
          // 查询模型类型
          fetch('/api/channel/types', { credentials: 'include' })
            .then((res) => res.json())
            .then(({ data }) => data),

          // 查询分组
          fetch('/api/group', { credentials: 'include' })
            .then((res) => res.json())
            .then(({ data }) => data),

          // 查询模型
          fetch('/api/channel/models', { credentials: 'include' })
            .then((res) => res.json())
            .then(({ data }) => data),

          // 查询相关模型
          request.get('/api/models').then(({ data }) => data)
        ];

        // 如果需要获取渠道详情，将其加入请求数组
        if (channelId && channelId !== 'create') {
          requests.push(
            fetch(`/api/channel/${channelId}`, { credentials: 'include' })
              .then((res) => res.json())
              .then(({ data }) => {
                setChannelData(data);
                return data;
              })
          );
        }

        // 同时发起所有请求
        const [
          modelTypesData,
          groupData,
          modelData,
          relatedModelsData,
          channelData
        ] = await Promise.all(requests).finally(() => {
          setIsLoading(false);
        });

        // const modelMap = modelData.map((item: any) => [item.id, item]);
        // console.log('modelMap', modelMap);
        // const modelMap1 = new Map(modelMap);
        // console.log('modelMap1', modelMap1);
        // const modelMap2 = modelMap1.values();
        // console.log('modelMap2', modelMap2);
        // const modelMap3 = Array.from(modelMap2);
        // console.log('modelMap3', modelMap3);

        // 更新状态
        setModelTypes(modelTypesData);
        setGroupOptions(groupData);
        // 模型数据去重
        setModelOptions(
          Array.from(
            new Map(modelData.map((item: any) => [item.id, item])).values()
          ) as ModelOption[]
        );
        setRelatedModels(relatedModelsData);

        // 如果有渠道数据，填充表单
        if (channelData) {
          // 解析配置数据
          let config: any = {};
          try {
            if (channelData.config) {
              config = JSON.parse(channelData.config);
            }
          } catch (error) {
            console.log('Failed to parse channel config:', error);
          }

          // 处理 auto_disabled 字段的类型转换
          // SQLite 返回 1/0，MySQL 返回 true/false
          let autoDisabledValue = true; // 默认值
          if (channelData.hasOwnProperty('auto_disabled')) {
            const rawValue = channelData.auto_disabled;
            if (typeof rawValue === 'boolean') {
              autoDisabledValue = rawValue;
            } else if (typeof rawValue === 'number') {
              autoDisabledValue = rawValue === 1;
            } else {
              autoDisabledValue = Boolean(rawValue);
            }
          }

          // 处理 auto_enabled 字段的类型转换，同 auto_disabled
          let autoEnabledValue = true;
          if ((channelData as any).hasOwnProperty('auto_enabled')) {
            const rawValue = (channelData as any).auto_enabled;
            if (typeof rawValue === 'boolean') {
              autoEnabledValue = rawValue;
            } else if (typeof rawValue === 'number') {
              autoEnabledValue = rawValue === 1;
            } else {
              autoEnabledValue = Boolean(rawValue);
            }
          }

          form.reset({
            type: String(channelData.type),
            name: channelData.name,
            groups:
              channelData.group
                ?.split(',')
                .filter((g: string) => g.trim() !== '') || [],
            key: channelData.key,
            base_url: channelData.base_url,
            other: channelData.other,
            region: config.region || '',
            provider: config.provider || '',
            ak: config.ak || '',
            sk: config.sk || '',
            vertex_ai_project_id: config.vertex_ai_project_id || '',
            vertex_ai_adc: config.vertex_ai_adc || '',
            google_storage: config.google_storage || '',
            user_id: config.user_id || '',
            // Vertex AI 新增配置
            vertex_key_type: config.vertex_key_type || 'json',
            vertex_model_region: config.vertex_model_region
              ? typeof config.vertex_model_region === 'object'
                ? JSON.stringify(config.vertex_model_region, null, 2)
                : config.vertex_model_region
              : '',
            // AWS Bedrock 密钥格式
            aws_key_type: config.aws_key_type || '',
            model_mapping: channelData.model_mapping || '',
            header_override: channelData.header_override || '',
            models: channelData.models?.split(',') || [],
            customModelName: channelData.customModelName,
            priority: channelData.priority || 0,
            weight: channelData.weight || 0,
            discount: channelData.discount ?? 1,
            auto_disabled: autoDisabledValue,
            auto_enabled: autoEnabledValue,
            test_model: channelData.test_model || '',
            // 新增：支持 Token 计数配置
            support_count_tokens: config.support_count_tokens || false,
            // Beta 过滤模式
            beta_filter_mode: config.beta_filter_mode || 'none',
            aggregate_mode: channelData.aggregate_mode || false,
            key_selection_mode:
              (channelData as any).multi_key_info?.key_selection_mode ?? 1,
            batch_import_mode:
              (channelData as any).multi_key_info?.batch_import_mode ?? 1
          });

          // 解析并初始化上游模型巡检设置
          try {
            const raw = (channelData as any).other_settings;
            if (raw) {
              const os = typeof raw === 'string' ? JSON.parse(raw) : raw;
              setUpstreamOtherSettings(os);
              setUpstreamCheckEnabled(!!os.upstream_model_update_check_enabled);
              setUpstreamAutoSyncEnabled(
                !!os.upstream_model_update_auto_sync_enabled
              );
              setUpstreamAutoDeleteEnabled(
                !!os.upstream_model_update_auto_delete_enabled
              );
              const addMs = os.upstream_model_update_last_detected_models || [];
              const rmMs = os.upstream_model_update_last_removed_models || [];
              if (addMs.length > 0 || rmMs.length > 0) {
                setUpstreamDetectResult({
                  addModels: addMs,
                  removeModels: rmMs,
                  lastCheckTime: os.upstream_model_update_last_check_time || 0
                });
              }
            }
          } catch (_) {}

          // 初始化 Vertex AI 模型区域映射状态
          if (config.vertex_model_region) {
            try {
              const regionMap =
                typeof config.vertex_model_region === 'object'
                  ? config.vertex_model_region
                  : JSON.parse(config.vertex_model_region);
              const regions = Object.entries(regionMap).map(
                ([model, region]) => ({
                  model,
                  region: region as string
                })
              );
              setVertexModelRegions(regions);
            } catch (e) {
              console.log('Failed to parse vertex_model_region');
            }
          }

          // 设置输入模式
          if (config.vertex_key_type === 'api_key') {
            setVertexInputMode('manual');
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [channelId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: undefined,
      name: undefined,
      groups: undefined,
      key: undefined,
      batch_create: false,
      aggregate_mode: false,
      batch_keys: undefined,
      key_selection_mode: 1,
      batch_import_mode: 1,
      base_url: undefined,
      other: undefined,
      region: undefined,
      ak: undefined,
      sk: undefined,
      vertex_ai_project_id: undefined,
      vertex_ai_adc: undefined,
      google_storage: undefined,
      vertex_key_type: 'json',
      vertex_model_region: undefined,
      aws_key_type: undefined,
      user_id: undefined,
      model_mapping: undefined,
      header_override: undefined,
      models: undefined,
      customModelName: undefined,
      priority: 0,
      weight: 0,
      discount: 1,
      auto_disabled: true,
      auto_enabled: true,
      test_model: '',
      support_count_tokens: false,
      provider: '',
      beta_filter_mode: 'none'
    }
  });

  const handleTypeInputChange = (value: string) => {
    if (value !== '3') {
      form.setValue('other', '');
    }
    if (value !== '3' && value !== '8') {
      form.setValue('base_url', '');
    }
    // 如果选择Vertex AI渠道，自动设置region为global
    if (value === '48') {
      form.setValue('region', 'global');
    }
  };

  // 解析Google Cloud Application Default Credentials JSON并提取project_id
  const handleVertexAiAdcChange = (value: string) => {
    try {
      if (value.trim()) {
        const jsonData = JSON.parse(value);
        if (jsonData.project_id) {
          // 自动填充Project ID
          form.setValue('vertex_ai_project_id', jsonData.project_id);
          // 确保region为global
          if (!form.getValues('region')) {
            form.setValue('region', 'global');
          }
        }
      }
    } catch (error) {
      // JSON解析失败时不做处理，用户可能还在输入过程中
      console.log('JSON parsing in progress or invalid format');
    }
  };

  // 更新模型区域映射表单字段
  const updateVertexModelRegionField = (
    regions: Array<{ model: string; region: string }>
  ) => {
    const validRegions = regions.filter(
      (r) => r.model.trim() && r.region.trim()
    );
    if (validRegions.length > 0) {
      const regionMap: Record<string, string> = {};
      validRegions.forEach((r) => {
        regionMap[r.model.trim()] = r.region.trim();
      });
      form.setValue('vertex_model_region', JSON.stringify(regionMap));
    } else {
      form.setValue('vertex_model_region', '');
    }
  };

  // 通用的Vertex AI JSON文件上传处理
  const handleVertexAiFileUpload = async (files: File[]) => {
    console.log('📁 handleVertexAiFileUpload called with files:', files);
    if (files.length === 0) {
      console.log('⚠️ No files provided');
      return;
    }

    try {
      const jsonContents: string[] = [];
      const newPreviewItems: ParsedFileInfo[] = [];

      // 判断当前上传模式
      const isBatchCreate =
        form.watch('batch_create') && channelId === 'create';
      const isAggregateMode = isBatchCreate && form.watch('aggregate_mode');
      const isMultiKey = (channelData as any)?.multi_key_info?.is_multi_key;

      for (const file of files) {
        console.log(
          `🔍 处理文件: ${file.name}, 大小: ${file.size} bytes, 类型: ${file.type}`
        );
        try {
          // 检查文件大小（可选，防止过大文件导致浏览器卡顿）
          if (file.size > 10 * 1024 * 1024) {
            // 10MB限制
            newPreviewItems.push({
              fileName: file.name,
              projectId: '',
              status: 'error',
              error: 'File too large (over 10 MB).'
            });
            continue;
          }

          // 检查文件类型
          if (!file.name.toLowerCase().endsWith('.json')) {
            newPreviewItems.push({
              fileName: file.name,
              projectId: '',
              status: 'error',
              error: 'Invalid file type (must be a .json file).'
            });
            continue;
          }

          const text = await file.text();

          // 检查文件是否为空
          if (!text.trim()) {
            newPreviewItems.push({
              fileName: file.name,
              projectId: '',
              status: 'error',
              error: 'File is empty.'
            });
            continue;
          }

          const jsonData = JSON.parse(text);

          // 检查是否是有效的Google Cloud服务账号JSON
          if (!jsonData.type || jsonData.type !== 'service_account') {
            newPreviewItems.push({
              fileName: file.name,
              projectId: '',
              status: 'error',
              error: 'Not a valid Google Cloud service account JSON.'
            });
            continue;
          }

          if (jsonData.project_id) {
            // 直接允许上传，不检查重复
            jsonContents.push(text);
            newPreviewItems.push({
              fileName: file.name,
              projectId: jsonData.project_id,
              status: 'success'
            });
          } else {
            newPreviewItems.push({
              fileName: file.name,
              projectId: '',
              status: 'error',
              error: 'Missing project_id field.'
            });
          }
        } catch (error) {
          newPreviewItems.push({
            fileName: file.name,
            projectId: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Invalid JSON.'
          });
        }
      }

      // 累积显示：将新解析的文件添加到现有预览列表中
      setParsedFilesPreview((prev) => [...prev, ...newPreviewItems]);

      if (jsonContents.length > 0) {
        if (isBatchCreate || isAggregateMode || isMultiKey) {
          // 批量创建或多密钥模式：添加到相应字段
          if (isBatchCreate || isAggregateMode) {
            const currentBatchKeys = form.getValues('batch_keys') || '';
            const newBatchKeys = currentBatchKeys
              ? currentBatchKeys + '\n' + jsonContents.join('\n')
              : jsonContents.join('\n');
            form.setValue('batch_keys', newBatchKeys);
          } else if (isMultiKey) {
            const currentKey = form.getValues('key') || '';
            const newKey = currentKey
              ? currentKey + '\n' + jsonContents.join('\n')
              : jsonContents.join('\n');
            form.setValue('key', newKey);
          }
        } else {
          // 单个渠道创建：只处理第一个成功的文件
          const firstJsonData = JSON.parse(jsonContents[0]);

          // 🔄 新方案：将JSON凭证统一存储在key字段中
          // 这样可以统一处理单密钥和多密钥模式
          form.setValue('key', jsonContents[0]);
          form.setValue('vertex_ai_project_id', firstJsonData.project_id);

          // 兼容性：暂时保留adc字段，用于前端显示
          form.setValue('vertex_ai_adc', jsonContents[0]);

          console.log(
            `✅ Vertex AI凭证已设置到key字段，项目ID: ${firstJsonData.project_id}`
          );

          // 确保region为global
          if (!form.getValues('region')) {
            form.setValue('region', 'global');
          }
        }
      }

      const successCount = newPreviewItems.filter(
        (p) => p.status === 'success'
      ).length;
      const errorCount = newPreviewItems.filter(
        (p) => p.status === 'error'
      ).length;

      let message = `🔄 Files parsed!\n✅ Succeeded: ${successCount}`;
      if (errorCount > 0) {
        message += `\n❌ Failed: ${errorCount}`;
      }

      // provide different hints based on mode
      if (!isBatchCreate && !isAggregateMode && !isMultiKey) {
        if (successCount > 0) {
          message += '\n\nRelevant fields have been auto-filled.';
        }
      } else {
        if (successCount > 0) {
          message += '\n\nKeys added to the relevant field.';
        }
      }

      // show error details
      if (errorCount > 0) {
        const errorDetails = newPreviewItems
          .filter((item) => item.status === 'error')
          .map((item) => `• ${item.fileName}: ${item.error}`)
          .join('\n');
        message += `\n\nErrors:\n${errorDetails}`;
      }

      alert(message);
    } catch (error) {
      console.error('Failed to parse Vertex AI JSON files:', error);
      alert(
        `❌ Parse failed: ${
          error instanceof Error ? error.message : 'Unknown error.'
        }`
      );
    }
  };

  // 文件预览组件
  const FilePreviewList = ({
    files,
    onClear,
    onRemove
  }: {
    files: ParsedFileInfo[];
    onClear: () => void;
    onRemove: (index: number) => void;
  }) => {
    if (files.length === 0) return null;

    const successCount = files.filter((f) => f.status === 'success').length;
    const errorCount = files.filter((f) => f.status === 'error').length;

    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📋 File parse preview
            </span>
            <span className="text-xs text-gray-500">
              Total: {files.length} | ✅{successCount} | ❌{errorCount}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={`${file.fileName}-${file.projectId || 'error'}-${index}`}
              className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                file.status === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span>{file.status === 'success' ? '✅' : '❌'}</span>
                <span className="truncate font-mono" title={file.fileName}>
                  {file.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="max-w-24 flex-shrink-0">
                  {file.status === 'success' ? (
                    <span
                      className="truncate font-medium"
                      title={file.projectId}
                    >
                      {file.projectId}
                    </span>
                  ) : (
                    <span className="truncate text-xs" title={file.error}>
                      {file.error?.substring(0, 12)}...
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                  title="Remove this file"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 统计信息 */}
        {files.length > 5 && (
          <div className="mt-2 border-t pt-2 text-xs text-gray-500">
            💡 Showing all {files.length} files — scroll to see more.
          </div>
        )}
      </div>
    );
  };

  const MODEL_MAPPING_EXAMPLE = {
    'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
    'gpt-4-0314': 'gpt-4',
    'gpt-4-32k-0314': 'gpt-4-32k'
  };

  const type2secretPrompt = (type: string) => {
    switch (type) {
      case '15':
        return 'Enter your Qianfan API key (bce-v3/...).';
      case '18':
        return 'Format: APPID|APISecret|APIKey';
      case '22':
        return 'Format: APIKey-AppId, e.g. fastgpt-0sp2gtvfdgyi4k30jwlgwf1i-64f335d84283f05518e9e041';
      case '23':
        return 'Format: AppId|SecretId|SecretKey';
      case '33':
        return 'Format: AK|SK|Region, e.g. AKIA1234567890ABCDEF|wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY|us-east-1';
      case '41':
        return 'Format: AK|SK, e.g. your-access-key|your-secret-key';
      default:
        return 'Enter the API key for this channel.';
    }
  };

  if (isLoading && channelId !== 'create') {
    return (
      <Card className="mx-auto w-full">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            <Skeleton className="h-8 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('=== 开始提交 ===');

    // 防止重复提交
    if (isSubmitting) {
      console.log('正在提交中，忽略重复提交');
      return;
    }

    setIsSubmitting(true);
    setBatchProgress({ current: 0, total: 0 });

    try {
      // 处理customModelName，将其添加到models数组中
      let finalModels = [...(values.models || [])];
      if (values.customModelName && values.customModelName.trim()) {
        const customModels = values.customModelName
          .split(',')
          .map((model) => model.trim())
          .filter((model) => model.length > 0);

        // 将自定义模型添加到models数组中，去重
        customModels.forEach((customModel) => {
          if (!finalModels.includes(customModel)) {
            finalModels.push(customModel);
          }
        });
      }

      // --- 逻辑分支重构 ---
      // 判断是否为 Vertex AI
      const isVertexAI = Number(values.type) === 48;
      const isVertexAIAPIKeyMode =
        isVertexAI && values.vertex_key_type === 'api_key';
      const isVertexAIJSONMode =
        isVertexAI && (values.vertex_key_type || 'json') === 'json';

      // 判断批量创建：
      // - API Key 模式：使用 key 字段
      // - JSON 模式：优先使用 batch_keys，如果为空则尝试 key 或 vertex_ai_adc 字段
      let hasValidKeys = false;
      if (isVertexAIAPIKeyMode) {
        hasValidKeys = !!values.key;
      } else if (isVertexAIJSONMode) {
        // JSON 模式：检查 batch_keys、key 或 vertex_ai_adc 中是否有内容
        hasValidKeys = !!(
          values.batch_keys ||
          values.key ||
          values.vertex_ai_adc
        );
      } else {
        hasValidKeys = !!values.batch_keys;
      }

      const isBatchCreate =
        values.batch_create && hasValidKeys && channelId === 'create';
      const isAggregateMode = isBatchCreate && values.aggregate_mode;

      // 添加调试信息
      console.log('=== 调试信息 ===');
      console.log('values.batch_create:', values.batch_create);
      console.log('values.aggregate_mode:', values.aggregate_mode);
      console.log('channelId:', channelId);
      console.log('isVertexAIAPIKeyMode:', isVertexAIAPIKeyMode);
      console.log('isBatchCreate:', isBatchCreate);
      console.log('isAggregateMode:', isAggregateMode);

      // 根据渠道类型使用正确的密钥解析逻辑
      let keys: string[] = [];
      if (isVertexAI) {
        // Vertex AI
        if (isVertexAIAPIKeyMode) {
          // API Key 模式：从 key 字段按行分割
          keys = (values.key || '')
            .split('\n')
            .map((key) => key.trim())
            .filter((key) => key.length > 0);
        } else {
          // JSON 模式：使用与后端相同的JSON解析逻辑
          // 优先使用 batch_keys，如果为空则尝试 key 或 vertex_ai_adc 字段
          let jsonContent = values.batch_keys || '';
          if (!jsonContent && values.key) {
            jsonContent = values.key;
          }
          if (!jsonContent && values.vertex_ai_adc) {
            jsonContent = values.vertex_ai_adc;
          }

          try {
            // 使用简化的JSON对象提取逻辑（与后端ExtractJSONObjects类似）
            const jsonObjects: string[] = [];
            let balance = 0;
            let start = -1;
            const trimmed = jsonContent.trim();

            for (let i = 0; i < trimmed.length; i++) {
              const char = trimmed[i];
              if (char === '{') {
                if (balance === 0) start = i;
                balance++;
              } else if (char === '}') {
                if (balance > 0) {
                  balance--;
                  if (balance === 0 && start !== -1) {
                    jsonObjects.push(trimmed.slice(start, i + 1));
                    start = -1;
                  }
                }
              }
            }
            keys = jsonObjects;
            console.log(
              'Vertex AI JSON 模式 - 解析到',
              keys.length,
              '个 JSON 凭证'
            );
          } catch (error) {
            console.error('解析Vertex AI JSON时出错:', error);
            // 回退到简单计数
            keys = [];
          }
        }
      } else {
        // 其他渠道类型使用原有的行分割逻辑
        keys = (values.batch_keys || '')
          .split('\n')
          .map((key) => key.trim())
          .filter((key) => key.length > 0);
      }
      console.log('keys.length:', keys.length);

      const buildConfig = () => {
        const config: any = {};
        if (values.provider?.trim()) config.provider = values.provider.trim();
        if (values.region) config.region = values.region;
        if (values.ak) config.ak = values.ak;
        if (values.sk) config.sk = values.sk;
        if (values.user_id) config.user_id = values.user_id;
        if (values.vertex_ai_project_id)
          config.vertex_ai_project_id = values.vertex_ai_project_id;
        if (values.vertex_ai_adc) config.vertex_ai_adc = values.vertex_ai_adc;
        if (values.google_storage)
          config.google_storage = values.google_storage;
        // Vertex AI 新增配置
        if (values.vertex_key_type)
          config.vertex_key_type = values.vertex_key_type;
        // AWS Bedrock 密钥格式
        if (values.aws_key_type) config.aws_key_type = values.aws_key_type;
        if (values.vertex_model_region) {
          try {
            // 解析并存储模型区域映射
            config.vertex_model_region = JSON.parse(values.vertex_model_region);
          } catch (e) {
            // 如果解析失败，存储原始字符串
            config.vertex_model_region = values.vertex_model_region;
          }
        }
        // 新增：支持 Token 计数配置（仅 Anthropic=14 和 AWS Claude=33 渠道）
        const channelType = Number(values.type);
        if (
          (channelType === 14 || channelType === 33) &&
          values.support_count_tokens
        ) {
          config.support_count_tokens = values.support_count_tokens;
        }
        // Beta 过滤模式（Claude 相关渠道：14=Anthropic, 33=AWS Claude, 48=Vertex AI）
        if (
          (channelType === 14 || channelType === 33 || channelType === 48) &&
          values.beta_filter_mode &&
          values.beta_filter_mode !== 'none'
        ) {
          config.beta_filter_mode = values.beta_filter_mode;
        }
        return Object.keys(config).length > 0 ? JSON.stringify(config) : '';
      };

      const baseParams: Omit<ParamsOption, 'key' | 'name'> = {
        type: Number(values.type),
        group: values.groups.filter((g: string) => g.trim() !== '').join(','),
        models: finalModels.join(','),
        base_url: values.base_url || '',
        other: values.other || '',
        config: buildConfig(),
        model_mapping: values.model_mapping || '',
        header_override: values.header_override || '',
        priority: values.priority || 0,
        weight: values.weight || 0,
        discount: values.discount ?? 1,
        auto_disabled: values.auto_disabled ?? true,
        auto_enabled: values.auto_enabled ?? true,
        test_model: values.test_model || '',
        key_selection_mode: values.key_selection_mode || 1,
        batch_import_mode: values.batch_import_mode || 1
      };

      if (isAggregateMode) {
        // --- 1. 密钥聚合模式 ---
        console.log('=== 执行路径：密钥聚合模式 ===');
        console.log('准备发送的参数:', {
          name: values.name,
          keyCount: keys.length,
          keyPreview:
            keys.slice(0, 2).join(', ') + (keys.length > 2 ? '...' : '')
        });

        if (keys.length === 0) {
          throw new Error('Enter at least one valid key.');
        }

        const channelParams = {
          ...baseParams,
          name: values.name,
          key: keys.join('\n')
        };

        console.log('Sending aggregate create request...');
        const res = await fetch(`/api/channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channelParams),
          credentials: 'include'
        });

        if (!res.ok)
          throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
        const result = await res.json();
        if (!result.success)
          throw new Error(result.message || 'Create failed.');

        alert(
          `Aggregate channel "${values.name}" created with ${keys.length} keys.`
        );
        // 设置刷新标记，返回后列表页会自动刷新
        sessionStorage.setItem('channel_list_refresh', Date.now().toString());
        router.back();
      } else if (isBatchCreate) {
        // --- 2. 优化后的普通批量创建模式 ---
        console.log('=== 执行路径：普通批量创建模式 ===');
        console.log('=== 优化后的批量创建模式（分批串行处理）===');
        if (keys.length === 0) {
          throw new Error('Enter at least one valid key.');
        }

        const startTime = Date.now();
        setBatchProgress({ current: 0, total: keys.length });
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        const createChannel = async (key: string, index: number) => {
          const channelParams = {
            ...baseParams,
            key,
            name: `${values.name}_${index + 1}`
          };
          const res = await fetch(`/api/channel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(channelParams),
            credentials: 'include'
          });
          if (!res.ok)
            throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
          const result = await res.json();
          if (!result.success)
            throw new Error(result.message || 'Create failed.');
          return { success: true, index, key };
        };

        const BATCH_SIZE = 50;
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map((key, keyIndex) => {
            const globalIndex = i + keyIndex;
            return createChannel(key, globalIndex).catch((error) => ({
              success: false,
              index: globalIndex,
              key,
              error: error.message
            }));
          });
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach((result) => {
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              const errorResult = result as {
                error: string;
                index: number;
                key: string;
              };
              errors.push(
                `Key #${errorResult.index + 1} (${errorResult.key}) failed: ${
                  errorResult.error
                }`
              );
            }
            setBatchProgress((prev) => ({
              ...prev,
              current: prev.current + 1
            }));
          });
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const resultMessage = `Batch create complete!\nTotal: ${
          keys.length
        }\nSucceeded: ${successCount}\nFailed: ${failCount}\nTime: ${duration}s${
          errors.length > 0
            ? '\n\nErrors:\n' +
              errors.slice(0, 10).join('\n') +
              (errors.length > 10 ? '\n...' : '')
            : ''
        }`;
        alert(resultMessage);
        if (successCount > 0) {
          // 设置刷新标记，返回后列表页会自动刷新
          sessionStorage.setItem('channel_list_refresh', Date.now().toString());
          router.back();
        }
      } else {
        // --- 3. 单个创建/编辑模式 ---
        console.log('=== 执行路径：单个创建/编辑模式 ===');
        console.log(
          'channelData?.multi_key_info:',
          (channelData as any)?.multi_key_info
        );

        const isExistingMultiKey = (channelData as any)?.multi_key_info
          ?.is_multi_key;
        console.log('isExistingMultiKey:', isExistingMultiKey);

        const params = {
          type: Number(values.type),
          name: values.name,
          group: values.groups.filter((g: string) => g.trim() !== '').join(','),
          models: finalModels.join(','),
          key: values.key || '',
          base_url: values.base_url || '',
          other: values.other || '',
          config: buildConfig(),
          model_mapping: values.model_mapping || '',
          header_override: values.header_override || '',
          customModelName: values.customModelName || '',
          priority: values.priority || 0,
          weight: values.weight || 0,
          discount: values.discount ?? 1,
          auto_disabled: values.auto_disabled ?? true,
          auto_enabled: values.auto_enabled ?? true,
          test_model: values.test_model || '',
          other_settings: JSON.stringify({
            ...upstreamOtherSettings,
            upstream_model_update_check_enabled: upstreamCheckEnabled,
            upstream_model_update_auto_sync_enabled: upstreamAutoSyncEnabled,
            upstream_model_update_auto_delete_enabled: upstreamAutoDeleteEnabled
          }),
          key_selection_mode: values.key_selection_mode ?? 1,
          batch_import_mode: values.batch_import_mode ?? 1,
          ...(channelData && { id: (channelData as any).id }),
          // 如果是多密钥渠道，需要发送multi_key_info字段
          ...(isExistingMultiKey && {
            multi_key_info: {
              is_multi_key: true,
              key_selection_mode: values.key_selection_mode ?? 1,
              batch_import_mode: values.batch_import_mode ?? 1
            }
          })
        };

        console.log('最终发送的params:', params);

        const res = await fetch(`/api/channel`, {
          method: (channelData as any)?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          credentials: 'include'
        });

        if (!res.ok)
          throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
        const result = await res.json();
        if (!result.success)
          throw new Error(result.message || 'Unknown error.');

        // 设置刷新标记，返回后列表页会自动刷新
        sessionStorage.setItem('channel_list_refresh', Date.now().toString());
        router.back();
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(
        `Operation failed: ${
          error instanceof Error ? error.message : 'Unknown error.'
        }`
      );
    } finally {
      setIsSubmitting(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="border-gray-200 shadow-sm dark:border-gray-800">
        <CardHeader className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
          <CardTitle className="flex items-center gap-3 text-left text-2xl font-semibold text-gray-900 dark:text-gray-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <span className="text-lg">⚙️</span>
            </div>
            {channelId !== 'create' ? 'Edit channel' : 'New channel'}
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {channelId !== 'create'
              ? 'Update channel configuration and keep everything running smoothly.'
              : 'Configure a new channel. Supports single and bulk creation.'}
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 主要配置区域 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-800 dark:text-gray-200">
                      <span>⚙️</span> Basic configuration
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                              Channel type
                            </FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleTypeInputChange(value);
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-300 focus:border-gray-500 focus:ring-gray-200">
                                  <SelectValue placeholder="Select channel type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent style={{ height: '300px' }}>
                                {modelTypes.map((item) => (
                                  <SelectItem
                                    key={item.key}
                                    value={`${item.value}`}
                                  >
                                    {item.text}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                              Channel name
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="border-gray-300 focus:border-gray-500 focus:ring-gray-200"
                                placeholder="Enter a channel name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="例如 openai 或 azure"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-sm text-muted-foreground">
                              例如 openai 或 azure。请求失败时仅重试相同
                              Provider 的渠道。 留空保留原有重试行为。
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="groups"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                              Channel group
                            </FormLabel>
                            <FormControl>
                              <div className="flex flex-row flex-wrap gap-3">
                                {groupOptions.map((item) => (
                                  <div
                                    key={item}
                                    className="flex items-center space-x-2 rounded-md border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                                  >
                                    <Checkbox
                                      id={item}
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        const values = field.value ?? [];
                                        const newValues = checked
                                          ? [...values, item]
                                          : values.filter((v) => v !== item);
                                        newValues.sort(
                                          (a, b) =>
                                            groupOptions.indexOf(a) -
                                            groupOptions.indexOf(b)
                                        );
                                        field.onChange(newValues);
                                      }}
                                      className="data-[state=checked]:border-gray-500 data-[state=checked]:bg-gray-500"
                                    />
                                    <label
                                      htmlFor={item}
                                      className="cursor-pointer text-sm font-medium leading-none"
                                    >
                                      {item}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 条件显示字段 */}
                      {form.watch('type') === '3' && (
                        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                          <h4 className="mb-3 flex items-center gap-2 font-medium text-yellow-800 dark:text-yellow-200">
                            <span>🔧</span> Azure OpenAI configuration
                          </h4>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="base_url"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>AZURE_OPENAI_ENDPOINT</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      className="h-auto max-h-24 min-h-16 resize-none overflow-auto border-yellow-300 focus:border-yellow-500"
                                      placeholder="Enter AZURE_OPENAI_ENDPOINT, e.g. https://docs-test-001.openai.azure.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="other"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default API version</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      className="h-auto max-h-24 min-h-16 resize-none overflow-auto border-yellow-300 focus:border-yellow-500"
                                      placeholder="Enter default API version, e.g. 2024-03-01-preview"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {form.watch('type') === '8' && (
                        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                          <h4 className="mb-3 flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                            <span>🌐</span> Custom channel configuration
                          </h4>
                          <FormField
                            control={form.control}
                            name="base_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Base URL</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="h-auto max-h-24 min-h-16 resize-none overflow-auto border-green-300 focus:border-green-500"
                                    placeholder="Enter custom channel Base URL, e.g. https://openai.justsong.cn"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧配置区域 */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-800 dark:text-gray-200">
                      <span>🔑</span> Performance settings
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                                Priority
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-200"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(
                                      value === '' ? undefined : parseInt(value)
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                                Weight
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-200"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(
                                      value === '' ? undefined : parseInt(value)
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="auto_disabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                                Auto-disable
                              </FormLabel>
                              <div className="text-[0.8rem] text-muted-foreground">
                                When enabled, the channel will be automatically
                                disabled if it encounters errors. When disabled,
                                the channel will never be auto-disabled.
                              </div>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:border-gray-500 data-[state=checked]:bg-gray-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="auto_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                                Auto-enable
                              </FormLabel>
                              <div className="text-[0.8rem] text-muted-foreground">
                                When enabled, auto-disabled channels will be
                                automatically restored after passing a scheduled
                                test. When disabled, the channel must be
                                re-enabled manually.
                              </div>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:border-gray-500 data-[state=checked]:bg-gray-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="test_model"
                        render={({ field }) => (
                          <FormItem className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                              Test model
                            </FormLabel>
                            <div className="mb-2 text-[0.8rem] text-muted-foreground">
                              Model to use when auto-testing this channel. Leave
                              blank to use the first supported model.
                            </div>
                            <FormControl>
                              <Input
                                placeholder="e.g. gpt-3.5-turbo"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* 特殊类型配置 */}
                  {(form.watch('type') === '18' ||
                    form.watch('type') === '21' ||
                    form.watch('type') === '17' ||
                    form.watch('type') === '34' ||
                    form.watch('type') === '40') && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-800 dark:text-gray-200">
                        <span>🎯</span> Special configuration
                      </h3>
                      <div className="space-y-4">
                        {form.watch('type') === '18' && (
                          <FormField
                            control={form.control}
                            name="other"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                                  Spark model version
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="h-auto max-h-24 min-h-16 resize-none overflow-auto border-gray-300 focus:border-gray-500"
                                    placeholder="Enter Spark model version (from the API URL), e.g. v2.1"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch('type') === '21' && (
                          <FormField
                            control={form.control}
                            name="other"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                                  Knowledge base ID
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-200"
                                    placeholder="Enter knowledge base ID, e.g. 123456"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch('type') === '17' && (
                          <FormField
                            control={form.control}
                            name="other"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                                  Plugin parameter
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-200"
                                    placeholder="Enter plugin parameter (the value of the X-DashScope-Plugin request header)"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch('type') === '34' && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-blue-600">ℹ️</span>
                              <span className="font-medium text-blue-800 dark:text-blue-200">
                                Coze configuration notes
                              </span>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              For Coze, the model name is the Bot ID. You can
                              add a{' '}
                              <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">
                                bot-
                              </code>
                              prefix, e.g.
                              <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">
                                bot-123456
                              </code>
                            </p>
                          </div>
                        )}

                        {form.watch('type') === '40' && (
                          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-green-600">ℹ️</span>
                              <span className="font-medium text-green-800 dark:text-green-200">
                                Doubao configuration notes
                              </span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              For Doubao, you must manually go to the{' '}
                              <a
                                target="_blank"
                                href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
                                className="text-green-600 underline hover:text-green-800"
                              >
                                Model inference page
                              </a>{' '}
                              to create an inference endpoint. Use the endpoint
                              name as the model name, e.g.
                              <code className="rounded bg-green-100 px-1 dark:bg-green-900">
                                ep-20240608051426-tkxvl
                              </code>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 模型和映射配置区域 */}
              {form.watch('type') !== '43' && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-800 dark:text-gray-200">
                    <span>🤖</span> Model configuration
                  </h3>
                  <div className="space-y-6">
                    {/* 自定义模型名称 - 移到顶部 */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/50">
                      <FormField
                        control={form.control}
                        name="customModelName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
                              <span>✨</span> Custom model names
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Input
                                  className="border-blue-300 bg-white focus:border-blue-500 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-800"
                                  placeholder="Enter custom model names, comma-separated, e.g. gpt-4o,claude-3.5-sonnet"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800"
                                  onClick={() => {
                                    if (field.value && field.value.trim()) {
                                      const customModels = field.value
                                        .split(',')
                                        .map((model) => model.trim())
                                        .filter((model) => model.length > 0);

                                      const currentModels =
                                        form.getValues('models') || [];
                                      const newModels = [...currentModels];

                                      customModels.forEach((customModel) => {
                                        if (!newModels.includes(customModel)) {
                                          newModels.push(customModel);
                                        }
                                      });

                                      form.setValue('models', newModels);
                                    }
                                  }}
                                >
                                  🔄 Add to model list below
                                </Button>
                              </div>
                            </FormControl>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              💡 Click "Add to model list below" to add custom
                              models directly to the selection list.
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="models"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center justify-between font-medium text-gray-700 dark:text-gray-300">
                            <span>Supported models</span>
                            <span className="text-sm font-normal text-gray-500">
                              {field.value?.length || 0} models selected
                            </span>
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {/* 模型搜索区域 */}
                              <div className="relative rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/50">
                                <div className="mb-3 flex items-center gap-2">
                                  <span className="font-medium text-purple-800 dark:text-purple-200">
                                    🔍 Search models
                                  </span>
                                  <span className="text-sm text-purple-600 dark:text-purple-400">
                                    Quickly find and add models
                                  </span>
                                </div>
                                <div className="relative">
                                  <Input
                                    placeholder="Search model names, e.g. gpt-4, claude, gemini..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                      const query = e.target.value;
                                      setSearchQuery(query);
                                      // 防抖搜索
                                      if (searchTimeoutRef.current) {
                                        clearTimeout(searchTimeoutRef.current);
                                      }
                                      searchTimeoutRef.current = setTimeout(
                                        () => {
                                          searchModels(query);
                                        },
                                        300
                                      );
                                    }}
                                    className="border-purple-300 bg-white pr-20 focus:border-purple-500 focus:ring-purple-200 dark:border-purple-600 dark:bg-gray-800"
                                  />
                                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                                    {isSearching && (
                                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-purple-600"></div>
                                    )}
                                    {searchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSearchQuery('');
                                          setSearchResults([]);
                                          setShowSearchResults(false);
                                        }}
                                        className="rounded p-1 hover:bg-purple-100 dark:hover:bg-purple-800"
                                        title="Clear search"
                                      >
                                        <span className="text-xs text-purple-600">
                                          ✕
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* 搜索结果显示 */}
                                {showSearchResults && (
                                  <div className="mt-3 rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-600 dark:bg-gray-800">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                        Search results ({searchResults.length})
                                      </span>
                                      {searchResults.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentModels =
                                              field.value || [];
                                            const allSearchResultIds =
                                              searchResults.map(
                                                (model) => model.id
                                              );
                                            const newModels = [
                                              ...currentModels
                                            ];

                                            allSearchResultIds.forEach(
                                              (modelId) => {
                                                if (
                                                  !newModels.includes(modelId)
                                                ) {
                                                  newModels.push(modelId);
                                                }
                                              }
                                            );

                                            field.onChange(newModels);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="text-xs text-purple-600 hover:text-purple-800 hover:underline dark:text-purple-400 dark:hover:text-purple-200"
                                        >
                                          Add all
                                        </button>
                                      )}
                                    </div>

                                    {searchResults.length === 0 ? (
                                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                        {isSearching
                                          ? 'Searching...'
                                          : 'No matching models found.'}
                                      </div>
                                    ) : (
                                      <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                                        {searchResults.map((model) => {
                                          const isAlreadySelected =
                                            field.value?.includes(model.id);
                                          return (
                                            <div
                                              key={model.id}
                                              className={`flex items-center justify-between rounded-md border p-2 transition-colors ${
                                                isAlreadySelected
                                                  ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/50'
                                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className="cursor-pointer text-sm font-medium hover:underline"
                                                  onClick={() =>
                                                    copyToClipboard(model.id)
                                                  }
                                                  title={`Click to copy: ${model.id}`}
                                                >
                                                  {model.id}
                                                </span>
                                                {isAlreadySelected && (
                                                  <span className="text-xs text-green-600 dark:text-green-400">
                                                    ✓ Selected
                                                  </span>
                                                )}
                                              </div>
                                              {!isAlreadySelected && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newModels =
                                                      addModelFromSearch(
                                                        model.id,
                                                        field.value || []
                                                      );
                                                    field.onChange(newModels);
                                                  }}
                                                  className="rounded bg-purple-500 px-2 py-1 text-xs text-white hover:bg-purple-600"
                                                  title="Add this model"
                                                >
                                                  Add
                                                </button>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 操作按钮区域 */}
                              <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-900"
                                  onClick={() => {
                                    const currentType = form.watch('type');
                                    const allRelatedModelIds =
                                      relatedModels[currentType];
                                    const relatedModelIds = modelOptions
                                      .filter(
                                        (m) =>
                                          allRelatedModelIds?.includes(m.id)
                                      )
                                      .map((m) => m.id);
                                    field.onChange(relatedModelIds);
                                  }}
                                >
                                  🎯 Fill with related models
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900"
                                  onClick={fetchUpstreamModels}
                                  disabled={isFetchingModels}
                                >
                                  {isFetchingModels ? (
                                    <>
                                      <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></span>
                                      Fetching...
                                    </>
                                  ) : (
                                    '🔄 Fetch model list'
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900"
                                  onClick={() => {
                                    const allModelIds = modelOptions.map(
                                      (m) => m.id
                                    );
                                    field.onChange(allModelIds);
                                  }}
                                >
                                  ✅ Select all
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900"
                                  onClick={() => field.onChange([])}
                                >
                                  🗑️ Clear all models
                                </Button>
                              </div>

                              {/* 已选择的模型标签展示 */}
                              {field.value && field.value.length > 0 && (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/50">
                                  <div className="mb-3 flex items-center gap-2">
                                    <span className="font-medium text-green-800 dark:text-green-200">
                                      ✅ Selected models
                                    </span>
                                    <span className="text-sm text-green-600 dark:text-green-400">
                                      ({field.value.length} models)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {field.value.map((modelId: string) => (
                                      <div
                                        key={modelId}
                                        className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 transition-all hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700"
                                      >
                                        <span
                                          className="cursor-pointer hover:underline"
                                          onClick={() =>
                                            copyToClipboard(modelId)
                                          }
                                          title={`Click to copy: ${modelId}`}
                                        >
                                          {modelId}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newValues =
                                              field.value.filter(
                                                (v: string) => v !== modelId
                                              );
                                            field.onChange(newValues);
                                          }}
                                          className="ml-1 rounded-full p-0.5 hover:bg-green-300 dark:hover:bg-green-600"
                                          title="Remove this model"
                                        >
                                          <span className="text-xs">✕</span>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 可选择的模型列表 */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Available models
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Click to select/deselect | Right-click or
                                    double-click to copy name
                                  </span>
                                </div>
                                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:grid-cols-3 lg:grid-cols-4">
                                  {modelOptions.map((item) => {
                                    const isSelected = field.value?.includes(
                                      item.id
                                    );
                                    return (
                                      <div
                                        key={item.id}
                                        className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-all duration-200 hover:shadow-md ${
                                          isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/50'
                                            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500'
                                        }`}
                                        onClick={() => {
                                          const values = field.value ?? [];
                                          const newValues = isSelected
                                            ? values.filter(
                                                (v: string) => v !== item.id
                                              )
                                            : [...values, item.id];
                                          field.onChange(newValues);
                                        }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(item.id);
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          copyToClipboard(item.id);
                                        }}
                                        title={`Click to ${
                                          isSelected ? 'deselect' : 'select'
                                        } | Right-click or double-click to copy: ${
                                          item.id
                                        }`}
                                      >
                                        <div className="flex items-center justify-center gap-2">
                                          <div
                                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                                              isSelected
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-gray-300 dark:border-gray-500'
                                            }`}
                                          >
                                            {isSelected && (
                                              <span className="text-xs text-white">
                                                ✓
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div
                                          className={`mt-2 text-xs font-medium ${
                                            isSelected
                                              ? 'text-blue-700 dark:text-blue-200'
                                              : 'text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          {item.id}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model_mapping"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <JSONEditor
                              label="Model mapping"
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder={`Optional. Rewrites model names in request bodies. Format: JSON string.\nExample:\n${JSON.stringify(
                                MODEL_MAPPING_EXAMPLE,
                                null,
                                2
                              )}`}
                              template={MODEL_MAPPING_EXAMPLE}
                              templateLabel="Fill template"
                              keyPlaceholder="Requested model name"
                              valuePlaceholder="Actual model name to use"
                              extraText="Keys are the requested model name, values are the replacement."
                              channelModels={form.watch('models') || []}
                              onAddModels={(models) => {
                                const currentModels =
                                  form.getValues('models') || [];
                                const merged = Array.from(
                                  new Set([...currentModels, ...models])
                                );
                                form.setValue('models', merged);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="header_override"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <JSONEditor
                              label="Custom request headers"
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder={`Optional. Add or override HTTP headers for forwarded requests. Format: JSON string.\nExample:\n${JSON.stringify(
                                {
                                  'X-Custom-Header': 'custom-value',
                                  Authorization: 'Bearer {api_key}'
                                },
                                null,
                                2
                              )}\n\nSupported variable: {api_key} is replaced with the actual API key.`}
                              template={{
                                'X-Custom-Header': 'custom-value',
                                Authorization: 'Bearer {api_key}'
                              }}
                              templateLabel="Fill template"
                              keyPlaceholder="Header name"
                              valuePlaceholder="Header value"
                              extraText="Channel-level headers take the highest priority and will override any headers from the client."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {form.watch('type') === '33' && (
                <>
                  {/* 密钥格式选择 */}
                  <FormField
                    control={form.control}
                    name="aws_key_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Auto-detect format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ak_sk">
                              AK|SK|Region (SigV4)
                            </SelectItem>
                            <SelectItem value="api_key">
                              Bedrock API Key (Bearer)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-[0.8rem] text-muted-foreground">
                          {!field.value
                            ? 'When not selected, the backend auto-detects the format: 2 parts = Bedrock API Key, 3 parts = AK|SK|Region.'
                            : field.value === 'ak_sk'
                            ? 'Format: AccessKey|SecretKey|Region, one per line.'
                            : 'Format: BedrockAPIKey|Region, one per line (BedrockAPIKey is Base64-encoded).'}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API key (Key)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={
                              form.watch('aws_key_type') === 'api_key'
                                ? 'One per line, format: BedrockAPIKey|Region'
                                : 'One per line, format: AK|SK|Region'
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch('type') === '48' && (
                <>
                  {/* 密钥格式选择 */}
                  <FormField
                    control={form.control}
                    name="vertex_key_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || 'json'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select key format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-[0.8rem] text-muted-foreground">
                          {(field.value || 'json') === 'json'
                            ? 'JSON mode supports manual entry or service account JSON upload.'
                            : 'API Key mode uses a Vertex AI API key directly.'}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* JSON 模式配置 */}
                  {(form.watch('vertex_key_type') || 'json') === 'json' && (
                    <>
                      {/* 密钥输入方式切换 */}
                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            Key input method
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={
                                vertexInputMode === 'upload'
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => setVertexInputMode('upload')}
                            >
                              File upload
                            </Button>
                            <Button
                              type="button"
                              variant={
                                vertexInputMode === 'manual'
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => setVertexInputMode('manual')}
                            >
                              Manual entry
                            </Button>
                          </div>
                        </div>

                        {/* 文件上传 */}
                        {vertexInputMode === 'upload' && (
                          <div className="space-y-3">
                            <FormLabel>Key file (.json) *</FormLabel>
                            <FileUploader
                              value={vertexAiFiles}
                              onValueChange={setVertexAiFiles}
                              onUpload={handleVertexAiFileUpload}
                              accept={{
                                'application/json': ['.json'],
                                'text/json': ['.json'],
                                'text/plain': ['.json']
                              }}
                              maxSize={50 * 1024 * 1024}
                              maxFiles={100}
                              multiple={true}
                              className="w-full"
                            />
                            <div className="text-xs text-muted-foreground">
                              Click to upload or drag files here. JSON files
                              only.
                            </div>
                            {/* 文件预览 */}
                            <FilePreviewList
                              files={parsedFilesPreview}
                              onClear={() => {
                                setParsedFilesPreview([]);
                                setVertexAiFiles([]);
                              }}
                              onRemove={handleRemoveFile}
                            />
                          </div>
                        )}

                        {/* 手动输入 */}
                        {vertexInputMode === 'manual' && (
                          <FormField
                            control={form.control}
                            name="vertex_ai_adc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Service account JSON credential
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="h-auto max-h-48 min-h-32 resize-none overflow-auto font-mono text-sm"
                                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleVertexAiAdcChange(e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <div className="text-[0.8rem] text-muted-foreground">
                                  Paste JSON to auto-extract project_id.
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Vertex AI JSON 模式的批量创建/聚合选项 - 仅在创建模式下显示 */}
                      {channelId === 'create' && (
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">
                              Multi-key handling
                            </div>
                            <div className="text-[0.8rem] text-muted-foreground">
                              How to handle multiple JSON credentials uploaded
                              or entered.
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <FormField
                              control={form.control}
                              name="batch_create"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <Checkbox
                                    id="vertex_json_batch_create"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                  <label
                                    htmlFor="vertex_json_batch_create"
                                    className="cursor-pointer text-sm font-medium leading-none"
                                  >
                                    Batch create
                                  </label>
                                </FormItem>
                              )}
                            />
                            {form.watch('batch_create') && (
                              <FormField
                                control={form.control}
                                name="aggregate_mode"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <Checkbox
                                      id="vertex_json_aggregate_mode"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <label
                                      htmlFor="vertex_json_aggregate_mode"
                                      className="cursor-pointer text-sm font-medium leading-none"
                                    >
                                      Key aggregate mode
                                    </label>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* 提示信息 */}
                      {channelId === 'create' && (
                        <div className="text-[0.8rem] text-muted-foreground">
                          {!form.watch('batch_create')
                            ? '💡 Default: all JSON credentials are aggregated into one channel; keys are rotated automatically.'
                            : form.watch('aggregate_mode')
                            ? '✅ Aggregate mode: all JSON credentials are aggregated into one channel; keys are rotated automatically.'
                            : '📦 Batch create: each JSON credential will create a separate channel.'}
                        </div>
                      )}
                    </>
                  )}

                  {/* API Key 模式配置 */}
                  {form.watch('vertex_key_type') === 'api_key' && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter Vertex AI API Keys (one per line)"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <div className="text-[0.8rem] text-muted-foreground">
                              Authenticate with Vertex AI API Keys. Multiple
                              keys are supported (one per line).
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Vertex AI API Key 模式的批量创建/聚合选项 - 仅在创建模式下显示 */}
                      {channelId === 'create' && (
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">
                              Multi-key handling
                            </div>
                            <div className="text-[0.8rem] text-muted-foreground">
                              How to handle multiple API keys entered.
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <FormField
                              control={form.control}
                              name="batch_create"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <Checkbox
                                    id="vertex_batch_create"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                  <label
                                    htmlFor="vertex_batch_create"
                                    className="cursor-pointer text-sm font-medium leading-none"
                                  >
                                    Batch create
                                  </label>
                                </FormItem>
                              )}
                            />
                            {form.watch('batch_create') && (
                              <FormField
                                control={form.control}
                                name="aggregate_mode"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <Checkbox
                                      id="vertex_aggregate_mode"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <label
                                      htmlFor="vertex_aggregate_mode"
                                      className="cursor-pointer text-sm font-medium leading-none"
                                    >
                                      Key aggregate mode
                                    </label>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* 提示信息 */}
                      <div className="text-[0.8rem] text-muted-foreground">
                        {!form.watch('batch_create')
                          ? '💡 Default: all keys are aggregated into one channel; keys are rotated automatically.'
                          : form.watch('aggregate_mode')
                          ? '✅ Aggregate mode: all keys are aggregated into one channel; keys are rotated automatically.'
                          : '📦 Batch create: each key will create a separate channel.'}
                      </div>
                    </div>
                  )}

                  {/* 部署地区配置 */}
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Deployment region
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            vertexRegionMode === 'visual'
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => setVertexRegionMode('visual')}
                        >
                          Visual
                        </Button>
                        <Button
                          type="button"
                          variant={
                            vertexRegionMode === 'manual'
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => setVertexRegionMode('manual')}
                        >
                          Manual edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // 填入模板
                            form.setValue(
                              'vertex_model_region',
                              JSON.stringify(
                                {
                                  'gemini-2.5-pro': 'us-central1',
                                  'gemini-2.5-flash': 'us-east5'
                                },
                                null,
                                2
                              )
                            );
                          }}
                        >
                          Fill template
                        </Button>
                      </div>
                    </div>

                    {/* 可视化模式 */}
                    {vertexRegionMode === 'visual' && (
                      <div className="space-y-4">
                        {/* 默认区域 */}
                        <FormField
                          control={form.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default region</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Default region, e.g. us-central1"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 模型专用区域 */}
                        <div className="space-y-3">
                          <FormLabel>Model-specific regions</FormLabel>
                          {vertexModelRegions.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <Input
                                placeholder="Model name"
                                value={item.model}
                                onChange={(e) => {
                                  const newRegions = [...vertexModelRegions];
                                  newRegions[index].model = e.target.value;
                                  setVertexModelRegions(newRegions);
                                  updateVertexModelRegionField(newRegions);
                                }}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Region"
                                value={item.region}
                                onChange={(e) => {
                                  const newRegions = [...vertexModelRegions];
                                  newRegions[index].region = e.target.value;
                                  setVertexModelRegions(newRegions);
                                  updateVertexModelRegionField(newRegions);
                                }}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newRegions = vertexModelRegions.filter(
                                    (_, i) => i !== index
                                  );
                                  setVertexModelRegions(newRegions);
                                  updateVertexModelRegionField(newRegions);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVertexModelRegions([
                                ...vertexModelRegions,
                                { model: '', region: '' }
                              ]);
                            }}
                          >
                            + Add model region
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Set default and model-specific regions.
                        </div>
                      </div>
                    )}

                    {/* 手动编辑模式 */}
                    {vertexRegionMode === 'manual' && (
                      <FormField
                        control={form.control}
                        name="vertex_model_region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model region map (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                className="h-auto min-h-24 resize-none font-mono text-sm"
                                placeholder='{"gemini-2.5-pro": "us-central1", "gemini-2.5-flash": "us-east5"}'
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Google Storage (可选) */}
                  <FormField
                    control={form.control}
                    name="google_storage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Storage bucket (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. gs://ezlinkai-veo322"
                            {...field}
                          />
                        </FormControl>
                        <div className="text-[0.8rem] text-muted-foreground">
                          Storage bucket for Veo3 video generation. Format:
                          gs://bucket-name. Leave blank to use the default.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch('type') === '34' && (
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="User ID that generated the key"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 可灵渠道专用AK|SK输入 */}
              {form.watch('type') === '41' && (
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API key (Key)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter Kling AI keys, one per line, format: AK|SK"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <>
                {/* 批量创建开关 - 仅在创建模式下显示，且排除 Vertex AI API Key 模式（已在上方单独处理） */}
                {channelId === 'create' &&
                  !(
                    form.watch('type') === '48' &&
                    form.watch('vertex_key_type') === 'api_key'
                  ) && (
                    <>
                      <FormField
                        control={form.control}
                        name="batch_create"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Batch create
                              </FormLabel>
                              <div className="text-[0.8rem] text-muted-foreground">
                                When enabled, enter multiple keys to create
                                multiple channels in parallel.
                              </div>
                            </div>
                            <FormControl>
                              <div className="flex items-center space-x-4">
                                {form.watch('batch_create') && (
                                  <FormField
                                    control={form.control}
                                    name="aggregate_mode"
                                    render={({ field: aggregateField }) => (
                                      <FormItem className="flex items-center space-x-2">
                                        <Checkbox
                                          id="aggregate_mode"
                                          checked={aggregateField.value}
                                          onCheckedChange={
                                            aggregateField.onChange
                                          }
                                        />
                                        <label
                                          htmlFor="aggregate_mode"
                                          className="cursor-pointer text-sm font-medium leading-none"
                                        >
                                          Key aggregate mode
                                        </label>
                                      </FormItem>
                                    )}
                                  />
                                )}
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* 批量创建进度显示 */}
                      {form.watch('batch_create') &&
                        isSubmitting &&
                        batchProgress.total > 0 && (
                          <div className="rounded border border-green-200 bg-green-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-green-800">
                                Batch create progress
                              </span>
                              <span className="text-sm text-green-600">
                                {batchProgress.current} / {batchProgress.total}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-green-200">
                              <div
                                className="h-2 rounded-full bg-green-600 transition-all duration-300"
                                style={{
                                  width: `${
                                    batchProgress.total > 0
                                      ? (batchProgress.current /
                                          batchProgress.total) *
                                        100
                                      : 0
                                  }%`
                                }}
                              ></div>
                            </div>
                            <div className="mt-1 text-xs text-green-600">
                              {batchProgress.current === batchProgress.total
                                ? 'Done! Redirecting...'
                                : 'Creating channels in parallel...'}
                            </div>
                          </div>
                        )}
                    </>
                  )}

                {/* 根据批量创建开关显示不同的密钥输入界面 - 排除 Vertex AI API Key 模式（已在上方单独处理） */}
                {form.watch('batch_create') &&
                channelId === 'create' &&
                !(
                  form.watch('type') === '48' &&
                  form.watch('vertex_key_type') === 'api_key'
                ) ? (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="batch_keys"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch keys</FormLabel>
                          <FormControl>
                            <Textarea
                              className="h-auto max-h-64 min-h-32 resize-none overflow-auto"
                              placeholder={`Enter keys one per line.

🚀 Performance:
• Parallel processing — 10x faster
• Batches of 10 to reduce server load
• Progress shown automatically

Example:
sk-1234567890abcdef
sk-0987654321fedcba
sk-abcdef1234567890

${type2secretPrompt(form.watch('type'))}`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Vertex AI 批量JSON文件上传提示 */}
                    {form.watch('type') === '48' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          💡 <strong>Vertex AI tip</strong>: Use the "Vertex AI
                          JSON file upload" section above to upload multiple
                          JSON files in batch.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  form.watch('type') !== '33' &&
                  form.watch('type') !== '41' &&
                  form.watch('type') !== '48' && (
                    <FormField
                      control={form.control}
                      name="key"
                      render={({ field }) => {
                        // 检查当前渠道是否为多密钥聚合渠道
                        const isMultiKey = (channelData as any)?.multi_key_info
                          ?.is_multi_key;

                        return (
                          <FormItem>
                            <FormLabel>
                              {isMultiKey ? 'Key management' : 'API key'}
                              {isMultiKey && (
                                <span className="ml-2 text-xs text-blue-600">
                                  (Multi-key aggregate channel)
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              {isMultiKey ? (
                                <div className="space-y-3">
                                  <Textarea
                                    className="h-auto max-h-48 min-h-24 resize-none overflow-auto"
                                    placeholder={`Multi-key aggregate channel key management:

🔑 Add keys:
• One key per line
• Paste multiple keys at once
• Append or overwrite existing keys based on edit mode

⚙️ Current config:
• Key selection: ${
                                      form.watch('key_selection_mode') === 0
                                        ? 'Round-robin'
                                        : 'Random'
                                    }
• Edit mode: ${form.watch('batch_import_mode') === 0 ? 'Overwrite' : 'Append'}

💡 You can change key selection and edit mode in the channel settings.`}
                                    {...field}
                                  />

                                  {/* Vertex AI 多密钥JSON文件上传提示 */}
                                  {form.watch('type') === '48' && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                                      <div className="text-sm text-green-700 dark:text-green-300">
                                        💡 <strong>Vertex AI tip</strong>: Use
                                        the "Vertex AI JSON file upload" section
                                        above to upload multiple JSON files.
                                        <br />
                                        🔧 Keys will be processed according to
                                        the current edit mode (
                                        {form.watch('batch_import_mode') === 0
                                          ? 'overwrite'
                                          : 'append'}
                                        ).
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Input
                                  placeholder={type2secretPrompt(
                                    form.watch('type')
                                  )}
                                  {...field}
                                />
                              )}
                            </FormControl>
                            {isMultiKey && (
                              <div className="text-xs text-gray-600">
                                <p>
                                  • <strong>Append mode</strong>: new keys are
                                  added to the existing key list.
                                </p>
                                <p>
                                  • <strong>Overwrite mode</strong>: new keys
                                  replace all existing keys.
                                </p>
                                <p>
                                  • Edit mode can be changed in the key
                                  configuration section above.
                                </p>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )
                )}
              </>

              {form.watch('type') === '37' && (
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Account ID, e.g. d8d7c61dbc334c32d3ced580e4bf42b4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch('type') !== '3' &&
                form.watch('type') !== '8' &&
                form.watch('type') !== '22' &&
                form.watch('type') !== '33' && (
                  <FormField
                    control={form.control}
                    name="base_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent</FormLabel>
                        <FormControl>
                          <Textarea
                            className="h-auto max-h-64 min-h-32 resize-none overflow-auto"
                            placeholder={
                              form.watch('type') === '15'
                                ? 'Default: https://qianfan.baidubce.com (also accepts /v2 or /anthropic).'
                                : 'This option is used to make API calls through the proxy station, please enter the proxy address in the format https://domain.com'
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              {form.watch('type') === '22' && (
                <FormField
                  control={form.control}
                  name="base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private deployment address</FormLabel>
                      <FormControl>
                        <Textarea
                          className="h-auto max-h-64 min-h-32 resize-none overflow-auto"
                          placeholder="Enter private deployment address, e.g. https://fastgpt.run/api/openapi"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter priority (default 0)"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseInt(value)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter weight (default 0)"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseInt(value)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.channelForm.discountLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        max="1"
                        step="0.01"
                        placeholder={t.channelForm.discountPlaceholder}
                        {...field}
                        value={field.value ?? 1}
                        onChange={(e) => {
                          const value = e.target.value;
                          const parsed = parseFloat(value);
                          field.onChange(
                            value === '' || isNaN(parsed) ? 1 : parsed
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_disabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-disable</FormLabel>
                      <div className="text-[0.8rem] text-muted-foreground">
                        When enabled, the channel will be automatically disabled
                        if it encounters errors.
                      </div>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-enable</FormLabel>
                      <div className="text-[0.8rem] text-muted-foreground">
                        When enabled, auto-disabled channels will be
                        automatically restored after passing a scheduled test.
                      </div>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="test_model"
                render={({ field }) => (
                  <FormItem className="rounded-lg border p-4">
                    <FormLabel className="text-base">Test model</FormLabel>
                    <div className="mb-2 text-[0.8rem] text-muted-foreground">
                      Model to use when auto-testing this channel. Leave blank
                      to use the first supported model.
                    </div>
                    <FormControl>
                      <Input
                        placeholder="e.g. gpt-3.5-turbo"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 支持 Token 计数 - 仅 Anthropic (14) 和 AWS Claude (33) 渠道显示 */}
              {(form.watch('type') === '14' || form.watch('type') === '33') && (
                <FormField
                  control={form.control}
                  name="support_count_tokens"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Support token counting
                        </FormLabel>
                        <div className="text-[0.8rem] text-muted-foreground">
                          When enabled, this channel can handle
                          /v1/messages/count_tokens requests. Ensure the
                          upstream API supports this.
                        </div>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* Beta 过滤模式 - Claude 相关渠道显示 (14/33/48) */}
              {['14', '33', '48'].includes(form.watch('type')) && (
                <FormField
                  control={form.control}
                  name="beta_filter_mode"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Beta flag filter mode
                        </FormLabel>
                        <div className="text-[0.8rem] text-muted-foreground">
                          Filter incompatible beta flags from clients to prevent
                          400 errors from upstream.
                        </div>
                      </div>
                      <FormControl>
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No filter (pass through)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              No filter (pass through)
                            </SelectItem>
                            <SelectItem value="bedrock">
                              Filter for AWS Bedrock compatibility
                            </SelectItem>
                            <SelectItem value="vertex">
                              Filter for Vertex AI compatibility
                            </SelectItem>
                            <SelectItem value="bedrock_vertex">
                              Bedrock + Vertex AI compatible (strictest)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* 多密钥配置选项 - 只在多密钥渠道时显示 */}
              {((channelData as any)?.multi_key_info?.is_multi_key ||
                form.watch('aggregate_mode')) && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="key_selection_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key selection mode</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select key selection mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Round-robin</SelectItem>
                            <SelectItem value="1">Random</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-[0.8rem] text-muted-foreground">
                          {field.value === 0
                            ? 'Use keys in order.'
                            : 'Pick a key at random.'}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batch_import_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key edit mode</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select key edit mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Overwrite</SelectItem>
                            <SelectItem value="1">Append</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-[0.8rem] text-muted-foreground">
                          {field.value === 0
                            ? 'Overwrites existing keys on edit.'
                            : 'Appends to existing keys on edit.'}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 上游模型巡检配置 */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-950/30">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-indigo-800 dark:text-indigo-200">
                  <span>🔄</span> Upstream model patrol
                </h3>
                <div className="space-y-4">
                  {/* 开启巡检开关 */}
                  <div className="flex flex-row items-center justify-between rounded-lg border border-indigo-200 bg-white p-4 dark:border-indigo-700 dark:bg-gray-800">
                    <div className="space-y-0.5">
                      <div className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Enable upstream model patrol
                      </div>
                      <div className="text-[0.8rem] text-muted-foreground">
                        When enabled, the system periodically checks upstream
                        for added or removed models.
                      </div>
                    </div>
                    <Checkbox
                      checked={upstreamCheckEnabled}
                      onCheckedChange={(v) => setUpstreamCheckEnabled(!!v)}
                      className="data-[state=checked]:border-indigo-500 data-[state=checked]:bg-indigo-500"
                    />
                  </div>

                  {/* 自动同步/删除 - 仅当巡检开启时显示 */}
                  {upstreamCheckEnabled && (
                    <div className="space-y-3">
                      {/* 自动同步新增 */}
                      <div className="flex flex-row items-center justify-between rounded-lg border border-indigo-200 bg-white p-4 dark:border-indigo-700 dark:bg-gray-800">
                        <div className="space-y-0.5">
                          <div className="text-base font-medium text-gray-700 dark:text-gray-300">
                            Auto-sync new models
                          </div>
                          <div className="text-[0.8rem] text-muted-foreground">
                            New models detected by patrol are automatically
                            added to the channel's model list.
                          </div>
                        </div>
                        <Checkbox
                          checked={upstreamAutoSyncEnabled}
                          onCheckedChange={(v) =>
                            setUpstreamAutoSyncEnabled(!!v)
                          }
                          className="data-[state=checked]:border-indigo-500 data-[state=checked]:bg-indigo-500"
                        />
                      </div>

                      {/* 自动删除已移除模型 */}
                      <div className="flex flex-row items-center justify-between rounded-lg border border-indigo-200 bg-white p-4 dark:border-indigo-700 dark:bg-gray-800">
                        <div className="space-y-0.5">
                          <div className="text-base font-medium text-gray-700 dark:text-gray-300">
                            Auto-remove deprecated models
                          </div>
                          <div className="text-[0.8rem] text-muted-foreground">
                            Models no longer provided upstream are automatically
                            removed from the channel's model list.
                          </div>
                        </div>
                        <Checkbox
                          checked={upstreamAutoDeleteEnabled}
                          onCheckedChange={(v) =>
                            setUpstreamAutoDeleteEnabled(!!v)
                          }
                          className="data-[state=checked]:border-red-400 data-[state=checked]:bg-red-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* 手动检测 - 仅编辑模式 */}
                  {channelId && channelId !== 'create' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDetecting}
                          onClick={handleDetectUpstream}
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300"
                        >
                          {isDetecting ? 'Scanning...' : '🔍 Scan now'}
                        </Button>
                        {upstreamDetectResult?.lastCheckTime ? (
                          <span className="text-xs text-muted-foreground">
                            Last scanned:
                            {new Date(
                              upstreamDetectResult.lastCheckTime * 1000
                            ).toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      {/* 检测结果展示 */}
                      {upstreamDetectResult &&
                        (upstreamDetectResult.addModels.length > 0 ||
                          upstreamDetectResult.removeModels.length > 0) && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950/40">
                            <div className="mb-3 font-medium text-yellow-800 dark:text-yellow-200">
                              Pending changes
                            </div>
                            <div className="space-y-3">
                              {upstreamDetectResult.addModels.length > 0 && (
                                <div>
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                      ➕ New models (
                                      {upstreamDetectResult.addModels.length})
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isApplyingUpstream}
                                      onClick={() =>
                                        handleApplyUpstream(
                                          upstreamDetectResult.addModels,
                                          [],
                                          []
                                        )
                                      }
                                      className="h-6 border-green-300 px-2 text-xs text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300"
                                    >
                                      Add all
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {upstreamDetectResult.addModels
                                      .slice(0, 12)
                                      .map((m) => (
                                        <span
                                          key={m}
                                          className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                                        >
                                          {m}
                                        </span>
                                      ))}
                                    {upstreamDetectResult.addModels.length >
                                      12 && (
                                      <span className="text-xs text-muted-foreground">
                                        +
                                        {upstreamDetectResult.addModels.length -
                                          12}{' '}
                                        more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {upstreamDetectResult.removeModels.length > 0 && (
                                <div>
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                      ➖ Models to remove (
                                      {upstreamDetectResult.removeModels.length}
                                      )
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isApplyingUpstream}
                                      onClick={() =>
                                        handleApplyUpstream(
                                          [],
                                          upstreamDetectResult.removeModels,
                                          []
                                        )
                                      }
                                      className="h-6 border-red-300 px-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400"
                                    >
                                      Remove all
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {upstreamDetectResult.removeModels
                                      .slice(0, 12)
                                      .map((m) => (
                                        <span
                                          key={m}
                                          className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300"
                                        >
                                          {m}
                                        </span>
                                      ))}
                                    {upstreamDetectResult.removeModels.length >
                                      12 && (
                                      <span className="text-xs text-muted-foreground">
                                        +
                                        {upstreamDetectResult.removeModels
                                          .length - 12}{' '}
                                        more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {upstreamDetectResult.addModels.length > 0 &&
                                upstreamDetectResult.removeModels.length >
                                  0 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isApplyingUpstream}
                                    onClick={() =>
                                      handleApplyUpstream(
                                        upstreamDetectResult.addModels,
                                        upstreamDetectResult.removeModels,
                                        []
                                      )
                                    }
                                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                                  >
                                    {isApplyingUpstream
                                      ? 'Applying...'
                                      : '✅ Apply all (add + remove)'}
                                  </Button>
                                )}
                            </div>
                          </div>
                        )}

                      {upstreamDetectResult &&
                        upstreamDetectResult.addModels.length === 0 &&
                        upstreamDetectResult.removeModels.length === 0 &&
                        upstreamDetectResult.lastCheckTime > 0 && (
                          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300">
                            ✅ Upstream model list is in sync — no changes
                            detected.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* 提交按钮区域 */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      onClick={() => window.history.back()}
                    >
                      <span className="mr-2">⬅️</span>
                      Back to list
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    {isSubmitting && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600 dark:border-gray-400"></div>
                        <span>
                          {form.watch('batch_create') && batchProgress.total > 0
                            ? `Batch creating... (${batchProgress.current}/${batchProgress.total})`
                            : 'Processing...'}
                        </span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gray-900 px-8 py-2 font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                      {!isSubmitting && (
                        <span className="mr-2">
                          {channelId !== 'create'
                            ? '✅'
                            : form.watch('batch_create')
                            ? '🚀'
                            : '➕'}
                        </span>
                      )}
                      {isSubmitting
                        ? form.watch('batch_create') && batchProgress.total > 0
                          ? `Creating... (${batchProgress.current}/${batchProgress.total})`
                          : 'Submitting...'
                        : channelId !== 'create'
                        ? 'Update channel'
                        : form.watch('batch_create')
                        ? 'Start batch create'
                        : 'Create channel'}
                    </Button>
                  </div>
                </div>

                {/* 表单状态提示 */}
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span>ℹ️</span>
                      <span>
                        {channelId !== 'create' ? 'Edit mode' : 'Create mode'}
                        {form.watch('batch_create') && ' - Batch create'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span>✓</span>
                      <span>Auto-save configuration</span>{' '}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span>🔒</span>
                      <span>Security verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 获取上游模型列表弹窗 */}
      <ModelSelectModal
        open={modelSelectModalOpen}
        models={fetchedModels}
        selected={form.getValues('models') || []}
        loading={isFetchingModels}
        onConfirm={handleModelSelectConfirm}
        onCancel={() => setModelSelectModalOpen(false)}
      />
    </div>
  );
}
