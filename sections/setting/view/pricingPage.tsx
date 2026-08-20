'use client';
import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  RefreshCcw,
  Copy,
  Calculator,
  Info,
  Layers3
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';

interface Option {
  key: string;
  value: any;
}

interface ModelPriceInfo {
  model_name: string;
  model_ratio: number;
  completion_ratio: number;
  fixed_price: number;
  input_price: number;
  output_price: number;
  price_type: string;
  has_ratio: boolean;
  cache_ratio: number;
  create_cache_ratio: number;
  image_input_ratio: number;
  image_output_ratio: number;
  audio_input_ratio: number;
  audio_output_ratio: number;
}

interface EditingRow {
  model_name: string;
  // 价格输入（$/1M tokens），UI 展示与编辑用
  input_price: string;
  output_price: string;
  cache_price: string;
  create_cache_price: string;
  image_input_price: string;
  image_output_price: string;
  audio_input_price: string;
  audio_output_price: string;
  // 按次计费（元），本就是价格，保持原样
  fixed_price: string;
  // 换算后的倍率，保存时发给后端（后端仍按倍率存储/计费）
  model_ratio: string;
  completion_ratio: string;
  cache_ratio: string;
  create_cache_ratio: string;
  image_input_ratio: string;
  image_output_ratio: string;
  audio_input_ratio: string;
  audio_output_ratio: string;
}

// 未设置倍率模型的编辑数据
interface UnsetModelEditData {
  // 价格输入（$/1M tokens）
  input_price: string; // 文字输入价格
  output_price: string; // 文字输出价格
  cache_price: string; // 缓存价格
  create_cache_price: string; // 缓存创建价格
  image_input_price: string; // 图片输入价格
  image_output_price: string; // 图片输出价格
  audio_input_price: string; // 音频输入价格
  audio_output_price: string; // 音频输出价格
  // 计算后的倍率
  model_ratio: string;
  completion_ratio: string;
  cache_ratio: string;
  create_cache_ratio: string;
  image_input_ratio: string;
  image_output_ratio: string;
  audio_input_ratio: string;
  audio_output_ratio: string;
}

// 视频定价规则
interface VideoPricingRule {
  model: string; // 模型名或通配符
  type: string; // 类型: image-to-video, text-to-video, *
  mode: string; // 模式: standard, professional, *
  duration: string; // 时长: 5, 10, 15, *
  resolution: string; // 分辨率: 480P, 720P, 1080P, *
  pricing_type: string; // per_second 或 fixed
  price: number; // 价格
  currency: string; // 货币: USD, CNY
  priority: number; // 优先级
}

// 价格转倍率的换算函数
// 所有倍率都是相对于"文字输入价格"来计算的
// ModelRatio = 文字输入价格($/1M tokens) / 2
// CompletionRatio = 文字输出价格 / 文字输入价格
// AudioInputRatio = 音频输入价格 / 文字输入价格
// AudioOutputRatio = 音频输出价格 / 文字输入价格
// ImageInputRatio = 图片输入价格 / 文字输入价格
// ImageOutputRatio = 图片输出价格 / 文字输入价格
const priceToModelRatio = (inputPrice: number): number => {
  return inputPrice / 2;
};

const priceToRatio = (price: number, baseInputPrice: number): number => {
  if (baseInputPrice === 0) return 1;
  return price / baseInputPrice;
};

// 倍率反算价格（用于编辑弹窗：把后端存的倍率显示成价格）
// 文字输入价格 = ModelRatio × 2
const modelRatioToInputPrice = (modelRatio: number): number => {
  return modelRatio * 2;
};

// 子项价格 = 子倍率 × 文字输入价格 = 子倍率 × ModelRatio × 2
const subRatioToPrice = (subRatio: number, modelRatio: number): number => {
  return subRatio * modelRatio * 2;
};

// 把数值格式化成简洁字符串（去掉无意义的尾随小数；0/非法 → 空串）
const formatPriceStr = (value: number): string => {
  if (!isFinite(value) || value <= 0) return '';
  return parseFloat(value.toFixed(6)).toString();
};

// 格式化倍率：整数显示整数，否则保留有效小数；0/非法 → 空串
const formatRatio = (ratio: number): string => {
  if (!isFinite(ratio) || ratio === 0) return '';
  if (Math.abs(ratio - Math.round(ratio)) < 0.0001) {
    return Math.round(ratio).toString();
  }
  return parseFloat(ratio.toFixed(6)).toString();
};

export default function PricingPage() {
  const { t } = useLocale();
  const p = t.pricing;
  const breadcrumbItems = [
    { title: 'Dashboard', link: '/dashboard' },
    { title: p.breadcrumbSettings, link: '/dashboard/setting' },
    { title: p.title, link: '/dashboard/setting/pricing' }
  ];
  // ==================== 模型倍率设置状态 ====================
  const [perCallPricing, setPerCallPricing] = useState('');
  const [modelRatio, setModelRatio] = useState('');
  const [completionRatio, setCompletionRatio] = useState('');
  const [cacheRatio, setCacheRatio] = useState('');
  const [createCacheRatio, setCreateCacheRatio] = useState('');
  const [audioInputRatio, setAudioInputRatio] = useState('');
  const [audioOutputRatio, setAudioOutputRatio] = useState('');
  const [imageInputRatio, setImageInputRatio] = useState('');
  const [imageOutputRatio, setImageOutputRatio] = useState('');

  // ==================== 可视化倍率设置状态 ====================
  const [configuredModels, setConfiguredModels] = useState<ModelPriceInfo[]>(
    []
  );
  const [configuredTotal, setConfiguredTotal] = useState(0);
  const [configuredPage, setConfiguredPage] = useState(1);
  const [configuredPageSize, setConfiguredPageSize] = useState(20);
  const [configuredKeyword, setConfiguredKeyword] = useState('');

  // ==================== 未设置倍率模型状态 ====================
  const [unsetModels, setUnsetModels] = useState<ModelPriceInfo[]>([]);
  const [unsetTotal, setUnsetTotal] = useState(0);
  const [unsetPage, setUnsetPage] = useState(1);
  const [unsetPageSize, setUnsetPageSize] = useState(10);
  const [unsetKeyword, setUnsetKeyword] = useState('');
  // 未设置模型的编辑数据
  const [unsetEditData, setUnsetEditData] = useState<
    Record<string, UnsetModelEditData>
  >({});

  // ==================== 视频模型定价状态 ====================
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  // 视频定价规则列表（直接编辑规则，不按模型展示）
  const [videoPricingRules, setVideoPricingRules] = useState<
    VideoPricingRule[]
  >([]);
  // 搜索关键字
  const [videoRuleKeyword, setVideoRuleKeyword] = useState('');

  // ==================== 加载状态 ====================
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isConfiguredLoading, setIsConfiguredLoading] = useState(true);
  const [isUnsetLoading, setIsUnsetLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== 编辑状态 ====================
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  // ==================== 默认值 ====================
  const defaultPerCallPricing = `{}`;
  const defaultModelRatio = `{}`;
  const defaultCompletionRatio = `{}`;

  // 格式化JSON字符串
  const formatJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  const validateJSON = (jsonString: string, fieldName: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (e) {
      toast.error(p.jsonInvalid.replace('{field}', fieldName));
      return false;
    }
  };

  // ==================== 获取模型倍率设置数据 ====================
  const fetchPricingOptions = async () => {
    try {
      setIsDataLoading(true);
      const response = await fetch('/api/option');
      if (!response.ok) throw new Error('Failed to fetch pricing options');
      const result = await response.json();
      if (result.success && result.data) {
        const options = result.data;

        const perCallOption = options.find(
          (o: Option) => o.key === 'PerCallPricing'
        );
        setPerCallPricing(
          formatJSON(perCallOption?.value) || defaultPerCallPricing
        );

        const modelRatioOption = options.find(
          (o: Option) => o.key === 'ModelRatio'
        );
        setModelRatio(formatJSON(modelRatioOption?.value) || defaultModelRatio);

        const completionOption = options.find(
          (o: Option) => o.key === 'CompletionRatio'
        );
        setCompletionRatio(
          formatJSON(completionOption?.value) || defaultCompletionRatio
        );

        const audioInputOption = options.find(
          (o: Option) => o.key === 'AudioInputRatio'
        );
        setAudioInputRatio(formatJSON(audioInputOption?.value) || '{}');

        const audioOutputOption = options.find(
          (o: Option) => o.key === 'AudioOutputRatio'
        );
        setAudioOutputRatio(formatJSON(audioOutputOption?.value) || '{}');

        const imageInputOption = options.find(
          (o: Option) => o.key === 'ImageInputRatio'
        );
        setImageInputRatio(formatJSON(imageInputOption?.value) || '{}');

        const imageOutputOption = options.find(
          (o: Option) => o.key === 'ImageOutputRatio'
        );
        setImageOutputRatio(formatJSON(imageOutputOption?.value) || '{}');

        const cacheRatioOption = options.find(
          (o: Option) => o.key === 'CacheRatio'
        );
        setCacheRatio(formatJSON(cacheRatioOption?.value) || '{}');

        const createCacheRatioOption = options.find(
          (o: Option) => o.key === 'CreateCacheRatio'
        );
        setCreateCacheRatio(formatJSON(createCacheRatioOption?.value) || '{}');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load pricing settings'
      );
    } finally {
      setIsDataLoading(false);
    }
  };

  // ==================== 获取已配置倍率的模型 ====================
  const fetchConfiguredModels = useCallback(async () => {
    try {
      setIsConfiguredLoading(true);
      const params = new URLSearchParams({
        page: configuredPage.toString(),
        pagesize: configuredPageSize.toString(),
        keyword: configuredKeyword
      });
      const response = await fetch(`/api/pricing/models?${params}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const result = await response.json();
      if (result.success) {
        setConfiguredModels(result.data.list || []);
        setConfiguredTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('Fetch configured models error:', error);
    } finally {
      setIsConfiguredLoading(false);
    }
  }, [configuredPage, configuredPageSize, configuredKeyword]);

  // ==================== 获取未配置倍率的模型 ====================
  const fetchUnsetModels = useCallback(async () => {
    try {
      setIsUnsetLoading(true);
      const params = new URLSearchParams({
        page: unsetPage.toString(),
        pagesize: unsetPageSize.toString(),
        keyword: unsetKeyword
      });
      const response = await fetch(`/api/pricing/unset?${params}`);
      if (!response.ok) throw new Error('Failed to fetch unset models');
      const result = await response.json();
      if (result.success) {
        setUnsetModels(result.data.list || []);
        setUnsetTotal(result.data.total || 0);
        // 初始化编辑数据
        const editData: Record<string, UnsetModelEditData> = {};
        (result.data.list || []).forEach((m: ModelPriceInfo) => {
          editData[m.model_name] = {
            input_price: '',
            output_price: '',
            cache_price: '',
            create_cache_price: '',
            image_input_price: '',
            image_output_price: '',
            audio_input_price: '',
            audio_output_price: '',
            model_ratio: '',
            completion_ratio: '',
            cache_ratio: '',
            create_cache_ratio: '',
            image_input_ratio: '',
            image_output_ratio: '',
            audio_input_ratio: '',
            audio_output_ratio: ''
          };
        });
        setUnsetEditData(editData);
      }
    } catch (error) {
      console.error('Fetch unset models error:', error);
    } finally {
      setIsUnsetLoading(false);
    }
  }, [unsetPage, unsetPageSize, unsetKeyword]);

  // ==================== 获取视频定价规则 ====================
  const fetchVideoPricingRules = useCallback(async () => {
    try {
      setIsVideoLoading(true);
      // 从所有 options 中获取 VideoPricingRules
      const response = await fetch('/api/option/');
      if (!response.ok) {
        setVideoPricingRules([]);
        return;
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        // 后端返回的是数组格式 [{key: "xxx", value: "xxx"}, ...]
        const videoPricingOption = result.data.find(
          (opt: { key: string; value: string }) =>
            opt.key === 'VideoPricingRules'
        );
        if (videoPricingOption && videoPricingOption.value) {
          try {
            const rules = JSON.parse(videoPricingOption.value);
            if (Array.isArray(rules)) {
              setVideoPricingRules(rules);
            } else {
              setVideoPricingRules([]);
            }
          } catch (e) {
            console.error('Parse video pricing rules error:', e);
            setVideoPricingRules([]);
          }
        } else {
          setVideoPricingRules([]);
        }
      }
    } catch (error) {
      console.error('Fetch video pricing rules error:', error);
      setVideoPricingRules([]);
    } finally {
      setIsVideoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricingOptions();
    fetchVideoPricingRules();
  }, []);

  useEffect(() => {
    fetchConfiguredModels();
  }, [fetchConfiguredModels]);

  useEffect(() => {
    fetchUnsetModels();
  }, [fetchUnsetModels]);

  // ==================== 保存模型倍率设置 ====================
  const handleSaveRatioSettings = async () => {
    setIsLoading(true);
    try {
      // 验证JSON格式
      if (
        !validateJSON(perCallPricing, p.fixedPrice) ||
        !validateJSON(modelRatio, p.modelRatio) ||
        !validateJSON(completionRatio, p.completionRatio) ||
        !validateJSON(cacheRatio, p.cacheRatio) ||
        !validateJSON(createCacheRatio, 'Create cache ratio') ||
        !validateJSON(audioInputRatio, p.audioInputRatio) ||
        !validateJSON(audioOutputRatio, p.audioOutputRatio) ||
        !validateJSON(imageInputRatio, p.imageInputRatio) ||
        !validateJSON(imageOutputRatio, p.imageOutputRatio)
      ) {
        setIsLoading(false);
        return;
      }

      const saveOption = async (key: string, value: string) => {
        const response = await fetch('/api/option', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        if (!response.ok) throw new Error(`Failed to save ${key}`);
      };

      await saveOption('PerCallPricing', perCallPricing);
      await saveOption('ModelRatio', modelRatio);
      await saveOption('CompletionRatio', completionRatio);
      await saveOption('CacheRatio', cacheRatio);
      await saveOption('CreateCacheRatio', createCacheRatio);
      await saveOption('AudioInputRatio', audioInputRatio);
      await saveOption('AudioOutputRatio', audioOutputRatio);
      await saveOption('ImageInputRatio', imageInputRatio);
      await saveOption('ImageOutputRatio', imageOutputRatio);

      toast.success(p.saveSuccess);
      fetchConfiguredModels();
      fetchUnsetModels();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(p.saveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 可视化编辑相关 ====================
  const startEditing = (model: ModelPriceInfo) => {
    const mr = model.model_ratio || 0;
    // 把后端存的倍率反算成价格用于展示编辑
    setEditingRow({
      model_name: model.model_name,
      input_price: formatPriceStr(modelRatioToInputPrice(mr)),
      output_price: formatPriceStr(
        subRatioToPrice(model.completion_ratio || 0, mr)
      ),
      cache_price: formatPriceStr(subRatioToPrice(model.cache_ratio || 0, mr)),
      create_cache_price: formatPriceStr(
        subRatioToPrice(model.create_cache_ratio || 0, mr)
      ),
      image_input_price: formatPriceStr(
        subRatioToPrice(model.image_input_ratio || 0, mr)
      ),
      image_output_price: formatPriceStr(
        subRatioToPrice(model.image_output_ratio || 0, mr)
      ),
      audio_input_price: formatPriceStr(
        subRatioToPrice(model.audio_input_ratio || 0, mr)
      ),
      audio_output_price: formatPriceStr(
        subRatioToPrice(model.audio_output_ratio || 0, mr)
      ),
      fixed_price: model.fixed_price.toString(),
      // 倍率字段保留（用户不改输入价时保存仍可直接用）
      model_ratio: mr.toString(),
      completion_ratio: (model.completion_ratio || 0).toString(),
      cache_ratio: (model.cache_ratio || 0).toString(),
      create_cache_ratio: (model.create_cache_ratio || 0).toString(),
      image_input_ratio: (model.image_input_ratio || 0).toString(),
      image_output_ratio: (model.image_output_ratio || 0).toString(),
      audio_input_ratio: (model.audio_input_ratio || 0).toString(),
      audio_output_ratio: (model.audio_output_ratio || 0).toString()
    });
    setEditDialogOpen(true);
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditDialogOpen(false);
  };

  // 编辑弹窗：价格字段变化时，换算成后端需要的倍率
  // 所有子项价格都相对“文字输入价格”计算（与 updateUnsetEditData 同一套口径）
  const updateEditingPrice = (
    field:
      | 'input_price'
      | 'output_price'
      | 'cache_price'
      | 'create_cache_price'
      | 'image_input_price'
      | 'image_output_price'
      | 'audio_input_price'
      | 'audio_output_price'
      | 'fixed_price',
    value: string
  ) => {
    setEditingRow((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };

      // 按次计费是独立价格，不参与倍率换算
      if (field === 'fixed_price') return next;

      const baseInputPrice = parseFloat(next.input_price) || 0;

      // 输入价变化：重算模型倍率，并按新基准重算所有子倍率
      if (field === 'input_price') {
        const inputPrice = parseFloat(value);
        if (!isNaN(inputPrice) && inputPrice > 0) {
          next.model_ratio = formatRatio(priceToModelRatio(inputPrice));
          const recompute = (
            priceStr: string,
            ratioKey:
              | 'completion_ratio'
              | 'cache_ratio'
              | 'create_cache_ratio'
              | 'image_input_ratio'
              | 'image_output_ratio'
              | 'audio_input_ratio'
              | 'audio_output_ratio'
          ) => {
            const price = parseFloat(priceStr);
            if (!isNaN(price) && price > 0) {
              next[ratioKey] = formatRatio(priceToRatio(price, inputPrice));
            }
          };
          recompute(next.output_price, 'completion_ratio');
          recompute(next.cache_price, 'cache_ratio');
          recompute(next.create_cache_price, 'create_cache_ratio');
          recompute(next.image_input_price, 'image_input_ratio');
          recompute(next.image_output_price, 'image_output_ratio');
          recompute(next.audio_input_price, 'audio_input_ratio');
          recompute(next.audio_output_price, 'audio_output_ratio');
        } else {
          next.model_ratio = '';
        }
        return next;
      }

      // 子项价格变化：相对当前输入价换算对应倍率
      const subMap: Record<string, string> = {
        output_price: 'completion_ratio',
        cache_price: 'cache_ratio',
        create_cache_price: 'create_cache_ratio',
        image_input_price: 'image_input_ratio',
        image_output_price: 'image_output_ratio',
        audio_input_price: 'audio_input_ratio',
        audio_output_price: 'audio_output_ratio'
      };
      const ratioKey = subMap[field] as keyof EditingRow;
      if (baseInputPrice > 0) {
        const price = parseFloat(value);
        next[ratioKey] =
          !isNaN(price) && price > 0
            ? formatRatio(priceToRatio(price, baseInputPrice))
            : '';
      }
      return next;
    });
  };

  const saveEditing = async () => {
    if (!editingRow) return;

    try {
      setIsLoading(true);
      const payload: any = { model_name: editingRow.model_name };

      if (editingRow.model_ratio) {
        payload.model_ratio = parseFloat(editingRow.model_ratio);
      }
      if (editingRow.completion_ratio) {
        payload.completion_ratio = parseFloat(editingRow.completion_ratio);
      }
      if (editingRow.fixed_price && parseFloat(editingRow.fixed_price) > 0) {
        payload.fixed_price = parseFloat(editingRow.fixed_price);
      }
      if (editingRow.cache_ratio) {
        payload.cache_ratio = parseFloat(editingRow.cache_ratio);
      }
      if (editingRow.create_cache_ratio) {
        payload.create_cache_ratio = parseFloat(editingRow.create_cache_ratio);
      }
      if (editingRow.image_input_ratio) {
        payload.image_input_ratio = parseFloat(editingRow.image_input_ratio);
      }
      if (editingRow.image_output_ratio) {
        payload.image_output_ratio = parseFloat(editingRow.image_output_ratio);
      }
      if (editingRow.audio_input_ratio) {
        payload.audio_input_ratio = parseFloat(editingRow.audio_input_ratio);
      }
      if (editingRow.audio_output_ratio) {
        payload.audio_output_ratio = parseFloat(editingRow.audio_output_ratio);
      }

      const response = await fetch('/api/pricing/model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Saved.');
        setEditingRow(null);
        setEditDialogOpen(false);
        fetchConfiguredModels();
        fetchUnsetModels();
        fetchPricingOptions();
      } else {
        toast.error(result.message || 'Save failed.');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Save failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新未设置模型的编辑数据
  const updateUnsetEditData = (
    modelName: string,
    field: keyof UnsetModelEditData,
    value: string
  ) => {
    setUnsetEditData((prev) => {
      const currentData = prev[modelName] || {
        input_price: '',
        output_price: '',
        cache_price: '',
        create_cache_price: '',
        image_input_price: '',
        image_output_price: '',
        audio_input_price: '',
        audio_output_price: '',
        model_ratio: '',
        completion_ratio: '',
        cache_ratio: '',
        create_cache_ratio: '',
        image_input_ratio: '',
        image_output_ratio: '',
        audio_input_ratio: '',
        audio_output_ratio: ''
      };

      const newData = { ...currentData, [field]: value };

      // 获取文字输入价格（基准价格）
      const baseInputPrice = parseFloat(newData.input_price) || 0;

      // 当文字输入价格变化时，重新计算所有倍率
      if (field === 'input_price') {
        const inputPrice = parseFloat(value);
        if (!isNaN(inputPrice) && inputPrice > 0) {
          // 模型倍率 = 文字输入价格 / 2
          newData.model_ratio = formatRatio(priceToModelRatio(inputPrice));

          // 补全倍率 = 文字输出价格 / 文字输入价格
          const outputPrice = parseFloat(newData.output_price);
          if (!isNaN(outputPrice) && outputPrice > 0) {
            newData.completion_ratio = formatRatio(
              priceToRatio(outputPrice, inputPrice)
            );
          }

          // 缓存倍率 = 缓存价格 / 文字输入价格
          const cachePrice = parseFloat(newData.cache_price);
          if (!isNaN(cachePrice) && cachePrice > 0) {
            newData.cache_ratio = formatRatio(
              priceToRatio(cachePrice, inputPrice)
            );
          }

          const createCachePrice = parseFloat(newData.create_cache_price);
          if (!isNaN(createCachePrice) && createCachePrice > 0) {
            newData.create_cache_ratio = formatRatio(
              priceToRatio(createCachePrice, inputPrice)
            );
          }

          // 图片输入倍率 = 图片输入价格 / 文字输入价格
          const imageInputPrice = parseFloat(newData.image_input_price);
          if (!isNaN(imageInputPrice) && imageInputPrice > 0) {
            newData.image_input_ratio = formatRatio(
              priceToRatio(imageInputPrice, inputPrice)
            );
          }

          // 图片输出倍率 = 图片输出价格 / 文字输入价格
          const imageOutputPrice = parseFloat(newData.image_output_price);
          if (!isNaN(imageOutputPrice) && imageOutputPrice > 0) {
            newData.image_output_ratio = formatRatio(
              priceToRatio(imageOutputPrice, inputPrice)
            );
          }

          // 音频输入倍率 = 音频输入价格 / 文字输入价格
          const audioInputPrice = parseFloat(newData.audio_input_price);
          if (!isNaN(audioInputPrice) && audioInputPrice > 0) {
            newData.audio_input_ratio = formatRatio(
              priceToRatio(audioInputPrice, inputPrice)
            );
          }

          // 音频输出倍率 = 音频输出价格 / 文字输入价格
          const audioOutputPrice = parseFloat(newData.audio_output_price);
          if (!isNaN(audioOutputPrice) && audioOutputPrice > 0) {
            newData.audio_output_ratio = formatRatio(
              priceToRatio(audioOutputPrice, inputPrice)
            );
          }
        } else {
          // 如果文字输入价格无效，清空所有自动计算的倍率
          newData.model_ratio = '';
        }
      }

      // 当文字输出价格变化时，计算补全倍率
      if (field === 'output_price' && baseInputPrice > 0) {
        const outputPrice = parseFloat(value);
        if (!isNaN(outputPrice) && outputPrice > 0) {
          newData.completion_ratio = formatRatio(
            priceToRatio(outputPrice, baseInputPrice)
          );
        } else {
          newData.completion_ratio = '';
        }
      }

      // 当缓存价格变化时，计算缓存倍率
      if (field === 'cache_price' && baseInputPrice > 0) {
        const cachePrice = parseFloat(value);
        if (!isNaN(cachePrice) && cachePrice > 0) {
          newData.cache_ratio = formatRatio(
            priceToRatio(cachePrice, baseInputPrice)
          );
        } else {
          newData.cache_ratio = '';
        }
      }

      if (field === 'create_cache_price' && baseInputPrice > 0) {
        const createCachePrice = parseFloat(value);
        newData.create_cache_ratio =
          !isNaN(createCachePrice) && createCachePrice > 0
            ? formatRatio(priceToRatio(createCachePrice, baseInputPrice))
            : '';
      }

      // 当图片输入价格变化时，计算图片输入倍率
      if (field === 'image_input_price' && baseInputPrice > 0) {
        const imageInputPrice = parseFloat(value);
        if (!isNaN(imageInputPrice) && imageInputPrice > 0) {
          newData.image_input_ratio = formatRatio(
            priceToRatio(imageInputPrice, baseInputPrice)
          );
        } else {
          newData.image_input_ratio = '';
        }
      }

      // 当图片输出价格变化时，计算图片输出倍率
      if (field === 'image_output_price' && baseInputPrice > 0) {
        const imageOutputPrice = parseFloat(value);
        if (!isNaN(imageOutputPrice) && imageOutputPrice > 0) {
          newData.image_output_ratio = formatRatio(
            priceToRatio(imageOutputPrice, baseInputPrice)
          );
        } else {
          newData.image_output_ratio = '';
        }
      }

      // 当音频输入价格变化时，计算音频输入倍率
      if (field === 'audio_input_price' && baseInputPrice > 0) {
        const audioInputPrice = parseFloat(value);
        if (!isNaN(audioInputPrice) && audioInputPrice > 0) {
          newData.audio_input_ratio = formatRatio(
            priceToRatio(audioInputPrice, baseInputPrice)
          );
        } else {
          newData.audio_input_ratio = '';
        }
      }

      // 当音频输出价格变化时，计算音频输出倍率
      if (field === 'audio_output_price' && baseInputPrice > 0) {
        const audioOutputPrice = parseFloat(value);
        if (!isNaN(audioOutputPrice) && audioOutputPrice > 0) {
          newData.audio_output_ratio = formatRatio(
            priceToRatio(audioOutputPrice, baseInputPrice)
          );
        } else {
          newData.audio_output_ratio = '';
        }
      }

      return {
        ...prev,
        [modelName]: newData
      };
    });
  };

  // 保存所有已填写数据的未配置模型
  const saveAllUnsetModels = async () => {
    // 找出所有已填写模型倍率的模型
    const modelsToSave = Object.entries(unsetEditData)
      .filter(([_, data]) => data.model_ratio || data.completion_ratio)
      .map(([modelName, editData]) => {
        const modelData: any = {
          model_name: modelName,
          model_ratio: editData.model_ratio
            ? parseFloat(editData.model_ratio)
            : 1,
          completion_ratio: editData.completion_ratio
            ? parseFloat(editData.completion_ratio)
            : 1
        };

        if (editData.cache_ratio) {
          modelData.cache_ratio = parseFloat(editData.cache_ratio);
        }
        if (editData.create_cache_ratio) {
          modelData.create_cache_ratio = parseFloat(
            editData.create_cache_ratio
          );
        }
        if (editData.image_input_ratio) {
          modelData.image_input_ratio = parseFloat(editData.image_input_ratio);
        }
        if (editData.image_output_ratio) {
          modelData.image_output_ratio = parseFloat(
            editData.image_output_ratio
          );
        }
        if (editData.audio_input_ratio) {
          modelData.audio_input_ratio = parseFloat(editData.audio_input_ratio);
        }
        if (editData.audio_output_ratio) {
          modelData.audio_output_ratio = parseFloat(
            editData.audio_output_ratio
          );
        }

        return modelData;
      });

    if (modelsToSave.length === 0) {
      toast.error('Enter at least one model ratio.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/pricing/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: modelsToSave })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Configured ${modelsToSave.length} model(s).`);
        setSelectedModels(new Set());
        fetchConfiguredModels();
        fetchUnsetModels();
        fetchPricingOptions();
      } else {
        toast.error(result.message || 'Save failed.');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Save failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 批量设置选中模型的默认倍率（1.0）
  const batchSetDefaultRatio = async () => {
    if (selectedModels.size === 0) {
      toast.error('Select a model to configure first.');
      return;
    }

    try {
      setIsLoading(true);
      const models = Array.from(selectedModels).map((modelName) => ({
        model_name: modelName,
        model_ratio: 1,
        completion_ratio: 1
      }));

      const response = await fetch('/api/pricing/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Set ${selectedModels.size} model(s) to default ratio.`);
        setSelectedModels(new Set());
        fetchConfiguredModels();
        fetchUnsetModels();
        fetchPricingOptions();
      } else {
        toast.error(result.message || 'Batch save failed.');
      }
    } catch (error) {
      console.error('Batch save error:', error);
      toast.error('Batch save failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 计算已填写数据的模型数量
  const filledModelsCount = Object.values(unsetEditData).filter(
    (data) => data.model_ratio || data.completion_ratio
  ).length;

  // ==================== 视频定价相关函数 ====================
  // 添加新规则
  const addVideoRule = () => {
    const newRule: VideoPricingRule = {
      model: '',
      type: '*',
      mode: '*',
      duration: '*',
      resolution: '*',
      pricing_type: 'fixed',
      price: 0,
      currency: 'USD',
      priority: 10
    };
    setVideoPricingRules([...videoPricingRules, newRule]);
  };

  // 复制规则
  const duplicateVideoRule = (index: number) => {
    const ruleToCopy = videoPricingRules[index];
    const newRule: VideoPricingRule = { ...ruleToCopy };
    // 插入到原规则后面
    const newRules = [...videoPricingRules];
    newRules.splice(index + 1, 0, newRule);
    setVideoPricingRules(newRules);
  };

  // 更新规则
  const updateVideoRule = (
    index: number,
    field: keyof VideoPricingRule,
    value: string | number
  ) => {
    const newRules = [...videoPricingRules];
    if (field === 'price' || field === 'priority') {
      newRules[index] = { ...newRules[index], [field]: Number(value) || 0 };
    } else {
      newRules[index] = { ...newRules[index], [field]: value };
    }
    setVideoPricingRules(newRules);
  };

  // 删除规则
  const deleteVideoRule = (index: number) => {
    const newRules = videoPricingRules.filter((_, i) => i !== index);
    setVideoPricingRules(newRules);
  };

  // 过滤显示的规则（按关键字搜索）
  const filteredVideoRules = videoPricingRules.filter(
    (rule) =>
      !videoRuleKeyword ||
      rule.model.toLowerCase().includes(videoRuleKeyword.toLowerCase())
  );

  // 保存视频定价规则
  const saveVideoPricingRules = async () => {
    try {
      setIsLoading(true);

      // 过滤掉没有填写模型名的规则
      const validRules = videoPricingRules.filter(
        (r) => r.model && r.model.trim() !== ''
      );

      // 保存到后端
      const response = await fetch('/api/option/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'VideoPricingRules',
          value: JSON.stringify(validRules)
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Saved ${validRules.length} video pricing rule(s).`);
        setVideoPricingRules(validRules);
      } else {
        toast.error(result.message || 'Save failed.');
      }
    } catch (error) {
      console.error('Save video pricing error:', error);
      toast.error('Save failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 分页组件 ====================
  const renderPagination = (
    page: number,
    pageSize: number,
    total: number,
    setPage: (p: number) => void,
    setPageSize: (s: number) => void
  ) => {
    const totalPages = Math.ceil(total / pageSize) || 1;
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((page - 1) * pageSize + 1, total)}–
          {Math.min(page * pageSize, total)} of {total}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(parseInt(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '-';
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  if (error)
    return (
      <div className="p-4 text-red-500">
        Failed to load pricing settings: {error}
      </div>
    );
  if (isDataLoading) return <div className="p-4">Loading...</div>;

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
        </div>
        <Separator />

        <Tabs defaultValue="ratio-settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:inline-flex lg:w-auto">
            <TabsTrigger value="ratio-settings">
              {p.tabRatioSettings}
            </TabsTrigger>
            <TabsTrigger value="visual-pricing">
              {p.tabVisualPricing}
            </TabsTrigger>
            <TabsTrigger value="unset-models">{p.tabUnsetModels}</TabsTrigger>
            <TabsTrigger value="video-pricing">{p.tabVideoPricing}</TabsTrigger>
          </TabsList>

          {/* ==================== 模型倍率设置 Tab ==================== */}
          <TabsContent value="ratio-settings" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={handleSaveRatioSettings} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? p.saving : p.save}
              </Button>
            </div>

            {/* 模型固定价格 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{p.fixedPrice}</Label>
              <Textarea
                value={perCallPricing}
                onChange={(e) => setPerCallPricing(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {p.fixedPriceHint}
              </p>
            </div>

            {/* 模型倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{p.modelRatio}</Label>
              <Textarea
                value={modelRatio}
                onChange={(e) => setModelRatio(e.target.value)}
                placeholder="{}"
                className="h-60 font-mono text-sm"
              />
            </div>

            {/* 提示缓存倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Cache read ratio
              </Label>
              <Textarea
                value={cacheRatio}
                onChange={(e) => setCacheRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {p.cacheRatioHint}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Cache creation ratio
              </Label>
              <Textarea
                value={createCacheRatio}
                onChange={(e) => setCreateCacheRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Per-model cache write multiplier, independent of API/provider.
              </p>
            </div>

            {/* 模型补全倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {p.completionRatio}
              </Label>
              <Textarea
                value={completionRatio}
                onChange={(e) => setCompletionRatio(e.target.value)}
                placeholder="{}"
                className="h-60 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {p.completionRatioHint}
              </p>
            </div>

            {/* 图片输入倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {p.imageInputRatio}
              </Label>
              <Textarea
                value={imageInputRatio}
                onChange={(e) => setImageInputRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
            </div>

            {/* 图片输出倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {p.imageOutputRatio}
              </Label>
              <Textarea
                value={imageOutputRatio}
                onChange={(e) => setImageOutputRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
            </div>

            {/* 音频输入倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {p.audioInputRatio}
              </Label>
              <Textarea
                value={audioInputRatio}
                onChange={(e) => setAudioInputRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
            </div>

            {/* 音频输出倍率 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {p.audioOutputRatio}
              </Label>
              <Textarea
                value={audioOutputRatio}
                onChange={(e) => setAudioOutputRatio(e.target.value)}
                placeholder="{}"
                className="h-32 font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* ==================== 可视化倍率设置 Tab ==================== */}
          <TabsContent value="visual-pricing" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search model name..."
                  value={configuredKeyword}
                  onChange={(e) => {
                    setConfiguredKeyword(e.target.value);
                    setConfiguredPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  fetchConfiguredModels();
                  fetchPricingOptions();
                }}
                disabled={isLoading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Model name</TableHead>
                    <TableHead className="w-[90px]">Per-call (¥)</TableHead>
                    <TableHead className="w-[100px]">Input ($/1M)</TableHead>
                    <TableHead className="w-[100px]">Output ($/1M)</TableHead>
                    <TableHead className="w-[90px]">Cache read</TableHead>
                    <TableHead className="w-[90px]">Cache write</TableHead>
                    <TableHead className="w-[70px]">Image in</TableHead>
                    <TableHead className="w-[70px]">Image out</TableHead>
                    <TableHead className="w-[70px]">Audio in</TableHead>
                    <TableHead className="w-[70px]">Audio out</TableHead>
                    <TableHead className="w-[80px]">Billing type</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isConfiguredLoading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : configuredModels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center">
                        No data
                      </TableCell>
                    </TableRow>
                  ) : (
                    configuredModels.map((model) => (
                      <TableRow key={model.model_name}>
                        <TableCell className="font-mono text-xs">
                          {model.model_name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {model.fixed_price > 0
                            ? formatPrice(model.fixed_price)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {model.input_price > 0
                            ? `$${formatPrice(model.input_price)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {model.output_price > 0
                            ? `$${formatPrice(model.output_price)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.cache_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.cache_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.create_cache_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.create_cache_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.image_input_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.image_input_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.image_output_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.image_output_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.audio_input_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.audio_input_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {model.audio_output_ratio > 0 && model.input_price > 0
                            ? `$${formatPrice(
                                model.audio_output_ratio * model.input_price
                              )}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              model.price_type === 'fixed'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}
                          >
                            {model.price_type === 'fixed'
                              ? 'Per-call'
                              : 'Per-token'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditing(model)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {renderPagination(
              configuredPage,
              configuredPageSize,
              configuredTotal,
              setConfiguredPage,
              setConfiguredPageSize
            )}

            {/* 编辑倍率对话框 */}
            <Dialog
              open={editDialogOpen}
              onOpenChange={(open) => {
                if (!open) cancelEditing();
              }}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit model pricing</DialogTitle>
                  <DialogDescription>
                    <span className="font-mono">{editingRow?.model_name}</span>
                  </DialogDescription>
                </DialogHeader>
                {editingRow && (
                  <div className="space-y-5 py-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Input ($/1M)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingRow.input_price}
                          onChange={(e) =>
                            updateEditingPrice('input_price', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Output ($/1M)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingRow.output_price}
                          onChange={(e) =>
                            updateEditingPrice('output_price', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Per-call (¥)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingRow.fixed_price}
                          onChange={(e) =>
                            updateEditingPrice('fixed_price', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Extended price ($/1M)
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Cache read price</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.cache_price}
                            onChange={(e) =>
                              updateEditingPrice('cache_price', e.target.value)
                            }
                            placeholder="Default = output"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">
                            Cache creation price
                          </Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.create_cache_price}
                            onChange={(e) =>
                              updateEditingPrice(
                                'create_cache_price',
                                e.target.value
                              )
                            }
                            placeholder="Default = input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Image input price</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.image_input_price}
                            onChange={(e) =>
                              updateEditingPrice(
                                'image_input_price',
                                e.target.value
                              )
                            }
                            placeholder="Default = input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Image output price</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.image_output_price}
                            onChange={(e) =>
                              updateEditingPrice(
                                'image_output_price',
                                e.target.value
                              )
                            }
                            placeholder="Default = output"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Audio input price</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.audio_input_price}
                            onChange={(e) =>
                              updateEditingPrice(
                                'audio_input_price',
                                e.target.value
                              )
                            }
                            placeholder="Default = input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Audio output price</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingRow.audio_output_price}
                            onChange={(e) =>
                              updateEditingPrice(
                                'audio_output_price',
                                e.target.value
                              )
                            }
                            placeholder="Default = output"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 过渡期：展示换算出的倍率，方便核对 */}
                    <div className="rounded bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
                      Ratio: model {editingRow.model_ratio || '-'} · completion{' '}
                      {editingRow.completion_ratio || '-'} · cache{' '}
                      {editingRow.cache_ratio || '-'} · image in{' '}
                      {editingRow.image_input_ratio || '-'} · image out{' '}
                      {editingRow.image_output_ratio || '-'} · audio in{' '}
                      {editingRow.audio_input_ratio || '-'} · audio out{' '}
                      {editingRow.audio_output_ratio || '-'}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button onClick={saveEditing} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ==================== 未设置倍率模型 Tab ==================== */}
          <TabsContent value="unset-models" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">
                    Configure official model pricing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Enter prices in USD per 1M tokens. Billing ratios are
                    calculated instantly and can still be adjusted manually.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="font-medium">1. Base price</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Model ratio = text input price / 2
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="font-medium">2. Output & cache</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Each ratio = its price / text input price
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="font-medium">3. Optional modalities</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave image or audio fields blank when unsupported
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-medium">
                  Tiered pricing is not available yet.
                </span>{' '}
                The current backend only accepts one static price set per model.
                Tier conditions and billing expressions must be supported before
                segmented pricing can be enabled safely.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search model name..."
                  value={unsetKeyword}
                  onChange={(e) => {
                    setUnsetKeyword(e.target.value);
                    setUnsetPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={batchSetDefaultRatio}
                  disabled={isLoading || selectedModels.size === 0}
                >
                  Set to 1.0 ({selectedModels.size})
                </Button>
                <Button
                  onClick={saveAllUnsetModels}
                  disabled={isLoading || filledModelsCount === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save filled ({filledModelsCount})
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Scroll horizontally to configure optional modalities and review
                calculated ratios.
              </div>
              <div className="overflow-x-auto rounded-xl border bg-card shadow-sm [&_input]:h-9 [&_input]:min-w-[92px] [&_td]:py-2">
                <Table className="w-full min-w-[2250px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 px-3">
                        <Checkbox
                          checked={
                            unsetModels.length > 0 &&
                            unsetModels.every((m) =>
                              selectedModels.has(m.model_name)
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedModels(
                                new Set(unsetModels.map((m) => m.model_name))
                              );
                            } else {
                              setSelectedModels(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="sticky left-0 z-20 w-[240px] border-r bg-background px-4">
                        Model name
                      </TableHead>
                      <TableHead
                        colSpan={8}
                        className="border-l bg-blue-50/60 px-3 py-3 text-center text-sm font-semibold text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                      >
                        Price input ($/1M tokens)
                      </TableHead>
                      <TableHead
                        colSpan={8}
                        className="border-l bg-green-50/60 px-3 py-3 text-center text-sm font-semibold text-green-900 dark:bg-green-950/30 dark:text-green-200"
                      >
                        Ratio (auto-calculated)
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="w-12 px-3"></TableHead>
                      <TableHead className="sticky left-0 z-20 w-[240px] border-r bg-background px-4"></TableHead>
                      <TableHead className="w-[105px] border-l bg-blue-50/50 px-2 text-center text-xs dark:bg-blue-950/30">
                        Text in
                      </TableHead>
                      <TableHead className="w-[105px] bg-blue-50/50 px-2 text-center text-xs dark:bg-blue-950/30">
                        Text out
                      </TableHead>
                      <TableHead className="w-[70px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Cache read
                      </TableHead>
                      <TableHead className="w-[80px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Cache write
                      </TableHead>
                      <TableHead className="w-[70px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Image in
                      </TableHead>
                      <TableHead className="w-[70px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Image out
                      </TableHead>
                      <TableHead className="w-[70px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Audio in
                      </TableHead>
                      <TableHead className="w-[70px] bg-blue-50/50 px-1 text-center text-xs dark:bg-blue-950/30">
                        Audio out
                      </TableHead>
                      <TableHead className="w-[100px] border-l bg-green-50/50 px-2 text-center text-xs dark:bg-green-950/30">
                        Model
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Completion
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Cache read
                      </TableHead>
                      <TableHead className="w-[75px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Cache write
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Image in
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Image out
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Audio in
                      </TableHead>
                      <TableHead className="w-[65px] bg-green-50/50 px-1 text-center text-xs dark:bg-green-950/30">
                        Audio out
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isUnsetLoading ? (
                      <TableRow>
                        <TableCell colSpan={18} className="h-24 text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : unsetModels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={18} className="h-24 text-center">
                          🎉 All models are configured!
                        </TableCell>
                      </TableRow>
                    ) : (
                      unsetModels.map((model) => (
                        <TableRow key={model.model_name}>
                          <TableCell className="px-3 py-2">
                            <Checkbox
                              checked={selectedModels.has(model.model_name)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedModels);
                                if (checked) {
                                  newSet.add(model.model_name);
                                } else {
                                  newSet.delete(model.model_name);
                                }
                                setSelectedModels(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell
                            className="sticky left-0 z-10 truncate border-r bg-background px-4 py-2 font-mono text-sm font-medium"
                            title={model.model_name}
                          >
                            {model.model_name}
                          </TableCell>
                          {/* 价格输入区域 */}
                          <TableCell className="border-l bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="0.1"
                              value={
                                unsetEditData[model.model_name]?.input_price ||
                                ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'input_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="0.4"
                              value={
                                unsetEditData[model.model_name]?.output_price ||
                                ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'output_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]?.cache_price ||
                                ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'cache_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]
                                  ?.create_cache_price || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'create_cache_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]
                                  ?.image_input_price || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'image_input_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]
                                  ?.image_output_price || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'image_output_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]
                                  ?.audio_input_price || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'audio_input_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/30 px-0.5 dark:bg-blue-950/20">
                            <Input
                              type="text"
                              placeholder="-"
                              value={
                                unsetEditData[model.model_name]
                                  ?.audio_output_price || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'audio_output_price',
                                  e.target.value
                                )
                              }
                              className="h-7 px-1 text-center text-xs"
                            />
                          </TableCell>
                          {/* 倍率显示区域（自动计算，也可手动修改） */}
                          <TableCell className="border-l bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]?.model_ratio ||
                                ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'model_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.completion_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'completion_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]?.cache_ratio ||
                                ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'cache_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.create_cache_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'create_cache_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.image_input_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'image_input_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.image_output_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'image_output_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.audio_input_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'audio_input_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="bg-green-50/30 px-0.5 dark:bg-green-950/20">
                            <Input
                              type="text"
                              placeholder="auto"
                              value={
                                unsetEditData[model.model_name]
                                  ?.audio_output_ratio || ''
                              }
                              onChange={(e) =>
                                updateUnsetEditData(
                                  model.model_name,
                                  'audio_output_ratio',
                                  e.target.value
                                )
                              }
                              className="h-7 bg-muted/30 px-1 text-center text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {renderPagination(
                unsetPage,
                unsetPageSize,
                unsetTotal,
                setUnsetPage,
                setUnsetPageSize
              )}
            </div>
          </TabsContent>

          {/* ==================== 视频模型定价 Tab ==================== */}
          <TabsContent value="video-pricing" className="space-y-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>💡 Tip:</strong> Configure pricing rules for video
                generation models. A single model can have multiple rules
                (different type/mode/duration/resolution combinations).
              </p>
              <ul className="mt-2 list-inside list-disc text-xs text-purple-700 dark:text-purple-300">
                <li>
                  <strong>Wildcard *</strong>: matches any value (including
                  empty)
                </li>
                <li>
                  <strong>Prefix wildcard wan*</strong>: matches all models
                  starting with wan
                </li>
                <li>
                  <strong>per_second</strong>: billed per second — final price =
                  price × video duration
                </li>
                <li>
                  <strong>fixed</strong>: fixed price regardless of duration
                </li>
                <li>
                  <strong>priority</strong>: higher priority matches first; set
                  specific rules higher (e.g. 20), fallback rules lower (e.g. 5)
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search model name..."
                    value={videoRuleKeyword}
                    onChange={(e) => setVideoRuleKeyword(e.target.value)}
                    className="w-64 pl-10"
                  />
                </div>
                <Button variant="outline" onClick={addVideoRule}>
                  + Add rule
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {videoPricingRules.length} rule(s)
                </span>
                <Button onClick={saveVideoPricingRules} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save rule'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table className="w-full min-w-[1300px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Model</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Mode</TableHead>
                    <TableHead className="w-[90px]">Duration</TableHead>
                    <TableHead className="w-[100px]">Resolution</TableHead>
                    <TableHead className="w-[110px]">Billing type</TableHead>
                    <TableHead className="w-[90px]">Price</TableHead>
                    <TableHead className="w-[80px]">Currency</TableHead>
                    <TableHead className="w-[70px]">Priority</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isVideoLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredVideoRules.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No pricing rules. Click &quot;Add rule&quot; to create
                        one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVideoRules.map((rule, index) => {
                      // 找到原始索引（用于更新和删除）
                      const originalIndex = videoPricingRules.indexOf(rule);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={rule.model}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'model',
                                  e.target.value
                                )
                              }
                              placeholder="wan* or kling-v1"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={rule.type}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'type',
                                  e.target.value
                                )
                              }
                              placeholder="*"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={rule.mode}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'mode',
                                  e.target.value
                                )
                              }
                              placeholder="*"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={rule.duration}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'duration',
                                  e.target.value
                                )
                              }
                              placeholder="*"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={rule.resolution}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'resolution',
                                  e.target.value
                                )
                              }
                              placeholder="*"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={rule.pricing_type}
                              onValueChange={(value) =>
                                updateVideoRule(
                                  originalIndex,
                                  'pricing_type',
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">fixed</SelectItem>
                                <SelectItem value="per_second">
                                  per_second
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={rule.price}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'price',
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={rule.currency}
                              onValueChange={(value) =>
                                updateVideoRule(
                                  originalIndex,
                                  'currency',
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="CNY">CNY</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={rule.priority}
                              onChange={(e) =>
                                updateVideoRule(
                                  originalIndex,
                                  'priority',
                                  e.target.value
                                )
                              }
                              placeholder="10"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                onClick={() =>
                                  duplicateVideoRule(originalIndex)
                                }
                                title="Duplicate rule"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteVideoRule(originalIndex)}
                                title="Delete rule"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Configuration examples:</strong>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li>
                  Alibaba Cloud per-second: model=wan*, resolution=720P,
                  pricing_type=per_second, price=0.6, currency=CNY
                </li>
                <li>
                  Kling fixed price: model=kling-v1, mode=standard, duration=5,
                  pricing_type=fixed, price=3.5, currency=CNY, priority=20
                </li>
                <li>
                  Fallback rule: model=kling-v1, mode=*, duration=*,
                  pricing_type=fixed, price=5.0, currency=CNY, priority=5
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
