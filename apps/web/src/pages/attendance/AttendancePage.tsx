import React, { useEffect, useState, useCallback } from 'react';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord, CreateAttendancePayload } from '../../api/attendance.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../api/employees.api';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker, WheelTimePicker } from '../../components/WheelPicker';
import { DeviceAttendanceImportModal } from '../../components/DeviceAttendanceImportModal';
import { AttendancePolicyModal } from '../../components/AttendancePolicyModal';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  CalendarCheck,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Fingerprint,
  Edit3,
  FileSpreadsheet,
  Sliders,
  Lock,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
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

  const isSingleScoped = Boolean(user?.scopes && user.scopes.length === 1);

  // Set default project if user is scoped to a single project
  useEffect(() => {
    if (user?.scopes && user.scopes.length === 1 && !selectedProject) {
      setSelectedProject(user.scopes[0].projectId);
    }
  }, [user?.scopes]);

  // Scoped project list
  const scopedProjects = React.useMemo(() => {
    let list = projects;
    if (user?.scopes && user.scopes.length > 0) {
      const allowedIds = new Set(user.scopes.map((s) => s.projectId));
      list = list.filter((p) => allowedIds.has(p.id));
    }
    if (selectedBranch) {
      list = list.filter((p) => p.branchId === selectedBranch);
    }
    return list;
  }, [projects, user?.scopes, selectedBranch]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
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
      setError(err.message || t('auto.فشل_تحميل_سجلات_الحضور_213f7a'));
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
      setSuccessMsg(t('auto.تم_تسجيل_الحضور_بنجاح_41cc2b'));
      setShowCreateModal(false);
      loadAttendance();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تسجيل_الحضور_d34dd0'));
    } finally {
      setIsSaving(false);
    }
  };

  // Compute summary stats
  const presentCount = attendance.filter(
    (a) => a.statusCode === 'present' || (!a.statusCode && (a.statusName || '').includes(t('auto.حاضر_2e68dd'))),
  ).length;
  const absentCount = attendance.filter(
    (a) => a.statusCode === 'absent' || (a.statusName || '').includes(t('auto.غائب_2ec74a')),
  ).length;
  const lateCount = attendance.filter(
    (a) => a.statusCode === 'late' || (a.statusName || '').includes(t('auto.متأخر_5b3e7c')),
  ).length;
  const totalOvertime = attendance.reduce((acc, a) => acc + (Number(a.overtimeHours) || 0), 0);

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'device':
        return (
          <span
            className="badge badge-primary"
            style={{
              gap: '0.3rem',
              fontSize: '0.75rem',
              background: 'rgba(59, 130, 246, 0.15)',
              borderColor: 'rgba(59, 130, 246, 0.4)',
            }}
          >
            <Fingerprint size={12} color="#60a5fa" />
            <span>{t('auto.بصمة_جهاز_42e3b3')}</span>
          </span>
        );
      case 'xlsx':
        return (
          <span
            className="badge badge-secondary"
            style={{
              gap: '0.3rem',
              fontSize: '0.75rem',
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
            }}
          >
            <FileSpreadsheet size={12} />
            <span>{t('auto.إكسيل_598729')}</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" style={{ gap: '0.3rem', fontSize: '0.75rem' }}>
            <Edit3 size={12} />
            <span>{t('auto.يدوي_2f3dce')}</span>
          </span>
        );
    }
  };

  const getStatusBadge = (statusName?: string, statusCode?: string) => {
    const name = statusName || t('auto.حاضر_2e68dd');
    const code = statusCode || 'present';
    if (code === 'present' || name.includes(t('auto.حاضر_2e68dd'))) {
      return (
        <span className="badge badge-success" style={{ gap: '0.3rem' }}>
          <UserCheck size={12} />
          <span>{name}</span>
        </span>
      );
    }
    if (code === 'late' || name.includes(t('auto.متأخر_5b3e7c'))) {
      return (
        <span
          className="badge badge-accent"
          style={{
            gap: '0.3rem',
            background: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            color: '#f59e0b',
          }}
        >
          <Clock size={12} />
          <span>{name}</span>
        </span>
      );
    }
    if (code === 'absent' || name.includes(t('auto.غائب_2ec74a'))) {
      return (
        <span
          className="badge badge-secondary"
          style={{
            gap: '0.3rem',
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#f87171',
          }}
        >
          <UserX size={12} />
          <span>{name}</span>
        </span>
      );
    }
    return (
      <span className="badge badge-secondary" style={{ gap: '0.3rem' }}>
        <span>{name}</span>
      </span>
    );
  };

  const statsItems = [
    {
      label: t('auto.الحاضرون_اليوم_41951c'),
      value: presentCount,
      helper: `${attendance.length} مسجلين بالجلسة`,
      icon: <UserCheck size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.تأخيرات_الحضور_569af0'),
      value: lateCount,
      helper: t('auto.تجاوز_وقت_الوردية_والسماح_41f150'),
      icon: <Clock size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.الغياب_والتغيب_2921ad'),
      value: absentCount,
      helper: t('auto.بدون_إذن_أو_لم_يبصموا_4f229c'),
      icon: <UserX size={22} />,
      color: '#f87171',
    },
    {
      label: t('auto.ساعات_إضافي_اليوم_4fef88'),
      value: `${totalOvertime.toFixed(1)} ساعة`,
      helper: t('auto.ت_حسب_في_مخصصات_الرواتب_88869d'),
      icon: <Zap size={22} />,
      color: '#60a5fa',
    },
  ];

  const startRecord = attendance.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Top Header & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarCheck size={26} color="#60a5fa" />
            <span>{t('operations.attendance_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.attendance')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPolicyModal(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
          >
            <Sliders size={16} />
            <span>{t('nav.links.settings')}</span>
          </button>

          <button
            onClick={() => setShowBiometricModal(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
          >
            <Fingerprint size={16} />
            <span>{t('operations.import_biometric')}</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>{t('operations.check_in')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && attendance.length === 0} />

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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} />
              <span>{t('auto.المشروع_7f28ee')}</span>
            </div>
            {isSingleScoped && (
              <span style={{ fontSize: '10px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={11} /> {t('auto.نطاق_مخصص_1b6320')}</span>
            )}
          </label>
          <select
            className="input-field"
            value={selectedProject}
            disabled={isSingleScoped}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
            style={isSingleScoped ? { opacity: 0.85, cursor: 'not-allowed', borderColor: 'rgba(139, 92, 246, 0.4)' } : {}}
          >
            {!isSingleScoped && <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>}
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.الفرع_59a3fe')}</label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الفروع_1a62e9')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.من_تاريخ_4c8e03')}</label>
          <WheelDatePicker
            placeholder={t('auto.من_تاريخ_3db437')}
            value={fromDate}
            onChange={(val) => {
              setFromDate(val);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.إلى_تاريخ_d3e6d7')}</label>
          <WheelDatePicker
            placeholder={t('auto.إلى_تاريخ_33c707')}
            value={toDate}
            onChange={(val) => {
              setToDate(val);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Attendance Table */}
      {isLoading && attendance.length === 0 ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.التاريخ_7f54ad')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الموظف_العامل_75e51c')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_والفرع_410648')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المصدر_252257')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.حالة_الحضور_2945fd')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.وقت_الحضور_b25f47')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.وقت_الانصراف_2fe8a8')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.ساعات_الإضافي_37cc3e')}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_سجلات_حضور_مسجلة_7d0848')}</td>
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
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{att.employeeName || t('auto.موظف_2f1f2e')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {t('auto.هوية_5b68da')}{att.nationalId || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <div>{att.projectName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{att.branchName}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {getSourceBadge(att.source)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(att.statusName, att.statusCode)}
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
                            +{Number(att.overtimeHours).toFixed(1)} {t('auto.ساعة_2e9486')}</span>
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
            <span>
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.سجل_حضور_2ba5dc')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}</button>
              <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('auto.التالي_252ecf')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('auto.تسجيل_حضور_موظف_4edd57')}
        icon={<CalendarCheck size={22} color="#60a5fa" />}
        maxWidth="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="attendance-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تسجيل_الحضور_b1ae62')}</span>
            </button>
          </div>
        }
      >
        <form id="attendance-form" onSubmit={handleSaveAttendance}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">{t('auto.الموظف_العامل_6eefbb')}</label>
              <select
                required
                className="input-field"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              >
                <option value="">{t('auto.اختر_الموظف_2520bb')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.identityNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.المشروع_7f28ee')}</label>
              <select
                className="input-field"
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">{t('auto.بدون_تحديد_مشروع_76d760')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.الفرع_59a3fe')}</label>
              <select
                className="input-field"
                value={formData.branchId || ''}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              >
                <option value="">{t('auto.بدون_تحديد_فرع_10e80b')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.التاريخ_31f58d')}</label>
              <WheelDatePicker
                required
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.حالة_الحضور_1043a2')}</label>
              <select
                required
                className="input-field"
                value={formData.statusId}
                onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
              >
                <option value="00000000-0000-0000-0004-000000000001">{t('auto.حاضر_Present_5fc486')}</option>
                <option value="00000000-0000-0000-0004-000000000002">{t('auto.غائب_Absent_5404a0')}</option>
                <option value="00000000-0000-0000-0004-000000000003">{t('auto.متأخر_Late_729bb3')}</option>
                <option value="00000000-0000-0000-0004-000000000004">{t('auto.إجازة_بعذر_Excused_313084')}</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.ساعات_الإضافي_37cc3e')}</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="input-field"
                value={formData.overtimeHours}
                onChange={(e) => setFormData({ ...formData, overtimeHours: Number(e.target.value) })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.وقت_الحضور_b25f47')}</label>
              <WheelTimePicker
                value={formData.checkInTime || ''}
                onChange={(val) => setFormData({ ...formData, checkInTime: val })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.وقت_الانصراف_2fe8a8')}</label>
              <WheelTimePicker
                value={formData.checkOutTime || ''}
                onChange={(val) => setFormData({ ...formData, checkOutTime: val })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Biometric Device Import Modal */}
      <DeviceAttendanceImportModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onImportSuccess={() => {
          setSuccessMsg(t('auto.تم_استيراد_واعتماد_سجلات_البصم_4d316b'));
          loadAttendance();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Attendance Policy Modal */}
      <AttendancePolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        projects={projects}
        onPolicyChanged={() => {
          loadAttendance();
        }}
      />
    </div>
  );
};
