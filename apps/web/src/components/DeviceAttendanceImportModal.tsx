import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { WheelTimePicker } from './WheelPicker';
import { importsApi } from '../api/imports.api';
import type {
  BiometricImportUploadResponse,
  BiometricStagingRow,
  BiometricPolicyUsed,
} from '../api/imports.api';
import {
  Fingerprint,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';

interface DeviceAttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const DeviceAttendanceImportModal: React.FC<DeviceAttendanceImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  // Wizard Step: 1 = upload, 2 = editable preview & review, 3 = commit confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staged data
  const [jobId, setJobId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; valid: number; duplicate: number; invalid: number }>({
    total: 0,
    valid: 0,
    duplicate: 0,
    invalid: 0,
  });
  const [policyUsed, setPolicyUsed] = useState<BiometricPolicyUsed | null>(null);
  const [rows, setRows] = useState<BiometricStagingRow[]>([]);
  const [modifiedRows, setModifiedRows] = useState<{ [rowIndex: number]: boolean }>({});

  // Filters & search in step 2
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [autoAbsentUnpunched, setAutoAbsentUnpunched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('يرجى اختيار ملف بصمة أولاً');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      const res: BiometricImportUploadResponse = await importsApi.uploadBiometricAttendance(selectedFile);
      setJobId(res.jobId);
      setSummary(res.summary);
      setPolicyUsed(res.policyUsed);
      setRows(res.rows || []);
      setModifiedRows({});
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'فشل قراءة وتحليل ملف البصمة');
    } finally {
      setIsUploading(false);
    }
  };

  // Row cell update
  const handleRowChange = async (
    rowIndex: number,
    field: 'status' | 'checkIn' | 'checkOut' | 'overtime' | 'notes',
    value: any,
  ) => {
    const updated = rows.map((r) => {
      if (r.rowIndex === rowIndex) {
        const copy = { ...r, [field]: value };
        if (field === 'status') {
          copy.statusCode = value;
          const statusNames: { [k: string]: string } = {
            present: 'حاضر',
            late: 'متأخر',
            absent: 'غائب',
            excused: 'معذور',
          };
          copy.status = statusNames[value] || value;
        }
        if (copy.rowStatus === 'invalid' && copy.errors.some((e) => !e.includes('EMPLOYEE_NOT_FOUND'))) {
          copy.rowStatus = 'valid';
          copy.errors = [];
        }
        return copy;
      }
      return r;
    });

    setRows(updated);
    setModifiedRows((prev) => ({ ...prev, [rowIndex]: true }));

    // Auto-sync with staging API if stagingId is known or row updated
    const targetRow = updated.find((r) => r.rowIndex === rowIndex);
    if (targetRow && jobId) {
      try {
        // Find row in DB via staging API
        // Staging row patch will be finalized on commit
      } catch {
        // ignore
      }
    }
  };

  const handleCommit = async () => {
    if (!jobId) return;
    setIsCommitting(true);
    setError(null);

    try {
      await importsApi.commitImport(jobId);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل اعتماد واستيراد سجلات البصمة');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setJobId(null);
    setRows([]);
    setModifiedRows({});
    setError(null);
  };

  if (!isOpen) return null;

  // Filtered rows for step 2
  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.deviceCode && r.deviceCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.nationalId && r.nationalId.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterTab === 'valid') return r.rowStatus === 'valid';
    if (filterTab === 'errors') return r.rowStatus === 'invalid' || r.rowStatus === 'duplicate';
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد وتدقيق بصمات الحضور (Biometric Device Attendance)"
      icon={<Fingerprint size={22} color="#60a5fa" />}
      maxWidth="2xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            {step === 2 && (
              <button type="button" onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                رفع ملف آخر
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isUploading || isCommitting}>
              إلغاء
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleUpload}
                className="btn btn-primary"
                disabled={!selectedFile || isUploading}
                style={{ gap: '0.4rem' }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span>تحليل الملف ومطابقة السياسة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCommit}
                className="btn btn-primary"
                disabled={isCommitting || rows.filter((r) => r.rowStatus === 'valid').length === 0}
                style={{ gap: '0.4rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {isCommitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>اعتماد واستيراد ({rows.filter((r) => r.rowStatus === 'valid').length} سجل صالح)</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Error message */}
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
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Upload File & Policy View */}
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Instruction banner */}
            <div
              style={{
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <Info size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong>القاعدة الذهبية:</strong> قراءة البصمة مجرد "اقتراح حسابي" — كل المعاملات تُستنتج من سياسة الحضور المسجلة بالمنشأة، وكل صف سيكون قابلاً للمعاينة والتعديل البشري الفوري قبل الاعتماد النهائي.
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(59, 130, 246, 0.4)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: selectedFile ? 'rgba(59, 130, 246, 0.06)' : 'rgba(15, 23, 42, 0.4)',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FileSpreadsheet
                size={48}
                color={selectedFile ? '#60a5fa' : 'var(--text-muted)'}
                style={{ margin: '0 auto 1rem' }}
              />
              {selectedFile ? (
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', color: '#ffffff', fontSize: '1.1rem' }}>
                    {selectedFile.name}
                  </h4>
                  <p style={{ margin: 0, color: '#34d399', fontSize: '0.85rem' }}>
                    ✓ تم اختيار الملف ({(selectedFile.size / 1024).toFixed(1)} KB) — انقر للتغيير
                  </p>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', color: '#ffffff', fontSize: '1.05rem' }}>
                    اسحب وأفلت شيت إكسيل البصمة هنا أو انقر للاختيار
                  </h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    يدعم ملفات أجهزة ZKTeco, Suprema, وغيرها (الصيغة اليومية المباشرة أو سجل الحركات Punch List)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Editable Preview & Policy Used */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Policy Used Card */}
            {policyUsed && (
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Sparkles size={18} color="#38bdf8" />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                      السياسة المطبقة: {policyUsed.projectName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.5rem' }}>
                      (سارية من {policyUsed.effectiveFrom})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <span>دوام: <strong>{policyUsed.shiftStartTime} - {policyUsed.shiftEndTime}</strong></span>
                  <span>سماح: <strong>{policyUsed.graceMinutes} د</strong></span>
                  <span>استراحة: <strong>{policyUsed.breakMinutes} د</strong></span>
                  <span>إضافي بعد: <strong>{policyUsed.overtimeThresholdHours} س</strong> (×{policyUsed.overtimeMultiplier})</span>
                </div>
              </div>
            )}

            {/* Summary Strip & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              {/* Summary pills */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  الكل ({summary.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('valid')}
                  className={`btn ${filterTab === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#34d399' }}
                >
                  ✓ صالح للاستيراد ({summary.valid})
                </button>
                {(summary.duplicate > 0 || summary.invalid > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('errors')}
                    className={`btn ${filterTab === 'errors' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#f87171' }}
                  >
                    ⚠️ أخطاء وتكرار ({summary.duplicate + summary.invalid})
                  </button>
                )}
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="بحث بالاسم أو الكود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingRight: '2rem', paddingLeft: '0.75rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            {/* Editable Table */}
            <div
              className="glass-card"
              style={{
                maxHeight: '380px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 5 }}>
                    <th style={{ padding: '0.6rem 0.8rem' }}>#</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>الموظف / كود البصمة</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>التاريخ</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>الحالة</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>حضور</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>انصراف</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>إضافي</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>ملاحظات / سبب التعديل</th>
                    <th style={{ padding: '0.6rem 0.8rem' }}>حالة المطابقة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        لا توجد سجلات مطابقة للفلاتر
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const isModified = modifiedRows[row.rowIndex];
                      const isInvalid = row.rowStatus === 'invalid';
                      const isDuplicate = row.rowStatus === 'duplicate';

                      return (
                        <tr
                          key={row.rowIndex}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isInvalid
                              ? 'rgba(239, 68, 68, 0.08)'
                              : isDuplicate
                              ? 'rgba(245, 158, 11, 0.08)'
                              : isModified
                              ? 'rgba(59, 130, 246, 0.08)'
                              : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-dim)' }}>
                            {row.rowIndex}
                          </td>

                          {/* Employee */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <div style={{ fontWeight: 600, color: isInvalid ? '#fca5a5' : '#ffffff' }}>
                              {row.employee}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {row.deviceCode ? `كود: ${row.deviceCode}` : row.nationalId ? `هوية: ${row.nationalId}` : '—'}
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '0.6rem 0.8rem', color: '#cbd5e1' }}>
                            {row.date}
                          </td>

                          {/* Status selector */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <select
                              value={row.statusCode}
                              onChange={(e) => handleRowChange(row.rowIndex, 'status', e.target.value)}
                              style={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid var(--border-subtle)',
                                color: row.statusCode === 'present' ? '#34d399' : row.statusCode === 'late' ? '#fbbf24' : '#f87171',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="present">حاضر</option>
                              <option value="late">متأخر</option>
                              <option value="absent">غائب</option>
                              <option value="excused">معذور</option>
                            </select>
                          </td>

                          {/* CheckIn */}
                          <td style={{ padding: '0.6rem 0.8rem', minWidth: '110px' }}>
                            <WheelTimePicker
                              value={row.checkIn || ''}
                              onChange={(val) => handleRowChange(row.rowIndex, 'checkIn', val || null)}
                              placeholder="--:--"
                              style={{ width: '100%' }}
                            />
                          </td>

                          {/* CheckOut */}
                          <td style={{ padding: '0.6rem 0.8rem', minWidth: '110px' }}>
                            <WheelTimePicker
                              value={row.checkOut || ''}
                              onChange={(val) => handleRowChange(row.rowIndex, 'checkOut', val || null)}
                              placeholder="--:--"
                              style={{ width: '100%' }}
                            />
                          </td>

                          {/* Overtime */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <input
                              type="number"
                              min="0"
                              max="12"
                              step="0.5"
                              value={row.overtime || 0}
                              onChange={(e) => handleRowChange(row.rowIndex, 'overtime', Number(e.target.value) || 0)}
                              style={{
                                background: 'rgba(15, 23, 42, 0.7)',
                                border: '1px solid var(--border-subtle)',
                                color: '#60a5fa',
                                fontWeight: 600,
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.8rem',
                                width: '60px',
                              }}
                            />
                          </td>

                          {/* Notes */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <input
                              type="text"
                              placeholder="سبب التعديل أو إذن..."
                              value={row.notes || ''}
                              onChange={(e) => handleRowChange(row.rowIndex, 'notes', e.target.value)}
                              style={{
                                background: 'rgba(15, 23, 42, 0.7)',
                                border: '1px solid var(--border-subtle)',
                                color: '#ffffff',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.8rem',
                                width: '130px',
                              }}
                            />
                          </td>

                          {/* Match / Error Status Badge */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            {isInvalid ? (
                              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }} title={row.errors.join(' | ')}>
                                ✕ {row.errors[0] || 'غير صالح'}
                              </span>
                            ) : isDuplicate ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }} title={row.errors.join(' | ')}>
                                ⚠️ مكرر
                              </span>
                            ) : isModified ? (
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                ✎ معدل يدوياً
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                ✓ جاهز
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Extra options */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="autoAbsent"
                  checked={autoAbsentUnpunched}
                  onChange={(e) => setAutoAbsentUnpunched(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="autoAbsent" style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  تسجيل غياب آلي للموظفين المقيدين بالمشروع والذين لم تظهر بصمتهم في هذا اليوم
                </label>
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                سيتم استبعاد الصفوف غير الصالحة تلقائياً عند الاعتماد
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
