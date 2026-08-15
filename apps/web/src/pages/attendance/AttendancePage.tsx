import React, { useEffect, useState, useCallback } from 'react';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord, CreateAttendancePayload } from '../../api/attendance.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../api/employees.api';
import {
  CalendarCheck,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  UserCheck,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateAttendancePayload>({
    employeeId: '',
    projectId: '',
    branchId: '',
    date: new Date().toISOString().split('T')[0],
    statusId: '00000000-0000-0000-0004-000000000001', // Present
    checkInTime: '08:00',
    checkOutTime: '16:00',
    overtimeHours: 0,
    notes: '',
  });

  const loadDependencies = async () => {
    try {
      const [pRes, bRes, eRes] = await Promise.all([
        projectsApi.getProjects({ limit: 100 }),
        branchesApi.getBranches({ isActive: true }),
        employeesApi.getEmployees({ limit: 100, isActive: true }),
      ]);
      setProjects(pRes.data);
      setBranches(bRes.data);
      setEmployees(eRes.data);
    } catch {
      // ignore
    }
  };

  const loadAttendance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.getAttendance({
        page,
        limit,
        projectId: selectedProject || undefined,
        branchId: selectedBranch || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setAttendance(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل سجلات الحضور');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedProject, selectedBranch, fromDate, toDate]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const openCreateModal = () => {
    setFormData({
      employeeId: employees[0]?.id || '',
      projectId: projects[0]?.id || '',
      branchId: branches[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      statusId: '00000000-0000-0000-0004-000000000001',
      checkInTime: '08:00',
      checkOutTime: '16:00',
      overtimeHours: 0,
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await attendanceApi.createAttendance({
        ...formData,
        overtimeHours: Number(formData.overtimeHours) || 0,
      });
      setSuccessMsg('تم تسجيل الحضور بنجاح');
      setShowCreateModal(false);
      loadAttendance();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الحضور');
    } finally {
      setIsSaving(false);
    }
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
            <CalendarCheck size={28} color="#60a5fa" />
            <span>الحضور والانصراف وساعات الإضافي</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            تسجيل حضور العمالة بالمواقع، أوقات الحضور والانصراف، وساعات العمل الإضافية لحساب الأجور.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>تسجيل حضور يومي</span>
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

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Filter size={14} />
            <span>المشروع</span>
          </label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الفرع</label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
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
      </div>

      {/* Attendance Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>التاريخ</th>
                <th style={{ padding: '1rem' }}>الموظف / العامل</th>
                <th style={{ padding: '1rem' }}>المشروع والفرع</th>
                <th style={{ padding: '1rem' }}>حالة الحضور</th>
                <th style={{ padding: '1rem' }}>وقت الحضور</th>
                <th style={{ padding: '1rem' }}>وقت الانصراف</th>
                <th style={{ padding: '1rem' }}>ساعات الإضافي</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل سجلات الحضور...</p>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد سجلات حضور مسجلة
                  </td>
                </tr>
              ) : (
                attendance.map((att) => (
                  <tr
                    key={att.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {att.date}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{att.employeeName || 'موظف'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        هوية: {att.nationalId || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      <div>{att.projectName || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{att.branchName}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-success" style={{ gap: '0.3rem' }}>
                        <UserCheck size={12} />
                        <span>{att.statusName || 'حاضر'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                      {att.checkInTime || '—'}
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                      {att.checkOutTime || '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {Number(att.overtimeHours) > 0 ? (
                        <span className="badge badge-accent">
                          +{att.overtimeHours} ساعة
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
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
            <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
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

      {/* Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>تسجيل حضور موظف</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">الموظف / العامل *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  >
                    <option value="">اختر الموظف...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.identityNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المشروع *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  >
                    <option value="">اختر المشروع...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الفرع *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  >
                    <option value="">اختر الفرع...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ساعات الإضافي</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="input-field"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData({ ...formData, overtimeHours: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">وقت الحضور</label>
                  <input
                    type="time"
                    className="input-field"
                    value={formData.checkInTime || ''}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">وقت الانصراف</label>
                  <input
                    type="time"
                    className="input-field"
                    value={formData.checkOutTime || ''}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>تسجيل الحضور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
