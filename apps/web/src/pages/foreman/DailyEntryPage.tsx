import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectsApi, type Project } from '../../api/projects.api';
import { workAreasApi, type WorkArea } from '../../api/work-areas.api';
import { workItemsApi, type WorkItem } from '../../api/work-items.api';
import { employeesApi, type Employee } from '../../api/employees.api';
import { crewsApi, type Crew } from '../../api/crews.api';
import { productionApi } from '../../api/production.api';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  HardHat,
  Users,
  MapPin,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Calculator,
  UserCheck,
  Building2,
  Home,
  Grid,
} from 'lucide-react';

export const DailyEntryPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();

  // Reference Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);

  // Step 1: Location Hierarchy Cascading State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [zones, setZones] = useState<WorkArea[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [floors, setFloors] = useState<WorkArea[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [rooms, setRooms] = useState<WorkArea[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Step 2 & 3: Crew Setup State
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [crewType, setCrewType] = useState<'A' | 'B'>('A');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');

  // Step 4: Worker assignments
  const [skilled1Id, setSkilled1Id] = useState<string>('');
  const [skilled2Id, setSkilled2Id] = useState<string>('');
  const [helperId, setHelperId] = useState<string>('');

  // Step 5: Work Item and Stage
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Step 6: Meters input per skilled worker
  const [skilled1Meters, setSkilled1Meters] = useState<number>(0);
  const [skilled2Meters, setSkilled2Meters] = useState<number>(0);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial global lookups
  useEffect(() => {
    const loadInit = async () => {
      setIsLoading(true);
      try {
        const [projRes, empRes, wiRes] = await Promise.all([
          projectsApi.getProjects({ limit: 100 }),
          employeesApi.getEmployees({ limit: 500, isActive: true }),
          workItemsApi.getWorkItems({ limit: 200, isActive: true }),
        ]);
        setProjects(projRes.data || []);
        setAllEmployees(empRes.data || []);
        setWorkItems(wiRes.data || []);

        if (projRes.data && projRes.data.length > 0) {
          setSelectedProjectId(projRes.data[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || t('auto.فشل_تحميل_البيانات_الأولية_3d3787'));
      } finally {
        setIsLoading(false);
      }
    };
    loadInit();
  }, []);

  // Load Crews and Root Work Areas (Zones) when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setZones([]);
      setCrews([]);
      return;
    }
    const loadProjectDependencies = async () => {
      try {
        const [zonesRes, crewsRes] = await Promise.all([
          workAreasApi.list({ projectId: selectedProjectId, parentId: 'null', limit: 100 }),
          crewsApi.getCrews({ projectId: selectedProjectId }),
        ]);
        setZones(zonesRes.data || []);
        setCrews(crewsRes.data || []);
        setSelectedZoneId('');
        setSelectedFloorId('');
        setSelectedRoomId('');
        setSelectedCrewId('');
      } catch (err) {
        // ignore
      }
    };
    loadProjectDependencies();
  }, [selectedProjectId]);

  // Load Floors when Zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setFloors([]);
      setSelectedFloorId('');
      setSelectedRoomId('');
      return;
    }
    const loadFloors = async () => {
      try {
        const res = await workAreasApi.list({
          projectId: selectedProjectId,
          parentId: selectedZoneId,
          limit: 100,
        });
        setFloors(res.data || []);
        setSelectedFloorId('');
        setSelectedRoomId('');
      } catch {
        // ignore
      }
    };
    loadFloors();
  }, [selectedZoneId, selectedProjectId]);

  // Load Rooms when Floor changes
  useEffect(() => {
    if (!selectedFloorId) {
      setRooms([]);
      setSelectedRoomId('');
      return;
    }
    const loadRooms = async () => {
      try {
        const res = await workAreasApi.list({
          projectId: selectedProjectId,
          parentId: selectedFloorId,
          limit: 100,
        });
        setRooms(res.data || []);
        setSelectedRoomId('');
      } catch {
        // ignore
      }
    };
    loadRooms();
  }, [selectedFloorId, selectedProjectId]);

  // Filter crews by chosen crewType
  const filteredCrews = useMemo(() => {
    return crews.filter((c) => c.crew_type === crewType && c.is_active);
  }, [crews, crewType]);

  // Auto-fill workers when a crew is selected
  useEffect(() => {
    if (!selectedCrewId) return;
    const crew = crews.find((c) => c.id === selectedCrewId);
    if (crew && crew.members) {
      const s1 = crew.members.find((m) => m.role === 'skilled_1');
      const s2 = crew.members.find((m) => m.role === 'skilled_2');
      const h = crew.members.find((m) => m.role === 'helper');
      if (s1) setSkilled1Id(s1.employeeId);
      if (s2) setSkilled2Id(s2.employeeId);
      if (h) setHelperId(h.employeeId);
    }
  }, [selectedCrewId, crews]);

  // Find worker employee objects
  const skilled1Emp = useMemo(() => allEmployees.find((e) => e.id === skilled1Id), [allEmployees, skilled1Id]);
  const skilled2Emp = useMemo(() => allEmployees.find((e) => e.id === skilled2Id), [allEmployees, skilled2Id]);
  const helperEmp = useMemo(() => allEmployees.find((e) => e.id === helperId), [allEmployees, helperId]);

  // Work item & stage
  const selectedWorkItem = useMemo(() => workItems.find((w) => w.id === selectedWorkItemId), [workItems, selectedWorkItemId]);
  const selectedStage = useMemo(() => {
    if (!selectedWorkItem?.stages) return null;
    return selectedWorkItem.stages.find((s) => s.id === selectedStageId);
  }, [selectedWorkItem, selectedStageId]);

  // Calculations
  const totalMeters = useMemo(() => {
    if (crewType === 'A') {
      return Number(skilled1Meters || 0) + Number(skilled2Meters || 0);
    }
    return Number(skilled1Meters || 0);
  }, [crewType, skilled1Meters, skilled2Meters]);

  const stagePercentage = Number(selectedStage?.percentage || 100);
  const equivalentMeters = useMemo(() => {
    return (totalMeters * stagePercentage) / 100;
  }, [totalMeters, stagePercentage]);

  const estimatedLaborCost = useMemo(() => {
    const s1Wage = Number(skilled1Emp?.dailyWage || 0);
    const s2Wage = crewType === 'A' ? Number(skilled2Emp?.dailyWage || 0) : 0;
    const hWage = Number(helperEmp?.dailyWage || 0);
    return s1Wage + s2Wage + hWage;
  }, [crewType, skilled1Emp, skilled2Emp, helperEmp]);

  // Submit Handler
  const handleSubmit = async (addAnother: boolean = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedProjectId) {
      setErrorMsg(t('auto.يرجى_اختيار_المشروع_1370d6'));
      return;
    }
    if (!selectedWorkItemId) {
      setErrorMsg(t('auto.يرجى_اختيار_البند_33a930'));
      return;
    }
    if (!skilled1Id) {
      setErrorMsg(t('auto.يرجى_تحديد_المعلم_الأساسي_معلم_3c8f97'));
      return;
    }
    if (crewType === 'A' && !skilled2Id) {
      setErrorMsg(t('auto.طاقم_A_يتطلب_تحديد_المعلم_الثا_3b8cec'));
      return;
    }

    const project = projects.find((p) => p.id === selectedProjectId);
    const branchId = project?.branchId || '00000000-0000-0000-0001-000000000001';

    const workersPayload = [];
    if (skilled1Id) {
      workersPayload.push({
        employeeId: skilled1Id,
        individualQuantity: Number(skilled1Meters || 0),
        workerType: 'team' as const,
        hoursWorked: 8,
      });
    }
    if (crewType === 'A' && skilled2Id) {
      workersPayload.push({
        employeeId: skilled2Id,
        individualQuantity: Number(skilled2Meters || 0),
        workerType: 'team' as const,
        hoursWorked: 8,
      });
    }
    if (helperId) {
      workersPayload.push({
        employeeId: helperId,
        individualQuantity: 0,
        workerType: 'team' as const,
        hoursWorked: 8,
      });
    }

    const payload = {
      date: entryDate,
      branchId,
      projectId: selectedProjectId,
      workAreaId: selectedRoomId || selectedFloorId || selectedZoneId || undefined,
      workItemId: selectedWorkItemId,
      workItemStageId: selectedStageId || undefined,
      supervisorId: user?.id || '00000000-0000-0000-0002-000000000001',
      crewId: selectedCrewId || undefined,
      foremanId: user?.id,
      actualQuantity: totalMeters,
      targetQuantity: Number(selectedStage?.standard_productivity || 0),
      productionType: 'team' as const,
      teamCode: crews.find((c) => c.id === selectedCrewId)?.code || `Crew-${crewType}`,
      workers: workersPayload,
    };

    setIsSubmitting(true);
    try {
      await productionApi.createProductionRecord(payload);
      setSuccessMsg(t('auto.تم_حفظ_قيد_الإنتاجية_بنجاح_وإر_116172'));

      if (addAnother) {
        // Keep location and crew, reset item and meters
        setSelectedWorkItemId('');
        setSelectedStageId('');
        setSkilled1Meters(0);
        setSkilled2Meters(0);
      } else {
        // Reset full form
        setSkilled1Meters(0);
        setSkilled2Meters(0);
        setSelectedWorkItemId('');
        setSelectedStageId('');
      }
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || t('auto.فشل_حفظ_قيد_الإنتاجية_c22964'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-amber-500), var(--color-amber-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-amber)',
              color: '#fff',
            }}
          >
            <HardHat size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
              {t('auto.الإدخال_اليومي_لإنتاجية_الطواق_791bd6')}</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              {t('auto.منظومة_تسجيل_إنتاجية_الأطقم_ال_33c4de')}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {isLoading && <Loader2 size={20} className="animate-spin" color="var(--color-amber-500)" />}
          <div style={{ minWidth: '160px' }}>
            <WheelDatePicker value={entryDate} onChange={setEntryDate} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#f87171',
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#34d399',
          }}
        >
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        {/* Main Entry Flow (6 Steps) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Step 1: Location Hierarchy */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <MapPin size={18} color="var(--color-amber-500)" />
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>{t('auto.1_تحديد_موقع_العمل_المتسلسل_5c7903')}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  <Building2 size={14} /> {t('auto.المشروع_58a8d8')}</label>
                <select className="input-field" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  <Grid size={14} /> {t('auto.المنطقة_المبنى_Zone_7ca915')}</label>
                <select className="input-field" value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
                  <option value="">{t('auto.اختر_المنطقة_3f7b4b')}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  <Layers size={14} /> {t('auto.الطابق_Floor_5aa1e7')}</label>
                <select className="input-field" value={selectedFloorId} onChange={(e) => setSelectedFloorId(e.target.value)} disabled={!selectedZoneId}>
                  <option value="">{t('auto.اختر_الطابق_1745a7')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  <Home size={14} /> {t('auto.الغرفة_الجناح_Room_e88a01')}</label>
                <select className="input-field" value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} disabled={!selectedFloorId}>
                  <option value="">{t('auto.اختر_الغرفة_37a242')}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2 & 3: Crew Setup */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={18} color="var(--color-teal-500)" />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>{t('auto.2_3_تكوين_الطاقم_وتحديده_5024a2')}</h3>
              </div>

              {/* Crew Type Toggle */}
              <div style={{ display: 'flex', background: 'var(--glass-light)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCrewType('A');
                    setSelectedCrewId('');
                  }}
                  style={{
                    padding: '4px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: crewType === 'A' ? 'var(--color-amber-500)' : 'transparent',
                    color: crewType === 'A' ? '#000' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t('auto.Crew_A_معلمان_مساعد_5e16c7')}</button>
                <button
                  type="button"
                  onClick={() => {
                    setCrewType('B');
                    setSelectedCrewId('');
                  }}
                  style={{
                    padding: '4px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: crewType === 'B' ? 'var(--color-amber-500)' : 'transparent',
                    color: crewType === 'B' ? '#000' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t('auto.Crew_B_معلم_مساعد_138fe0')}</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.رقم_كود_الطاقم_المسجل_41fb0f')}</label>
                <select className="input-field" value={selectedCrewId} onChange={(e) => setSelectedCrewId(e.target.value)}>
                  <option value="">{t('auto.اختيار_من_الطواقم_المسجلة_4cc592')}</option>
                  {filteredCrews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.crew_type === 'A' ? 'Crew A' : 'Crew B'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>{t('auto.يتم_جلب_وتوزيع_الكوادر_آليا_بم_5e3370')}</span>
              </div>
            </div>
          </div>

          {/* Step 4: Worker Columns */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <UserCheck size={18} color="var(--color-violet-500)" />
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>{t('auto.4_الكوادر_الميدانية_المكلفة_1b929b')}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: crewType === 'A' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
              {/* Skilled 1 */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--glass-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-blue-400)', marginBottom: 'var(--space-2)' }}>
                  {t('auto.المعلم_الأساسي_معلم_1_20ea80')}</div>
                <select className="input-field" value={skilled1Id} onChange={(e) => setSkilled1Id(e.target.value)}>
                  <option value="">{t('auto.اختيار_المعلم_1_188529')}</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.companyEmployeeId ? `[${emp.companyEmployeeId}] ` : ''}
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                {skilled1Emp && (
                  <div style={{ marginTop: 'var(--space-2)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>{t('auto.المهنة_7f2006')}{skilled1Emp.role}</div>
                    <div>{t('auto.الأجر_اليومي_7d17ee')}{skilled1Emp.dailyWage} SAR</div>
                  </div>
                )}
              </div>

              {/* Skilled 2 (Only if Crew A) */}
              {crewType === 'A' && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--glass-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-violet-500)', marginBottom: 'var(--space-2)' }}>
                    {t('auto.المعلم_المساعد_معلم_2_3f50fe')}</div>
                  <select className="input-field" value={skilled2Id} onChange={(e) => setSkilled2Id(e.target.value)}>
                    <option value="">{t('auto.اختيار_المعلم_2_18859d')}</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.companyEmployeeId ? `[${emp.companyEmployeeId}] ` : ''}
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                  {skilled2Emp && (
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <div>{t('auto.المهنة_7f2006')}{skilled2Emp.role}</div>
                      <div>{t('auto.الأجر_اليومي_7d17ee')}{skilled2Emp.dailyWage} SAR</div>
                    </div>
                  )}
                </div>
              )}

              {/* Helper */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--glass-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-amber-500)', marginBottom: 'var(--space-2)' }}>
                  {t('auto.العامل_المساعد_Helper_6ce668')}</div>
                <select className="input-field" value={helperId} onChange={(e) => setHelperId(e.target.value)}>
                  <option value="">{t('auto.اختيار_المساعد_53398b')}</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.companyEmployeeId ? `[${emp.companyEmployeeId}] ` : ''}
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                {helperEmp && (
                  <div style={{ marginTop: 'var(--space-2)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>{t('auto.المهنة_7f2006')}{helperEmp.role}</div>
                    <div>{t('auto.الأجر_اليومي_7d17ee')}{helperEmp.dailyWage} {t('auto.SAR_يوزع_نصفين_3858cc')}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 5 & 6: Work Item, Stage & Meter Inputs */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <Layers size={18} color="var(--color-emerald-500)" />
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>{t('auto.5_6_البند_ومراحل_التنفيذ_والأم_61b799')}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.بند_العمل_الميداني_e26d8b')}</label>
                <select className="input-field" value={selectedWorkItemId} onChange={(e) => {
                  setSelectedWorkItemId(e.target.value);
                  setSelectedStageId('');
                }}>
                  <option value="">{t('auto.اختيار_بند_العمل_2337b6')}</option>
                  {workItems.map((wi) => (
                    <option key={wi.id} value={wi.id}>
                      [{wi.code}] {wi.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.المرحلة_التنفيذية_Stage_2bb031')}</label>
                <select
                  className="input-field"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  disabled={!selectedWorkItem?.stages || selectedWorkItem.stages.length === 0}
                >
                  <option value="">{t('auto.كامل_البند_100_2b1eb9')}</option>
                  {selectedWorkItem?.stages?.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.percentage}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Meters Input Per Skilled Worker */}
            <div style={{ display: 'grid', gridTemplateColumns: crewType === 'A' ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  {t('auto.أمتار_المعلم_1_1a988b')}{skilled1Emp?.name || t('auto.معلم_1_d730ee')})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.00"
                  className="input-field"
                  value={skilled1Meters || ''}
                  onChange={(e) => setSkilled1Meters(Number(e.target.value))}
                />
              </div>

              {crewType === 'A' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    {t('auto.أمتار_المعلم_2_1a988f')}{skilled2Emp?.name || t('auto.معلم_2_d730ee')})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.00"
                    className="input-field"
                    value={skilled2Meters || ''}
                    onChange={(e) => setSkilled2Meters(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <Plus size={16} />
              <span>{t('auto.حفظ_وإضافة_بند_آخر_لنفس_الطاقم_6ce972')}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: '160px' }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>{t('auto.حفظ_واعتماد_اليومية_55a091')}</span>
            </button>
          </div>
        </div>

        {/* Live Calculation Summary Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card" style={{ padding: 'var(--space-5)', position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <Calculator size={20} color="var(--color-amber-500)" />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>{t('auto.المعادلات_والحسابات_الفورية_106b22')}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Total Meters */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('auto.مجموع_الأمتار_المنفذة_35950f')}</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{totalMeters.toFixed(2)} {t('auto.م_c30d')}</span>
              </div>

              {/* Stage Weight */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('auto.الوزن_النسبي_للمرحلة_6b8152')}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-teal-500)' }}>{stagePercentage}%</span>
              </div>

              {/* Equivalent Meters */}
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(13, 148, 136, 0.05))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--color-teal-600)', fontWeight: 600 }}>{t('auto.الأمتار_المكافئة_المعتمدة_25aee4')}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2dd4bf', marginTop: '2px' }}>
                  {equivalentMeters.toFixed(2)} <span style={{ fontSize: '13px' }}>{t('auto.م_مكافئ_5f477b')}</span>
                </div>
              </div>

              {/* Estimated Labor Cost */}
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--color-amber-600)', fontWeight: 600 }}>{t('auto.إجمالي_أجور_الطاقم_المقدرة_252524')}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-amber-500)', marginTop: '2px' }}>
                  {estimatedLaborCost.toFixed(2)} <span style={{ fontSize: '13px' }}>SAR</span>
                </div>
                {crewType === 'A' && helperEmp && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {t('auto.نصف_أجر_المساعد_69259e')}{((Number(helperEmp.dailyWage || 0)) / 2).toFixed(1)} {t('auto.SAR_مضاف_لكل_معلم_569070')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
