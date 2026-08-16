import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { workAreasApi } from '../../api/work-areas.api';
import type { WorkArea, CreateWorkAreaPayload, UpdateWorkAreaPayload } from '../../api/work-areas.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { Modal } from '../../components/Modal';
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
      setError(err.message || 'فشل تحميل مناطق العمل');
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
        setSuccessMsg('تم تحديث منطقة العمل بنجاح');
      } else {
        const payload: CreateWorkAreaPayload = {
          projectId: selectedProject,
          parentId: modalParentId,
          name: formName.trim(),
          code: formCode.trim() || undefined,
          sortOrder: Number(formSortOrder) || 0,
        };
        await workAreasApi.create(payload);
        setSuccessMsg('تم إنشاء منطقة العمل بنجاح');
      }
      setIsModalOpen(false);
      loadAreas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ منطقة العمل');
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
      setError(err.message || 'فشل حذف المنطقة');
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
              <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>
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
              مستوى {node.level ?? depth + 1}
            </span>
          </div>

          {/* Right Side: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => openCreateChild(node)}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
              title="إضافة منطقة فرعية تابعة"
            >
              <CornerDownLeft size={13} />
              <span>فرعية</span>
            </button>

            <button
              type="button"
              onClick={() => openEdit(node)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
              title="تعديل المنطقة"
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
              title="حذف المنطقة"
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
            <span>الهيكل المكاني ومناطق العمل (Work Areas)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            شجرة هرمية تفصيلية لمناطق المشروع (مبنى ← دور ← شقة / جناح ← غرفة).
          </p>
        </div>

        <button
          onClick={openCreateRoot}
          className="btn btn-primary"
          style={{ gap: '0.5rem' }}
          disabled={!selectedProject}
        >
          <Plus size={18} />
          <span>إضافة منطقة رئيسية</span>
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
              المشروع الميداني المستهدف *
            </label>
            <select
              className="input-field"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code || 'بدون كود'}) - {p.branchName || 'فرع'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          إجمالي المناطق المسجلة بالمشروع: <strong style={{ color: '#ffffff' }}>{areas.length}</strong>
        </div>
      </div>

      {/* Tree Container */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={18} color="#60a5fa" />
            <span>الشجرة الهرمية لمواقع العمل</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            يمكنك طي وفرز المستويات بالضغط على الأسهم
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري بناء الشجرة الهرمية...</p>
          </div>
        ) : areaTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FolderTree size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>لا توجد مناطق عمل مسجلة لهذا المشروع حتى الآن</p>
            <button
              onClick={openCreateRoot}
              className="btn btn-primary"
              style={{ marginTop: '1rem', gap: '0.5rem' }}
            >
              <Plus size={16} />
              <span>إضافة أول منطقة رئيسية (مثل: مبنى A)</span>
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
            ? 'تعديل منطقة العمل'
            : modalParentId
            ? 'إضافة منطقة فرعية تابعة'
            : 'إضافة منطقة رئيسية'
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
              إلغاء
            </button>
            <button type="submit" form="work-area-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingArea ? 'حفظ التعديلات' : 'إنشاء المنطقة'}</span>
            </button>
          </div>
        }
      >
        <form id="work-area-form" onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">المنطقة الأب (Parent Area)</label>
              <select
                className="input-field"
                value={modalParentId || ''}
                onChange={(e) => setModalParentId(e.target.value || null)}
              >
                <option value="">(منطقة رئيسية - الجذر Root)</option>
                {areas
                  .filter((a) => !editingArea || a.id !== editingArea.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {'— '.repeat(a.level || 0)} {a.name} ({a.code || 'بدون كود'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">اسم منطقة العمل *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="مثال: الدور الأرضي / الجناح الشرقي..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">كود المنطقة</label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: GF-E1"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">ترتيب العرض (Sort Order)</label>
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
        title="تأكيد حذف منطقة العمل"
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
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>تأكيد الحذف</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          هل أنت متأكد من رغبتك في حذف المنطقة <strong style={{ color: '#ffffff' }}>"{deletingArea?.name}"</strong>؟ سيتم حذف أو فصل كافة المناطق الفرعية التابعة لها.
        </p>
      </Modal>
    </div>
  );
};
