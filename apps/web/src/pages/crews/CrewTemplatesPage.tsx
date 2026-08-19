import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { crewsApi } from '../../api/crews.api';
import type { CrewTemplate } from '../../api/crews.api';

export const CrewTemplatesPage: React.FC = () => {
  const { t } = useI18n();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">⚙️</span>
            {t('crews.templates_title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('crews.templates_subtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-xl text-sm hover:bg-amber-400 transition-all shadow-sm flex items-center gap-2"
        >
          ➕ {t('crews.add_template')}
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            {t('common.no_data')}
          </div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/60 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-muted text-foreground">
                    {tpl.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">
                    {tpl.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">{tpl.name}</h3>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {tpl.description || t('crews.no_description')}
                </p>
              </div>

              {/* Composition badge */}
              <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                  <div className="text-[11px] text-muted-foreground">{t('crews.skilled_count')}</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{tpl.skilled_count}</div>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                  <div className="text-[11px] text-muted-foreground">{t('crews.unskilled_count')}</div>
                  <div className="text-lg font-bold text-amber-500 mt-0.5">{tpl.unskilled_count}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for creating template */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center p-4 overflow-y-auto"
          style={{ alignItems: 'flex-start' }}
        >
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {t('crews.create_template_modal_title')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {t('crews.template_name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Template Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {t('crews.template_code')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="CREW_01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('crews.skilled_count')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={skilledCount}
                    onChange={(e) => setSkilledCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('crews.unskilled_count')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={unskilledCount}
                    onChange={(e) => setUnskilledCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {t('common.notes')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm hover:bg-muted/80 font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 text-black font-semibold rounded-xl text-sm hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
