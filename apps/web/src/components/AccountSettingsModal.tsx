import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';
import {
  User,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Check,
} from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync user info on open
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setEmail((user as any).email || '');
      setPhone((user as any).phone || '');
      setProfileSuccess(null);
      setProfileError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(null);
      setPasswordError(null);
    }
  }, [isOpen, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileError('الاسم الكامل مطلوب');
      return;
    }
    if (!username.trim()) {
      setProfileError('اسم المستخدم مطلوب');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await authApi.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setProfileSuccess('تم تحديث البيانات الشخصية بنجاح.');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch (err: any) {
      setProfileError(
        err?.response?.data?.message || err?.message || 'فشل تحديث البيانات الشخصية',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('كلمة المرور الحالية مطلوبة');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('كلمة المرور الجديدة يجب أن تتكون من 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة غير متطابقة مع حقل التأكيد');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'WRONG_CURRENT_PASSWORD') {
        setPasswordError('كلمة المرور الحالية غير صحيحة');
      } else {
        setPasswordError(
          err?.response?.data?.message || err?.message || 'فشل تغيير كلمة المرور',
        );
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إعدادات الحساب الشخصي والأمان">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'profile' ? '#60a5fa' : 'var(--text-muted)',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={16} />
            <span>البيانات الشخصية والملف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === 'password' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'password' ? '#60a5fa' : 'var(--text-muted)',
              fontWeight: activeTab === 'password' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <KeyRound size={16} />
            <span>أمان الحساب وكلمة المرور</span>
          </button>
        </div>

        {/* TAB 1: Profile Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profileSuccess && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-success-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الاسم الكامل *</label>
                <input
                  type="text"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: م. فهد العتيبي"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">اسم المستخدم (Username) *</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: fahad_eng"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">رقم الهاتف</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                  />
                  <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            {/* Current Roles Info */}
            <div
              style={{
                padding: '0.85rem 1rem',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Shield size={16} color="#60a5fa" />
                <span style={{ color: 'var(--text-muted)' }}>الأدوار الوظيفية الحالية:</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(user?.roles || []).map((r, i) => (
                  <span key={i} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                    {typeof r === 'string' ? r : (r as any).roleName || (r as any).roleCode}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                إلغاء
              </button>
              <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ minWidth: '130px' }}>
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Password Change */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {passwordSuccess && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-success-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">كلمة المرور الحالية *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية للتأكيد"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">كلمة المرور الجديدة * (8+ أحرف)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <KeyRound size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">تأكيد كلمة المرور الجديدة *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <Check size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', pointerEvents: 'none' }} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل للحفاظ على أمان حسابك في النظام.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                إلغاء
              </button>
              <button type="submit" disabled={savingPassword} className="btn btn-primary" style={{ minWidth: '140px' }}>
                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                <span>تغيير كلمة المرور</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
