import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { workAreasApi } from '../../api/work-areas.api';
import type { WorkArea, CreateWorkAreaPayload, UpdateWorkAreaPayload } from '../../api/work-areas.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
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
} from 'lucide-react';

interface TreeNode extends WorkArea {
  children?: TreeNode[];
}

export const WorkAreasPage: React.FC = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [areas, setAreas] = useState<WorkArea[]>([]);

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
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletingArea, setDeletingArea] = useState<WorkArea | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsModalOpen(true);
  };

  const openCreateChild = (parentArea: WorkArea) => {
    setEditingArea(null);
    setModalParentId(parentArea.id);
    setFormName('');
    setFormCode('');
    setFormSortOrder(0);
    setIsModalOpen(true);
  };

  const openEdit = (area: WorkArea) => {
    setEditingArea(area);
    setModalParentId(area.parentId || null);
    setFormName(area.name);
    setFormCode(area.code || '');
    setFormSortOrder(area.sortOrder || 0);
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
      await workAreasApi.remove(deletingArea.id);
      setSuccessMsg(`تم حذف المنطقة "${deletingArea.name}" بنجاح`);
      setDeletingArea(null);
      loadAreas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_المنطقة_37f2a3'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = !!collapsedNodes[node.id];

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
            borderRight: depth === 0 ? '3px solid #3b82f6' : '2px dashed rgba(59, 130, 246, 0.4)',
            borderBottom: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.35rem',
            transition: 'background var(--transition-fast)',
          }}
        >
          {/* Left Side: Name + Code + Level */}
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

            <Layers size={17} color={depth === 0 ? '#60a5fa' : '#38bdf8'} />

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
            </div>

            <span
              className="badge"
              style={{
                fontSize: '0.65rem',
                background: depth === 0 ? 'rgba(37, 99, 235, 0.2)' : 'rgba(14, 165, 233, 0.15)',
                color: depth === 0 ? '#60a5fa' : '#38bdf8',
              }}
            >
              {t('auto.مستوى_5b42b1')}{node.level ?? depth + 1}
            </span>
          </div>

          {/* Right Side: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
            <Network size={28} color="#60a5fa" />
            <span>{t('operations.work_areas_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.work_areas')}
          </p>
        </div>

        <button
          onClick={openCreateRoot}
          className="btn btn-primary"
          style={{ gap: '0.5rem' }}
          disabled={!selectedProject}
        >
          <Plus size={18} />
          <span>{t('operations.add_zone')}</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Project Selector Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <FolderTree size={20} color="#60a5fa" />
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ marginBottom: '0.25rem' }}>
              {t('auto.المشروع_الميداني_المستهدف_458674')}</label>
            <select
              className="input-field"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code || t('auto.بدون_كود_519c6b')}) - {p.branchName || t('auto.فرع_184029')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {t('auto.إجمالي_المناطق_المسجلة_بالمشرو_58b775')}<strong style={{ color: 'var(--text-heading)' }}>{areas.length}</strong>
        </div>
      </div>

      {/* Tree Container */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={18} color="#60a5fa" />
            <span>{t('auto.الشجرة_الهرمية_لمواقع_العمل_235d47')}</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {t('auto.يمكنك_طي_وفرز_المستويات_بالضغط_783b78')}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.جاري_بناء_الشجرة_الهرمية_6559dd')}</p>
          </div>
        ) : areaTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FolderTree size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>{t('auto.لا_توجد_مناطق_عمل_مسجلة_لهذا_ا_ee7848')}</p>
            <button
              onClick={openCreateRoot}
              className="btn btn-primary"
              style={{ marginTop: '1rem', gap: '0.5rem' }}
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

      {/* Create / Edit Modal */}
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
        icon={<Network size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="work-area-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingArea ? t('auto.حفظ_التعديلات_4ff313') : t('auto.إنشاء_المنطقة_718885')}</span>
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
              <label className="form-label">{t('auto.اسم_منطقة_العمل_448fb6')}</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder={t('auto.مثال_الدور_الأرضي_الجناح_الشرق_7e69e0')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.كود_المنطقة_118931')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_GF_E1_7a7cf4')}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
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
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تأكيد_الحذف_4af57e')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_478ebe')}<strong style={{ color: 'var(--text-heading)' }}>"{deletingArea?.name}"</strong>{t('auto.سيتم_حذف_أو_فصل_كافة_المناطق_ا_351564')}</p>
      </Modal>
    </div>
  );
};
