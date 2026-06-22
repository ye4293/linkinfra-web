'use client';
import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GroupConfigItem } from '@/lib/types/model-plaza';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'System settings', link: '/dashboard/setting' },
  { title: 'Discount settings', link: '/dashboard/setting/discount' }
];

interface GroupFormData {
  group_key: string;
  display_name: string;
  discount: number;
  sort_order: number;
  description: string;
}

const defaultFormData: GroupFormData = {
  group_key: '',
  display_name: '',
  discount: 100,
  sort_order: 0,
  description: ''
};

export default function DiscountPage() {
  // ==================== 用户分组折扣状态 ====================
  const [groups, setGroups] = useState<GroupConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ==================== Dialog 状态 ====================
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupConfigItem | null>(
    null
  );
  const [formData, setFormData] = useState<GroupFormData>(defaultFormData);

  // ==================== 删除确认状态 ====================
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<GroupConfigItem | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // ==================== 数据获取 ====================
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/group-config');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        const sortedGroups = [...(result.data as GroupConfigItem[])].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        setGroups(sortedGroups);
      }
    } catch (err) {
      toast.error('Failed to load groups.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // ==================== 新增/编辑操作 ====================
  const openCreateDialog = () => {
    setEditingGroup(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (group: GroupConfigItem) => {
    setEditingGroup(group);
    setFormData({
      group_key: group.group_key,
      display_name: group.display_name,
      discount: Math.round(group.discount * 100),
      sort_order: group.sort_order,
      description: group.description
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.group_key.trim()) {
      toast.error('Group key is required.');
      return;
    }
    if (!formData.display_name.trim()) {
      toast.error('Display name is required.');
      return;
    }
    if (formData.discount < 0 || formData.discount > 100) {
      toast.error('Discount must be between 0 and 100.');
      return;
    }

    try {
      setIsSaving(true);
      const isEdit = editingGroup !== null;
      // 表单里 discount 是百分比（0-100），后端/计费语义是乘数（0-1），API 边界处转一次
      const payload = {
        ...formData,
        discount: formData.discount / 100
      };
      const body = isEdit ? { ...payload, id: editingGroup.id } : payload;

      const response = await fetch('/api/group-config', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        toast.success(isEdit ? 'Group updated.' : 'Group created.');
        setDialogOpen(false);
        fetchGroups();
      } else {
        toast.error(result.message || 'Operation failed.');
      }
    } catch (err) {
      toast.error('Operation failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== 删除操作 ====================
  const openDeleteDialog = (group: GroupConfigItem) => {
    setDeletingGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/group-config/${deletingGroup.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        toast.success('Group deleted.');
        setDeleteDialogOpen(false);
        setDeletingGroup(null);
        fetchGroups();
      } else {
        toast.error(result.message || 'Delete failed.');
      }
    } catch (err) {
      toast.error('Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== 渲染 ====================
  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Discount settings
          </h2>
        </div>
        <Separator />

        <Tabs defaultValue="group-discount" className="space-y-4">
          <TabsList>
            <TabsTrigger value="group-discount">Group discounts</TabsTrigger>
          </TabsList>

          {/* ==================== 用户分组折扣 Tab ==================== */}
          <TabsContent value="group-discount" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Manage user groups and their corresponding discount rates. The
                  rate is a percentage: 100 means no discount, 50 means 50% off.
                </p>
              </div>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add group
              </Button>
            </div>

            {/* 分组列表表格 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Group key</TableHead>
                    <TableHead className="w-[120px]">Display name</TableHead>
                    <TableHead className="w-[100px]">Discount rate</TableHead>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : groups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No groups configured. Click "Add group" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-mono text-sm">
                          {group.group_key}
                        </TableCell>
                        <TableCell>{group.display_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              group.discount < 1 ? 'default' : 'secondary'
                            }
                          >
                            {Math.round(group.discount * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{group.sort_order}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {group.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(group)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteDialog(group)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== 新增/编辑 Dialog ==================== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit group' : 'Add group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Modify the discount configuration for this group.'
                : 'Create a new user group discount configuration.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group_key">
                Group key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group_key"
                placeholder="e.g. vip, premium, default"
                value={formData.group_key}
                onChange={(e) =>
                  setFormData({ ...formData, group_key: e.target.value })
                }
                disabled={editingGroup !== null}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier — cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">
                Display name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_name"
                placeholder="e.g. VIP, Premium member"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">
                Discount rate (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="100"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: Number(e.target.value)
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                100 = full price (no discount), 50 = 50% off, 0 = free.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort order</Label>
              <Input
                id="sort_order"
                type="number"
                placeholder="0"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sort_order: Number(e.target.value)
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower values appear first.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Notes about this group"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 删除确认 Dialog ==================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Delete the group "{deletingGroup?.display_name}"? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
