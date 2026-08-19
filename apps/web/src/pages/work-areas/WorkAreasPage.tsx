import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { workAreasApi } from '../../api/work-areas.api';
import type { WorkArea, CreateWorkAreaPayload, UpdateWorkAreaPayload, RoomBoqItem } from '../../api/work-areas.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem } from '../../api/work-items.api';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/I18nContext';
import {
  Network,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderTree,
  CornerDownLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Hash,
  FileSpreadsheet,
} from 'lucide-react';

interface TreeNode extends WorkArea {
  children?: TreeNode[];
}

export const WorkAreasPage: React.FC = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [areas, setAreas] = useState<WorkArea[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Collapsed state map for tree nodes
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<WorkArea | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formAreaM2, setFormAreaM2] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletingArea, setDeletingArea] = useState<WorkArea | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Room BOQ Modal State
  const [selectedRoomForBoq, setSelectedRoomForBoq] = useState<WorkArea | null>(null);
  const [roomBoqItems, setRoomBoqItems] = useState<RoomBoqItem[]>([]);
  const [loadingBoq, setLoadingBoq] = useState(false);
  const [boqWorkItemId, setBoqWorkItemId] = useState('');
  const [boqStageId, setBoqStageId] = useState('');
  const [boqQuantity, setBoqQuantity] = useState<number | ''>('');
  const [boqRate, setBoqRate] = useState<number | ''>('');
  const [savingBoq, setSavingBoq] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list({ limit: 100 });
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProject) {
        setSelectedProject(res.data[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadWorkItems = async () => {
    try {
      const res = await workItemsApi.list({ limit: 100 });
      setWorkItems(res.data);
    } catch {
      // ignore
    }
  };

  const loadAreas = useCallback(async () => {
    if (!selectedProject) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await workAreasApi.list({
        projectId: selectedProject,
        limit: 100,
      });
      setAreas(res.data);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_مناطق_العمل_432ced'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadProjects();
    loadWorkItems();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadAreas();
    }
  }, [selectedProject, loadAreas]);

  // Build tree from flat areas
  const areaTree = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    areas.forEach((area) => {
      map.set(area.id, { ...area, children: [] });
    });

    areas.forEach((area) => {
      const node = map.get(area.id)!;
      if (area.parentId && map.has(area.parentId)) {
        map.get(area.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [areas]);

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const openCreateRoot = () => {
    setEditingArea(null);
    setModalParentId(null);
    setFormName('');
    setFormCode('');
    setFormSortOrder(areas.length);
    setFormAreaM2('');
    setIsModalOpen(true);
  };

  const openCreateChild = (parentArea: WorkArea) => {
    setEditingArea(null);
    setModalParentId(parentArea.id);
    setFormName('');
    setFormCode('');
    setFormSortOrder(0);
    setFormAreaM2('');
    setIsModalOpen(true);
  };

  const openEdit = (area: WorkArea) => {
    setEditingArea(area);
    setModalParentId(area.parentId || null);
    setFormName(area.name);
    setFormCode(area.code || '');
    setFormSortOrder(area.sortOrder || 0);
    setFormAreaM2(area.area_m2 || area.areaM2 || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !selectedProject) return;

    setIsSaving(true);
    setError(null);
    try {
      if (editingArea) {
        const payload: UpdateWorkAreaPayload = {
          name: formName.trim(),
          code: formCode.trim() || undefined,
          parentId: modalParentId,
          sortOrder: Number(formSortOrder) || 0,
          areaM2: formAreaM2 !== '' ? Number(formAreaM2) : undefined,
        };
        await workAreasApi.update(editingArea.id, payload);
        setSuccessMsg(t('auto.تم_تحديث_منطقة_العمل_بنجاح_496db5'));
      } else {
        const payload: CreateWorkAreaPayload = {
          projectId: selectedProject,
          parentId: modalParentId,
          name: formName.trim(),
          code: formCode.trim() || undefined,
          sortOrder: Number(formSortOrder) || 0,
          areaM2: formAreaM2 !== '' ? Number(formAreaM2) : undefined,
        };
        await workAreasApi.create(payload);
        setSuccessMsg(t('auto.تم_إنشاء_منطقة_العمل_بنجاح_3fe2c1'));
      }
      setIsModalOpen(false);
      loadAreas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_منطقة_العمل_2f5c07'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingArea) return;
    setIsDeleting(true);
    try {
      await workAreasApi.delete(deletingArea.id);
      setSuccessMsg(t('auto.تم_حذف_المنطقة_بنجاح', { defaultValue: 'Deleted successfully' }));
      setDeletingArea(null);
      loadAreas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_المنطقة_37f2a3'));
    } finally {
      setIsDeleting(false);
    }
  };

  const openRoomBoq = async (area: WorkArea) => {
    setSelectedRoomForBoq(area);
    setLoadingBoq(true);
    setBoqWorkItemId('');
    setBoqStageId('');
    setBoqQuantity('');
    setBoqRate('');
    try {
      const res = await workAreasApi.getRoomBoq(area.id);
      setRoomBoqItems(res.data || []);
    } catch {
      setRoomBoqItems([]);
    } finally {
      setLoadingBoq(false);
    }
  };

  const handleSaveRoomBoq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBoq || !boqWorkItemId || boqQuantity === '') return;

    setSavingBoq(true);
    try {
      await workAreasApi.saveRoomBoq(selectedRoomForBoq.id, {
        projectId: selectedProject,
        workItemId: boqWorkItemId,
        workItemStageId: boqStageId || undefined,
        totalQuantity: Number(boqQuantity),
        unitRate: boqRate !== '' ? Number(boqRate) : 0,
      });
      const res = await workAreasApi.getRoomBoq(selectedRoomForBoq.id);
      setRoomBoqItems(res.data || []);
      setBoqWorkItemId('');
      setBoqStageId('');
      setBoqQuantity('');
      setBoqRate('');
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setSavingBoq(false);
    }
  };

  const handleDeleteRoomBoq = async (itemId: string) => {
    if (!selectedRoomForBoq) return;
    try {
      await workAreasApi.deleteRoomBoq(selectedRoomForBoq.id, itemId);
      setRoomBoqItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  // Selected work item stages
  const activeWorkItemStages = useMemo(() => {
    const item = workItems.find((w) => w.id === boqWorkItemId);
    return item?.stages || [];
  }, [boqWorkItemId, workItems]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = !!collapsedNodes[node.id];
    const areaM2Val = node.area_m2 || node.areaM2;

    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            marginRight: `${depth * 28}px`,
            background: depth === 0 ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
            borderRight: depth === 0 ? '3px solid #f59e0b' : '2px dashed rgba(245, 158, 11, 0.4)',
            borderBottom: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.35rem',
            transition: 'background var(--transition-fast)',
          }}
        >
          {/* Left Side: Name + Code + Level + Area M2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
            ) : (
              <div style={{ width: '16px' }} />
            )}

            <Layers size={17} color={depth === 0 ? '#f59e0b' : '#fbbf24'} />

            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                {node.name}
              </span>
              {node.code && (
                <span
                  className="badge badge-secondary"
                  style={{ marginRight: '0.5rem', fontSize: '0.7rem', fontFamily: 'monospace' }}
                >
                  <Hash size={10} />
                  <span>{node.code}</span>
                </span>
              )}
              {areaM2Val ? (
                <span
                  className="badge"
                  style={{
                    marginRight: '0.5rem',
                    fontSize: '0.7rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                  }}
                >
                  {areaM2Val} m²
                </span>
              ) : null}
            </div>

            <span
              className="badge"
              style={{
                fontSize: '0.65rem',
                background: depth === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
              }}
            >
              {t('auto.مستوى_5b42b1')}{node.level ?? depth + 1}
            </span>
          </div>

          {/* Right Side: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => openRoomBoq(node)}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              title={t('boq.room_boq_title')}
            >
              <FileSpreadsheet size={13} />
              <span>BOQ</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateChild(node)}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
              title={t('auto.إضافة_منطقة_فرعية_تابعة_10271f')}
            >
              <CornerDownLeft size={13} />
              <span>{t('auto.فرعية_5b09a3')}</span>
            </button>

            <button
              type="button"
              onClick={() => openEdit(node)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
              title={t('auto.تعديل_المنطقة_6a10a4')}
            >
              <Edit2 size={14} />
            </button>

            <button
              type="button"
              onClick={() => setDeletingArea(node)}
              className="btn btn-secondary"
              style={{
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.25)',
              }}
              title={t('auto.حذف_المنطقة_3430f7')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Render Children if expanded */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Network size={28} color="#f59e0b" />
            <span>{t('operations.work_areas_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.work_areas')}
          </p>
        </div>

        <button
          onClick={openCreateRoot}
          className="btn btn-primary"
          style={{ gap: '0.5rem', background: '#f59e0b', color: '#000' }}
        >
          <Plus size={16} />
          <span>{t('operations.add_zone')}</span>
        </button>
      </div>

      {/* Project Selector Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
          {t('common.all_projects')}
        </label>
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '250px' }}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.code ? `(${p.code})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tree Container */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <p>{t('common.loading')}</p>
          </div>
        ) : areaTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FolderTree size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>{t('auto.لا_توجد_مناطق_عمل_مسجلة_لهذا_ا_ee7848')}</p>
            <button
              onClick={openCreateRoot}
              className="btn btn-primary"
              style={{ marginTop: '1rem', gap: '0.5rem', background: '#f59e0b', color: '#000' }}
            >
              <Plus size={16} />
              <span>{t('auto.إضافة_أول_منطقة_رئيسية_مثل_مبن_291783')}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {areaTree.map((rootNode) => renderTreeNode(rootNode, 0))}
          </div>
        )}
      </div>

      {/* Create / Edit Area Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingArea
            ? t('auto.تعديل_منطقة_العمل_550089')
            : modalParentId
            ? t('auto.إضافة_منطقة_فرعية_تابعة_10271f')
            : t('auto.إضافة_منطقة_رئيسية_75ff10')
        }
        icon={<Network size={22} color="#f59e0b" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="work-area-form"
              className="btn btn-primary"
              style={{ background: '#f59e0b', color: '#000' }}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingArea ? t('common.save') : t('common.create')}</span>
            </button>
          </div>
        }
      >
        <form id="work-area-form" onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.المنطقة_الأب_Parent_Area_25741f')}</label>
              <select
                className="input-field"
                value={modalParentId || ''}
                onChange={(e) => setModalParentId(e.target.value || null)}
              >
                <option value="">{t('auto.منطقة_رئيسية_الجذر_Root_3d585a')}</option>
                {areas
                  .filter((a) => !editingArea || a.id !== editingArea.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {'— '.repeat(a.level || 0)} {a.name} ({a.code || t('auto.بدون_كود_519c6b')})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.اسم_منطقة_العمل_448fb6')} *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Zone / Floor / Room"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.كود_المنطقة_118931')}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="R-101"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('operations.room_area_m2')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="24.5"
                  value={formAreaM2}
                  onChange={(e) => setFormAreaM2(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.ترتيب_العرض_Sort_Order_f3727a')}</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Room BOQ Modal */}
      {selectedRoomForBoq && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center p-4 overflow-y-auto"
          style={{ alignItems: 'flex-start' }}
        >
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>📑</span> {t('boq.room_boq_title')}: {selectedRoomForBoq.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRoomForBoq.area_m2 ? `${selectedRoomForBoq.area_m2} m²` : 'BOQ'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRoomForBoq(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Existing BOQ Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground">{t('boq.registered_items')}</h3>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-start text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('work_items.name')}</th>
                      <th className="px-3 py-2 text-start">{t('work_items.stage')}</th>
                      <th className="px-3 py-2 text-center">{t('common.quantity')}</th>
                      <th className="px-3 py-2 text-center">{t('common.price')}</th>
                      <th className="px-3 py-2 text-center">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-background/50">
                    {loadingBoq ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted-foreground">
                          {t('common.loading')}
                        </td>
                      </tr>
                    ) : roomBoqItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted-foreground">
                          {t('common.no_data')}
                        </td>
                      </tr>
                    ) : (
                      roomBoqItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium text-foreground">{item.work_item_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.stage_name || 'All Stages'}</td>
                          <td className="px-3 py-2 text-center font-bold text-foreground">{item.total_quantity} {item.unit_symbol || 'm²'}</td>
                          <td className="px-3 py-2 text-center text-foreground">{item.unit_rate} SAR</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRoomBoq(item.id)}
                              className="text-red-500 hover:text-red-400 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Item to Room BOQ Form */}
            <form onSubmit={handleSaveRoomBoq} className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-foreground">{t('boq.add_item_to_room')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    {t('work_items.item')} *
                  </label>
                  <select
                    required
                    value={boqWorkItemId}
                    onChange={(e) => {
                      setBoqWorkItemId(e.target.value);
                      setBoqStageId('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="">{t('common.select')}</option>
                    {workItems.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code || ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    {t('work_items.stage')}
                  </label>
                  <select
                    value={boqStageId}
                    onChange={(e) => setBoqStageId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="">{t('boq.all_stages')}</option>
                    {activeWorkItemStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    {t('common.quantity')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="45.00"
                    value={boqQuantity}
                    onChange={(e) => setBoqQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    {t('common.price')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="40.00"
                    value={boqRate}
                    onChange={(e) => setBoqRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingBoq}
                  className="px-4 py-1.5 bg-amber-500 text-black font-semibold rounded-lg text-xs hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {savingBoq ? t('common.saving') : t('common.add')}
                </button>
              </div>
            </form>

            <div className="flex justify-end border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setSelectedRoomForBoq(null)}
                className="px-4 py-2 bg-muted text-foreground rounded-xl text-xs font-semibold hover:bg-muted/80"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingArea}
        onClose={() => setDeletingArea(null)}
        title={t('auto.تأكيد_حذف_منطقة_العمل_3273a1')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingArea(null)}
              className="btn btn-secondary"
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('common.delete')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_478ebe')}{' '}
          <strong style={{ color: 'var(--text-heading)' }}>"{deletingArea?.name || ''}"</strong>?
        </p>
      </Modal>
    </div>
  );
};
