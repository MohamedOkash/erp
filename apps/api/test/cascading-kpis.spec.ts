import { Test, TestingModule } from '@nestjs/testing';
import { KpisService } from '../src/kpis/kpis.service';
import { DatabaseService } from '../src/database/database.service';

describe('Cascading KPIs Engine (SACODECO Protocol)', () => {
  let kpisService: KpisService;
  let mockDbService: any;

  beforeEach(async () => {
    mockDbService = {
      withTenantClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpisService,
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    kpisService = module.get<KpisService>(KpisService);
  });

  it('should calculate individual worker KPI, helper average KPI, foreman and engineer cascades accurately', async () => {
    const mockCompanyId = '00000000-0000-0000-0001-000000000001';
    const mockProductionRow = {
      record_id: 'rec-01',
      project_id: 'proj-01',
      project_name: 'مشروع أبراج النرجس',
      production_date: '2026-08-19',
      record_status: 'approved',
      crew_id: 'crew-01',
      crew_code: 'CRW-PLASTER-01',
      crew_type: 'A',
      crew_number: '101',
      template_name: 'طاقم أ (Crew A)',
      foreman_id: 'foreman-01',
      foreman_name: 'أبو أحمد (مراقب)',
      engineer_approved_by: 'eng-01',
      engineer_name: 'م. فهد القرشي',
      work_area_id: 'room-101',
      work_area_name: 'غرفة نوم رئيسية 101',
      room_area_m2: 24.5,
      work_item_id: 'item-01',
      work_item_name: 'لياسة داخلية ناعمة',
      work_item_code: 'PLST-01',
      work_item_stage_id: 'stage-01',
      stage_name: 'طرطشة وبؤج وأوتار',
      standard_daily_target: '8.00',
      stage_weight_pct: 100,
      workers: [
        {
          workerId: 'w-01',
          employeeId: 'emp-01',
          employeeName: 'معلم حسن (لياس)',
          profession: 'لياس',
          companyEmployeeId: 'EMP-001',
          roleInCrew: 'skilled_1',
          actualQuantity: 8.0, // 8 / 8 = 100% (Green)
          hoursWorked: 8,
          overtimeHours: 0,
          hourlyRate: 28,
        },
        {
          workerId: 'w-02',
          employeeId: 'emp-02',
          employeeName: 'معلم إبراهيم (لياس)',
          profession: 'لياس',
          companyEmployeeId: 'EMP-002',
          roleInCrew: 'skilled_2',
          actualQuantity: 6.0, // 6 / 8 = 75% (Red)
          hoursWorked: 8,
          overtimeHours: 0,
          hourlyRate: 28,
        },
        {
          workerId: 'w-03',
          employeeId: 'emp-03',
          employeeName: 'عامل رفيق (مساعد)',
          profession: 'مساعد',
          companyEmployeeId: 'EMP-003',
          roleInCrew: 'helper',
          actualQuantity: 0, // Helper logs no independent meters
          hoursWorked: 8,
          overtimeHours: 0,
          hourlyRate: 20,
        },
      ],
    };

    mockDbService.withTenantClient.mockImplementation(async (companyId: string, cb: any) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [mockProductionRow],
        }),
      };
      return cb(mockClient);
    });

    const result = await kpisService.getCascadeKpis(mockCompanyId, { projectId: 'proj-01' });

    expect(result).toBeDefined();
    expect(result.summary.totalEvaluatedWorkers).toBe(3);

    // 1. Check Skilled Worker 1 (8m / 8m target = 100%)
    const skilled1 = result.workers.find((w: any) => w.employeeId === 'emp-01');
    expect(skilled1).toBeDefined();
    expect(skilled1.actualQuantity).toBe(8.0);
    expect(skilled1.efficiencyPct).toBe(100);
    expect(skilled1.status).toBe('excellent');
    expect(skilled1.color).toBe('#10b981'); // Green

    // 2. Check Skilled Worker 2 (6m / 8m target = 75%)
    const skilled2 = result.workers.find((w: any) => w.employeeId === 'emp-02');
    expect(skilled2).toBeDefined();
    expect(skilled2.actualQuantity).toBe(6.0);
    expect(skilled2.efficiencyPct).toBe(75);
    expect(skilled2.status).toBe('poor');
    expect(skilled2.color).toBe('#ef4444'); // Red

    // 3. Check Helper (Average of 100% and 75% = 87.5% yellow)
    const helper = result.workers.find((w: any) => w.employeeId === 'emp-03');
    expect(helper).toBeDefined();
    expect(helper.actualQuantity).toBeNull(); // No independent meters
    expect(helper.efficiencyPct).toBe(87.5);
    expect(helper.status).toBe('good');
    expect(helper.color).toBe('#f59e0b'); // Yellow

    // 4. Check Foreman (Average of Crew = 87.5%)
    expect(result.foremen).toHaveLength(1);
    expect(result.foremen[0].name).toBe('أبو أحمد (مراقب)');
    expect(result.foremen[0].efficiencyPct).toBe(87.5);
    expect(result.foremen[0].status).toBe('good');

    // 5. Check Engineer (Average of Foremen = 87.5%)
    expect(result.engineers).toHaveLength(1);
    expect(result.engineers[0].name).toBe('م. فهد القرشي');
    expect(result.engineers[0].efficiencyPct).toBe(87.5);
  });
});
