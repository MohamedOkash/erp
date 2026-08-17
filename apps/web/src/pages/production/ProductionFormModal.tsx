import React, { useState, useEffect } from 'react';
import { productionApi } from '../../api/production.api';
import type { CreateProductionPayload, ProductionWorkerItem } from '../../api/production.api';
import type { Branch } from '../../api/branches.api';
import type { Project } from '../../api/projects.api';
import type { WorkItem } from '../../api/work-items.api';
import type { WorkArea } from '../../api/work-areas.api';
import type { Employee } from '../../api/employees.api';
import type { WorkItemStage } from '../../api/work-categories.api';
import { workItemStagesApi } from '../../api/work-categories.api';
import { Modal } from '../../components/Modal';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  Loader2,
  Layers,
  Building,
  FolderKanban,
  CheckSquare,
  Network,
  HardHat,
  Calendar,
  Plus,
  Trash2,
  Users,
  AlertCircle,
} from 'lucide-react';

interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: Branch[];
  projects: Project[];
  workItems: WorkItem[];
  workAreas: WorkArea[];
  supervisors: Employee[];
  workers: Employee[];
}

export const ProductionFormModal: React.FC<ProductionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  projects,
  workItems,
  workAreas,
  supervisors,
  workers,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [workItemId, setWorkItemId] = useState<string>('');
  const [workItemStageId, setWorkItemStageId] = useState<string>('');
  const [stages, setStages] = useState<WorkItemStage[]>([]);
  const [workAreaId, setWorkAreaId] = useState<string>('');
  const [supervisorId, setSupervisorId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<number>(100);
  const [actualQuantity, setActualQuantity] = useState<number>(100);
  const [productionType, setProductionType] = useState<'individual' | 'team'>('individual');
  const [teamCode, setTeamCode] = useState<string>('TEAM-01');
  const [workerRows, setWorkerRows] = useState<ProductionWorkerItem[]>([]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      const defaultBranch = branches[0]?.id || '';
      setBranchId(defaultBranch);
      const defaultItem = workItems[0]?.id || '';
      setWorkItemId(defaultItem);
      setSupervisorId(supervisors[0]?.id || '');
      setTargetQuantity(100);
      setActualQuantity(100);
      setProductionType('individual');
      setTeamCode('TEAM-01');
      setValidationError(null);

      // Default first worker
      const firstWorker = workers[0]?.id || '';
      setWorkerRows(
        firstWorker
          ? [{
              employeeId: firstWorker,
              workerType: 'individual',
              individualQuantity: 100,
              hoursWorked: 8,
              overtimeHours: 0,
              bonusPercentage: 0,
              skillLevel: 'skilled',
            }]
          : [],
      );
    }
  }, [isOpen, branches, workItems, supervisors, workers]);

  // Load stages when workItemId changes
  useEffect(() => {
    if (workItemId) {
      workItemStagesApi
        .listByItem(workItemId)
        .then((res) => {
          setStages(res);
          if (res.length > 0) {
            setWorkItemStageId(res[0].id);
            if (res[0].standard_productivity) {
              setTargetQuantity(Number(res[0].standard_productivity));
            }
          } else {
            setWorkItemStageId('');
          }
        })
        .catch(() => setStages([]));
    } else {
      setStages([]);
      setWorkItemStageId('');
    }
  }, [workItemId]);

  const handleStageChange = (stageId: string) => {
    setWorkItemStageId(stageId);
    const found = stages.find((s) => s.id === stageId);
    if (found && found.standard_productivity) {
      setTargetQuantity(Number(found.standard_productivity));
    }
  };

  // Update filtered projects when branch changes
  const filteredProjects = projects.filter((p) => !branchId || p.branchId === branchId);

  useEffect(() => {
    if (filteredProjects.length > 0) {
      if (!filteredProjects.some((p) => p.id === projectId)) {
        setProjectId(filteredProjects[0].id);
      }
    } else {
      setProjectId('');
    }
  }, [branchId, filteredProjects, projectId]);

  // Update filtered work areas when project changes
  const filteredAreas = workAreas.filter((a) => !projectId || a.projectId === projectId);

  if (!isOpen) return null;

  const addWorkerRow = () => {
    if (workers.length === 0) return;
    setWorkerRows([
      ...workerRows,
      {
        employeeId: workers[0].id,
        workerType: 'individual',
        individualQuantity: 0,
        hoursWorked: 8,
        overtimeHours: 0,
        bonusPercentage: 0,
        skillLevel: 'skilled',
      },
    ]);
  };

  const removeWorkerRow = (index: number) => {
    setWorkerRows(workerRows.filter((_, i) => i !== index));
  };

  const updateWorker = (index: number, field: keyof ProductionWorkerItem, value: any) => {
    const updated = [...workerRows];
    updated[index] = { ...updated[index], [field]: value };
    setWorkerRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!date || !branchId || !projectId || !workItemId || !supervisorId) {
      setValidationError('يرجى ملء جميع الحقول الإجبارية');
      return;
    }

    // R5 Validation: If individual, sum of individual worker quantities must exactly equal actualQuantity
    if (productionType === 'individual') {
      const sumWorkers = workerRows.reduce((acc, w) => acc + (Number(w.individualQuantity) || 0), 0);
      if (Math.abs(sumWorkers - Number(actualQuantity)) > 0.001) {
        setValidationError(
          `خطأ في قاعدة العمل R5: مجموع كميات العمال الموزعة (${sumWorkers}) لا يساوي الكمية الفعلية الإجمالية (${actualQuantity})`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductionPayload = {
        date,
        branchId,
        projectId,
        workItemId,
        workItemStageId: workItemStageId || undefined,
        workAreaId: workAreaId || null,
        supervisorId,
        targetQuantity: Number(targetQuantity) || 0,
        actualQuantity: Number(actualQuantity),
        productionType,
        teamCode: productionType === 'team' ? teamCode : undefined,
        workers:
          productionType === 'individual'
            ? workerRows.map((w) => ({
                employeeId: w.employeeId,
                workerType: 'individual',
                individualQuantity: Number(w.individualQuantity) || 0,
                hoursWorked: Number(w.hoursWorked) || 8,
                overtimeHours: Number(w.overtimeHours) || 0,
                bonusPercentage: Number(w.bonusPercentage) || 0,
                skillLevel: w.skillLevel || 'skilled',
              }))
            : workers.slice(0, 1).map((w) => ({
                employeeId: w.id,
                workerType: 'team',
                individualQuantity: 0,
                hoursWorked: 8,
                isEstimated: true,
              })),
      };

      await productionApi.create(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'فشل حفظ تقرير الإنتاج اليومي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إدخال تقرير إنتاجية يومي مرحلي جديد"
      icon={<Layers size={22} color="#60a5fa" />}
      maxWidth="3xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
            إلغاء
          </button>
          <button type="submit" form="production-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>حفظ تقرير الإنتاج (مسودة)</span>
          </button>
        </div>
      }
    >
      <form id="production-form" onSubmit={handleSubmit}>

        {validationError && (
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
            <span>{validationError}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Calendar size={14} />
                <span>تاريخ التنفيذ *</span>
              </label>
              <WheelDatePicker
                required
                value={date}
                onChange={(val) => setDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} />
                <span>الفرع *</span>
              </label>
              <select
                required
                className="input-field"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">اختر الفرع...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <FolderKanban size={14} />
                <span>المشروع *</span>
              </label>
              <select
                required
                className="input-field"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">اختر المشروع...</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <CheckSquare size={14} />
                <span>بند العمل *</span>
              </label>
              <select
                required
                className="input-field"
                value={workItemId}
                onChange={(e) => setWorkItemId(e.target.value)}
              >
                <option value="">اختر بند العمل...</option>
                {workItems.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.code ? `(${w.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Stages Selector */}
            {stages.length > 0 && (
              <div className="form-group animate-fade-in" style={{ gridColumn: 'span 2', margin: 0 }}>
                <label className="form-label">
                  <Layers size={14} color="#818cf8" />
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>مرحلة البند المنفذة * (المعدل القياسي التلقائي)</span>
                </label>
                <select
                  className="input-field"
                  style={{ borderColor: 'rgba(129, 140, 248, 0.4)', background: 'rgba(15, 23, 42, 0.9)' }}
                  value={workItemStageId}
                  onChange={(e) => handleStageChange(e.target.value)}
                >
                  {stages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name} — (وزن: {Math.round(Number(stg.percentage) * 100)}% | إنتاجية قياسية: {stg.standard_productivity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Network size={14} />
                <span>منطقة / موقع العمل (اختياري)</span>
              </label>
              <select
                className="input-field"
                value={workAreaId}
                onChange={(e) => setWorkAreaId(e.target.value)}
              >
                <option value="">(كامل المشروع / بدون تحديد منطقة)</option>
                {filteredAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code || 'موقع'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <HardHat size={14} />
                <span>المشرف الميداني المسؤول *</span>
              </label>
              <select
                required
                className="input-field"
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
              >
                <option value="">اختر المشرف...</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || 'مشرف'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">الكمية المستهدفة (Target) *</label>
              <input
                type="number"
                min="0"
                required
                className="input-field"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">الكمية الفعلية المنفذة (Actual) *</label>
              <input
                type="number"
                min="0"
                required
                className="input-field"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">نمط تسجيل الإنتاجية *</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="productionType"
                    value="individual"
                    checked={productionType === 'individual'}
                    onChange={() => setProductionType('individual')}
                  />
                  <span>فردي (حسب إنجاز كل عامل - Rule R5)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="productionType"
                    value="team"
                    checked={productionType === 'team'}
                    onChange={() => setProductionType('team')}
                  />
                  <span>فريق عمل جماعي (Team)</span>
                </label>
              </div>
            </div>

            {productionType === 'team' && (
              <div className="form-group animate-fade-in" style={{ gridColumn: 'span 2', margin: 0 }}>
                <label className="form-label">كود / اسم الفريق الجماعي *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="مثال: TEAM-PLASTER-01"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Workers Distribution Section (R5 + Overtime + Bonus + Skill) */}
          {productionType === 'individual' && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} color="#60a5fa" />
                    <span>توزيع إنجاز العمال المشاركين (Rule R5 + إضافي وحوافز)</span>
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    مجموع كميات العمال ({workerRows.reduce((a, b) => a + (Number(b.individualQuantity) || 0), 0)}) يجب أن يطابق تمامًا الكمية الفعلية ({actualQuantity})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={addWorkerRow}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.3rem' }}
                >
                  <Plus size={14} />
                  <span>إضافة عامل</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {workerRows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 0.9fr 0.9fr 0.9fr 1fr auto',
                      gap: '0.4rem',
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <select
                        className="input-field"
                        style={{ fontSize: '0.8rem' }}
                        value={row.employeeId}
                        onChange={(e) => updateWorker(idx, 'employeeId', e.target.value)}
                      >
                        {workers.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.code || 'عامل'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="الكمية"
                        className="input-field"
                        style={{ fontSize: '0.8rem' }}
                        value={row.individualQuantity}
                        onChange={(e) => updateWorker(idx, 'individualQuantity', Number(e.target.value))}
                        title="الكمية الفردية"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        placeholder="ساعات أساسية"
                        className="input-field"
                        style={{ fontSize: '0.8rem' }}
                        value={row.hoursWorked}
                        onChange={(e) => updateWorker(idx, 'hoursWorked', Number(e.target.value))}
                        title="ساعات العمل الأساسية (8)"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        max="16"
                        step="0.5"
                        placeholder="إضافي (ساعة)"
                        className="input-field"
                        style={{ fontSize: '0.8rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                        value={row.overtimeHours || 0}
                        onChange={(e) => updateWorker(idx, 'overtimeHours', Number(e.target.value))}
                        title="ساعات العمل الإضافية (Overtime)"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="حافز %"
                        className="input-field"
                        style={{ fontSize: '0.8rem', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                        value={row.bonusPercentage || 0}
                        onChange={(e) => updateWorker(idx, 'bonusPercentage', Number(e.target.value))}
                        title="نسبة الحافز أو المكافأة %"
                      />
                    </div>

                    <div>
                      <select
                        className="input-field"
                        style={{ fontSize: '0.8rem' }}
                        value={row.skillLevel || 'skilled'}
                        onChange={(e) => updateWorker(idx, 'skillLevel', e.target.value)}
                        title="المستوى المهني"
                      >
                        <option value="skilled">فني (صنايعي)</option>
                        <option value="unskilled">مساعد (عامل)</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeWorkerRow(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '0.3rem',
                        }}
                        title="حذف العامل"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      </form>
    </Modal>
  );
};
