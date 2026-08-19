import { ControlCardsService } from '../src/control-cards/control-cards.service';

describe('Cost Distribution Engine (SACODECO Logic)', () => {
  let service: ControlCardsService;

  beforeEach(() => {
    // Instantiate with mock database and company settings
    const mockDb: any = {};
    const mockSettings: any = {};
    service = new ControlCardsService(mockDb, mockSettings);
  });

  describe('Crew A Labor Distribution (2 Skilled + 1 Helper)', () => {
    it('should split helper wage 50/50 between the two skilled workers in split_to_skilled mode', () => {
      // Skilled 1 wage: 300 SAR, output: 25 m²
      // Skilled 2 wage: 250 SAR, output: 20 m²
      // Helper wage: 200 SAR (100 SAR allocated to each skilled)
      // Material price per unit: 15 SAR/m²
      const result = service.calculateLaborCostDistribution({
        crewType: 'A',
        costDistributionMode: 'split_to_skilled',
        skilled1Wage: 300,
        skilled2Wage: 250,
        helperWage: 200,
        skilled1Meters: 25,
        skilled2Meters: 20,
        materialPricePerUnit: 15,
      });

      expect(result.crewType).toBe('A');
      expect(result.costDistributionMode).toBe('split_to_skilled');
      expect(result.totalCrewDailyLabor).toBe(750); // 300 + 250 + 200
      expect(result.totalMeters).toBe(45); // 25 + 20
      expect(result.helperSharePerSkilled).toBe(100);

      // Skilled 1: total labor = 300 + 100 = 400 SAR. Unit labor cost = 400 / 25 = 16.00 SAR/m²
      expect(result.skilled1.totalLaborCost).toBe(400);
      expect(result.skilled1.unitLaborCost).toBe(16.00);
      expect(result.skilled1.totalUnitCostWithMaterial).toBe(31.00); // 16.00 + 15

      // Skilled 2: total labor = 250 + 100 = 350 SAR. Unit labor cost = 350 / 20 = 17.50 SAR/m²
      expect(result.skilled2.totalLaborCost).toBe(350);
      expect(result.skilled2.unitLaborCost).toBe(17.50);
      expect(result.skilled2.totalUnitCostWithMaterial).toBe(32.50); // 17.50 + 15

      // Combined average unit labor cost = 750 / 45 = 16.67 SAR/m²
      expect(result.averageUnitLaborCost).toBe(16.67);
      expect(result.combinedTotalUnitCost).toBe(31.67); // 16.67 + 15
    });

    it('should calculate direct attribution without splitting helper wage when mode is direct', () => {
      const result = service.calculateLaborCostDistribution({
        crewType: 'A',
        costDistributionMode: 'direct',
        skilled1Wage: 300,
        skilled2Wage: 250,
        helperWage: 200,
        skilled1Meters: 25,
        skilled2Meters: 20,
        materialPricePerUnit: 10,
      });

      expect(result.costDistributionMode).toBe('direct');
      expect(result.skilled1.allocatedHelperWage).toBe(0);
      expect(result.skilled1.totalLaborCost).toBe(300);
      expect(result.skilled1.unitLaborCost).toBe(12.00); // 300 / 25
      expect(result.skilled1.totalUnitCostWithMaterial).toBe(22.00);

      expect(result.skilled2.allocatedHelperWage).toBe(0);
      expect(result.skilled2.totalLaborCost).toBe(250);
      expect(result.skilled2.unitLaborCost).toBe(12.50); // 250 / 20
      expect(result.skilled2.totalUnitCostWithMaterial).toBe(22.50);
    });
  });

  describe('Crew B Labor Distribution (1 Skilled + 1 Helper)', () => {
    it('should attribute the entire helper wage with the single skilled craftsman', () => {
      // Skilled 1 wage: 300 SAR, output: 30 m²
      // Helper wage: 180 SAR
      // Material price per unit: 20 SAR/m²
      const result = service.calculateLaborCostDistribution({
        crewType: 'B',
        skilled1Wage: 300,
        helperWage: 180,
        skilled1Meters: 30,
        materialPricePerUnit: 20,
      });

      expect(result.crewType).toBe('B');
      expect(result.totalCrewDailyLabor).toBe(480); // 300 + 180
      expect(result.totalMeters).toBe(30);
      expect(result.skilled1.totalLaborCost).toBe(480);
      expect(result.skilled1.unitLaborCost).toBe(16.00); // 480 / 30
      expect(result.skilled1.totalUnitCostWithMaterial).toBe(36.00); // 16.00 + 20
    });
  });

  describe('Edge cases and zero handling', () => {
    it('should safely handle 0 output meters without division by zero errors', () => {
      const result = service.calculateLaborCostDistribution({
        crewType: 'A',
        skilled1Wage: 300,
        skilled2Wage: 250,
        helperWage: 200,
        skilled1Meters: 0,
        skilled2Meters: 0,
      });

      expect(result.skilled1.unitLaborCost).toBe(0);
      expect(result.skilled2.unitLaborCost).toBe(0);
      expect(result.averageUnitLaborCost).toBe(0);
    });
  });
});
