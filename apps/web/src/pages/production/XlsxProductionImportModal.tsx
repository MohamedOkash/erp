import React, { useState } from 'react';
import { productionApi } from '../../api/production.api';
import type { ProductionImportUploadResponse } from '../../api/production.api';
import { Modal } from '../../components/Modal';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react';

interface XlsxProductionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const XlsxProductionImportModal: React.FC<XlsxProductionImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ProductionImportUploadResponse | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setImportResult(null);
      setCommitSuccess(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('يرجى اختيار ملف إكسيل (.xlsx)');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const res = await productionApi.uploadXlsx(file);
      setImportResult(res);
    } catch (err: any) {
      setError(err.message || 'فشل رفع ومعالجة ملف إنتاجية الإكسيل');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!importResult?.jobId) return;

    setIsCommitting(true);
    setError(null);
    try {
      const res = await productionApi.commitImport(importResult.jobId);
      setCommitSuccess(res.message || 'تم اعتماد وإدراج سجلات الإنتاج الصالحة بنجاح!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'فشل اعتماد سجلات الإنتاج');
    } finally {
      setIsCommitting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setImportResult(null);
    setCommitSuccess(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد سجلات الإنتاجية من ملف Excel (.xlsx)"
      icon={<FileSpreadsheet size={22} color="#10b981" />}
      maxWidth="2xl"
    >

        {/* Alerts */}
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

        {commitSuccess && (
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
            <span>{commitSuccess}</span>
          </div>
        )}

        {!importResult ? (
          /* Step 1: Upload Form */
          <form onSubmit={handleUpload}>
            <div
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                marginBottom: '1.5rem',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('xlsx-prod-upload-input')?.click()}
            >
              <UploadCloud size={48} color="#60a5fa" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {file ? file.name : 'اختر ملف سجلات الإنتاج (.xlsx) للرفع والمعاينة'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                يتم فحص المشاريع والبنود وتوزيع الكميات وتوليد تقرير مرحلي قبل الاعتماد النهائي
              </p>

              <input
                id="xlsx-prod-upload-input"
                type="file"
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!file || isUploading}
                style={{ gap: '0.5rem' }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <span>رفع ومعاينة الإنتاج</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 2 & 3: Staging Preview & Commit */
          <div>
            {/* Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                className="glass-card"
                style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(30, 41, 59, 0.6)' }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>الإجمالي</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{importResult.summary?.total || 0}</div>
              </div>

              <div
                className="glass-card"
                style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.15)' }}
              >
                <div style={{ fontSize: '0.75rem', color: '#34d399' }}>صالح للاعتماد</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#34d399' }}>
                  {importResult.summary?.valid || 0}
                </div>
              </div>

              <div
                className="glass-card"
                style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.15)' }}
              >
                <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>مكرر</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fbbf24' }}>
                  {importResult.summary?.duplicate || 0}
                </div>
              </div>

              <div
                className="glass-card"
                style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.15)' }}
              >
                <div style={{ fontSize: '0.75rem', color: '#f87171' }}>غير صالح</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f87171' }}>
                  {importResult.summary?.invalid || 0}
                </div>
              </div>
            </div>

            {/* Rows Preview Table */}
            {importResult.rows && importResult.rows.length > 0 && (
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>#</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>التاريخ</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>المشروع</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>البند</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>الكمية</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background:
                            r.status === 'valid'
                              ? 'transparent'
                              : r.status === 'duplicate'
                              ? 'rgba(245, 158, 11, 0.05)'
                              : 'rgba(239, 68, 68, 0.05)',
                        }}
                      >
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-dim)' }}>{r.rowIndex}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.date || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.project || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.workItem || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#60a5fa' }}>
                          {r.quantity}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          {r.status === 'valid' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              <Check size={11} /> صالح
                            </span>
                          ) : r.status === 'duplicate' ? (
                            <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                              <AlertTriangle size={11} /> مكرر
                            </span>
                          ) : (
                            <span
                              className="badge badge-accent"
                              style={{
                                fontSize: '0.7rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                              }}
                              title={r.errors?.join(', ')}
                            >
                              <AlertCircle size={11} /> غير صالح
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commit Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={resetAll}
                className="btn btn-secondary"
                style={{ gap: '0.4rem', fontSize: '0.85rem' }}
                disabled={isCommitting}
              >
                <RefreshCw size={14} />
                <span>رفع ملف آخر</span>
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isCommitting}>
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  className="btn btn-primary"
                  disabled={!importResult.summary || importResult.summary.valid === 0 || isCommitting}
                  style={{ gap: '0.5rem', background: '#059669' }}
                >
                  {isCommitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>اعتماد السجلات الصالحة ({importResult.summary?.valid || 0})</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </Modal>
  );
};
