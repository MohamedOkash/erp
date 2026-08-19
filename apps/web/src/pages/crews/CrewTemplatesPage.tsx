import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { crewsApi } from '../../api/crews.api';
import type { CrewTemplate } from '../../api/crews.api';
import { Modal } from '../../components/Modal';
import { Settings, Plus, Users, Loader2 } from 'lucide-react';

export const CrewTemplatesPage: React.FC = () => {
  const { t, language } = useI18n();
  const [templates, setTemplates] = useState<CrewTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [skilledCount, setSkilledCount] = useState<number>(1);
  const [unskilledCount, setUnskilledCount] = useState<number>(1);
  const [description, setDescription] = useState<string>('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await crewsApi.getTemplates();
      setTemplates(res.data || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await crewsApi.createTemplate({
        name,
        code,
        skilledCount,
        unskilledCount,
        description,
      });
      setShowModal(false);
      setName('');
      setCode('');
      setSkilledCount(1);
      setUnskilledCount(1);
      setDescription('');
      fetchTemplates();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-heading)' }}>
            <Settings size={26} color="#f59e0b" />
            <span>{t('crews.templates_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {t('crews.templates_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ gap: '0.5rem', background: '#f59e0b', color: '#000' }}
        >
          <Plus size={16} />
          <span>{t('crews.add_template')}</span>
        </button>
      </div>

      {/* Grid of Templates (Responsive: 1 col on mobile, 2 on tablet, 3 on desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <p>{t('common.loading')}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p>{t('common.no_data')}</p>
          </div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}>
                    {tpl.code}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: tpl.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: tpl.is_active ? '#10b981' : '#ef4444',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {tpl.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                  {language === 'en' ? (tpl.name_en || tpl.name) : language === 'ur' ? (tpl.name_ur || tpl.name) : tpl.name}
                </h3>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {(language === 'en' ? (tpl.description_en || tpl.description) : language === 'ur' ? (tpl.description_ur || tpl.description) : tpl.description) || t('crews.no_description')}
                </p>
              </div>

              {/* Composition badge */}
              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('crews.skilled_count')}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '0.2rem' }}>{tpl.skilled_count}</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('crews.unskilled_count')}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>{tpl.unskilled_count}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for creating template using standardized Modal component */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('crews.create_template_modal_title')}
        icon={<Settings size={22} color="#f59e0b" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="create-template-form"
              className="btn btn-primary"
              style={{ background: '#f59e0b', color: '#000' }}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{submitting ? t('common.saving') : t('common.save')}</span>
            </button>
          </div>
        }
      >
        <form id="create-template-form" onSubmit={handleCreate}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('crews.template_name')} *</label>
              <input
                type="text"
                required
                placeholder="Template Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('crews.template_code')} *</label>
              <input
                type="text"
                required
                placeholder="CREW_01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('crews.skilled_count')}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={skilledCount}
                  onChange={(e) => setSkilledCount(parseInt(e.target.value) || 1)}
                  className="input-field"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('crews.unskilled_count')}</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  required
                  value={unskilledCount}
                  onChange={(e) => setUnskilledCount(parseInt(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
