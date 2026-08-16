import React, { useEffect, useState, useCallback } from 'react';
import { productionApi } from '../../api/production.api';
import type { ProductionRecord } from '../../api/production.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem } from '../../api/work-items.api';
import { workAreasApi } from '../../api/work-areas.api';
import type { WorkArea } from '../../api/work-areas.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../api/employees.api';
import { ProductionFormModal } from './ProductionFormModal';
import { ProductionDetailView } from './ProductionDetailView';
import { CorrectionFormModal } from './CorrectionFormModal';
import { XlsxProductionImportModal } from './XlsxProductionImportModal';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  Users,
  Download,
  UploadCloud,
} from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [supervisors, setSupervisors] = useState<Employee[]>([]);
  const [workers, setWorkers] = useState<Employee[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<ProductionRecord | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<ProductionRecord | null>(null);

  const loadDependencies = async () => {
    try {
      const [bRes, pRes, wRes, aRes, eRes] = await Promise.all([
        branchesApi.list({ isActive: true, limit: 100 }),
        projectsApi.list({ limit: 100 }),
        workItemsApi.list({ limit: 100, isActive: true }),
        workAreasApi.list({ limit: 100 }),
        employeesApi.list({ limit: 100, isActive: true }),
      ]);

      setBranches(bRes.data);
      setProjects(pRes.data);
      setWorkItems(wRes.data);
      setWorkAreas(aRes.data);

      const allEmps = eRes.data;
      const sups = allEmps.filter((e) => e.roleType === 'supervisor' || e.role === 'supervisor');
      setSupervisors(sups.length > 0 ? sups : allEmps);

      const wrks = allEmps.filter((e) => e.roleType === 'worker' || e.role === 'worker');
      setWorkers(wrks.length > 0 ? wrks : allEmps);
    } catch {
      // ignore
    }
  };

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productionApi.list({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        branchId: selectedBranch || undefined,
        projectId: selectedProject || undefined,
        status: selectedStatus || undefined,
        search: search.trim() || undefined,
      });
      setRecords(res.data);
      setTotal(res.total);

      // If a record is currently open in detail view, update its reference
      if (viewingRecord) {
        const updated = res.data.find((r) => r.id === viewingRecord.id);
        if (updated) setViewingRecord(updated);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل سجلات الإنتاج اليومي');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, selectedBranch, selectedProject, selectedStatus, search, viewingRecord]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleExportXlsx = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await productionApi.exportXlsx();
      setSuccessMsg('تم تصدير ملف إنتاجية الإكسيل بنجاح');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تصدير ملف الإنتاجية');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter projects by branch in the page filter
  const branchProjects = projects.filter((p) => !selectedBranch || p.branchId === selectedBranch);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-secondary">مسودة (Draft)</span>;
      case 'submitted':
        return <span className="badge badge-accent">مقدم (Submitted)</span>;
      case 'supervisor_approved':
        return (
          <span className="badge badge-primary" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#fbbf24' }}>
            معتمد مشرف
          </span>
        );
      case 'engineer_approved':
        return (
          <span className="badge badge-primary" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>
            معتمد مهندس
          </span>
        );
      case 'final_approved':
        return <span className="badge badge-success">✓ معتمد نهائيًا</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getRatioBadge = (actual: number, target: number) => {
    const safeTarget = target > 0 ? target : 1;
    const ratio = Math.round((actual / safeTarget) * 100);

    let color = '#34d399'; // Green > 100%
    let bg = 'rgba(16, 185, 129, 0.15)';

    if (ratio >= 80 && ratio <= 100) {
      color = '#60a5fa'; // Blue 80-100%
      bg = 'rgba(37, 99, 235, 0.15)';
    } else if (ratio < 80) {
      color = '#f87171'; // Red < 80%
      bg = 'rgba(239, 68, 68, 0.15)';
    }

    return (
      <span className="badge" style={{ background: bg, color, fontWeight: 700 }}>
        {ratio}%
      </span>
    );
  };

  // Paginated slice
  const paginatedRecords = records.slice((page - 1) * limit, page * limit);

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
            <Layers size={28} color="#60a5fa" />
            <span>الإنتاج اليومي وتتبع الإنجاز</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            تسجيل الإنجاز الميداني للبنود، والتحقق من توزيع كميات العمال (R5) ومسار الاعتمادات.
          </p>
        </div>

        {/* 3 Action Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportXlsx}
            className="btn btn-secondary"
            disabled={isExporting}
            style={{ gap: '0.4rem' }}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          >
            <UploadCloud size={16} />
            <span>استيراد من Excel</span>
          </button>

          <button onClick={() => setIsFormModalOpen(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>إدخال إنتاج جديد</span>
          </button>
        </div>
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

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Search size={14} />
            <span>بحث بالمشروع أو البند</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="ابحث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">من تاريخ</label>
          <input
            type="date"
            className="input-field"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">إلى تاريخ</label>
          <input
            type="date"
            className="input-field"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الفرع</label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedProject('');
              setPage(1);
            }}
          >
            <option value="">كافة الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">المشروع</label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة المشاريع</option>
            {branchProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Filter size={14} />
            <span>حالة الاعتماد</span>
          </label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الحالات</option>
            <option value="draft">مسودة (Draft)</option>
            <option value="submitted">مقدم (Submitted)</option>
            <option value="supervisor_approved">معتمد مشرف</option>
            <option value="engineer_approved">معتمد مهندس</option>
            <option value="final_approved">معتمد نهائيًا</option>
          </select>
        </div>
      </div>

      {/* Production Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>التاريخ</th>
                <th style={{ padding: '1rem' }}>المشروع / الفرع</th>
                <th style={{ padding: '1rem' }}>البند</th>
                <th style={{ padding: '1rem' }}>النوع</th>
                <th style={{ padding: '1rem' }}>المستهدف</th>
                <th style={{ padding: '1rem' }}>الفعلي</th>
                <th style={{ padding: '1rem' }}>نسبة الإنجاز</th>
                <th style={{ padding: '1rem' }}>المشرف</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل سجلات الإنتاج...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد سجلات إنتاجية مطابقة لمعايير البحث
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <Calendar size={13} color="#60a5fa" />
                        <span>{rec.date ? rec.date.split('T')[0] : '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{rec.projectName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {rec.branchName || 'فرع'} {rec.workAreaName ? `• ${rec.workAreaName}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{rec.workItemName}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {rec.productionType === 'team' ? (
                        <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                          <Users size={11} /> فريق ({rec.teamCode || 'Team'})
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          فردي ({rec.workers?.length || 0} عمال)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{rec.targetQuantity}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#60a5fa' }}>{rec.actualQuantity}</td>
                    <td style={{ padding: '1rem' }}>{getRatioBadge(Number(rec.actualQuantity), Number(rec.targetQuantity))}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {rec.supervisorName || '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>{getStatusBadge(rec.status)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setViewingRecord(rec)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem' }}
                        title="عرض التفاصيل ومسار الاعتماد"
                      >
                        <Eye size={14} color="#60a5fa" />
                        <span>عرض</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>إجمالي السجلات: {total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </button>
            <span style={{ padding: '0.35rem 0.5rem' }}>
              صفحة {page} من {Math.ceil(total / limit) || 1}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Production Form Modal */}
      <ProductionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('تم تسجيل تقرير الإنتاجية بنجاح!');
          loadRecords();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
        branches={branches}
        projects={projects}
        workItems={workItems}
        workAreas={workAreas}
        supervisors={supervisors}
        workers={workers}
      />

      {/* Production Detail View Modal */}
      <ProductionDetailView
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onRecordUpdated={() => {
          loadRecords();
        }}
        onRequestCorrection={(rec) => {
          setCorrectingRecord(rec);
        }}
      />

      {/* Correction Form Modal */}
      <CorrectionFormModal
        isOpen={!!correctingRecord}
        onClose={() => setCorrectingRecord(null)}
        onSuccess={() => {
          setSuccessMsg('تم تقديم طلب التصحيح بنجاح!');
          loadRecords();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
        record={correctingRecord}
      />

      {/* XLSX Production Import Modal */}
      <XlsxProductionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('تم استيراد واعتماد سجلات الإنتاج بنجاح!');
          loadRecords();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
