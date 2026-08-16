import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DatabaseService } from '../database/database.service';
import { AttendancePoliciesService } from '../attendance-policies/attendance-policies.service';
import {
  ImportSummary,
  ImportUploadResponseDto,
  StagingRowResponse,
} from './dto/upload-response.dto';

@Injectable()
export class ImportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly attendancePoliciesService: AttendancePoliciesService,
  ) {}

  /**
   * Upload & stage employees XLSX file without directly writing to employees table
   * Section 7 Item 2 of HANDOFF.md
   */
  async uploadEmployeesXlsx(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<ImportUploadResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerVal = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!headerVal) return;

      if (['name', 'الاسم', 'اسم', 'اسم الموظف', 'fullname'].includes(headerVal)) {
        colMap['name'] = colNumber;
      } else if (
        [
          'identity',
          'قومي',
          'هوية',
          'الرقم القومي',
          'رقم قومي',
          'nationalid',
          'national_id',
          'id_number',
        ].includes(headerVal)
      ) {
        colMap['nationalId'] = colNumber;
      } else if (['phone', 'هاتف', 'موبايل', 'تليفون', 'mobile'].includes(headerVal)) {
        colMap['phone'] = colNumber;
      } else if (
        ['branch', 'فرع', 'الفرع', 'primarybranch', 'branch_name'].includes(headerVal)
      ) {
        colMap['branch'] = colNumber;
      } else if (
        ['wage', 'أجر', 'الاجر', 'الأجر', 'dailywage', 'daily_wage', 'راتب'].includes(
          headerVal,
        )
      ) {
        colMap['wage'] = colNumber;
      }
    });

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch branches for matching
      const branchesRes = await client.query(
        `SELECT id, name, code FROM branches WHERE company_id = $1`,
        [companyId],
      );
      const branchMap = new Map<string, string>();
      for (const b of branchesRes.rows) {
        branchMap.set(b.name.trim().toLowerCase(), b.id);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b.id);
      }

      // 2. Fetch existing national IDs to detect DB duplicates
      const existingRes = await client.query(
        `SELECT identity_number AS national_id FROM employees WHERE company_id = $1`,
        [companyId],
      );
      const dbNationalIds = new Set<string>(
        existingRes.rows.map((r) => r.national_id.trim()),
      );

      const seenFileNationalIds = new Set<string>();
      const parsedRows: StagingRowResponse[] = [];
      const rowDbRecords: any[] = [];

      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const nameVal = colMap['name'] ? row.getCell(colMap['name']).text?.trim() : null;
        const nationalIdVal = colMap['nationalId']
          ? row.getCell(colMap['nationalId']).text?.trim()
          : null;
        const phoneVal = colMap['phone'] ? row.getCell(colMap['phone']).text?.trim() : null;
        const branchVal = colMap['branch']
          ? row.getCell(colMap['branch']).text?.trim()
          : null;
        const wageVal = colMap['wage'] ? row.getCell(colMap['wage']).value : 0;

        // Skip completely empty rows
        if (!nameVal && !nationalIdVal && !phoneVal && !branchVal) {
          continue;
        }

        const wageNum = parseFloat(String(wageVal || '0')) || 0;
        const errors: string[] = [];
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // Check required fields
        if (!nameVal || !nationalIdVal) {
          status = 'invalid';
          if (!nameVal) errors.push('اسم الموظف حقل إلزامي');
          if (!nationalIdVal) errors.push('الرقم القومي حقل إلزامي');
        } else if (dbNationalIds.has(nationalIdVal)) {
          status = 'duplicate';
          errors.push('الرقم القومي مكرر في قاعدة البيانات');
        } else if (seenFileNationalIds.has(nationalIdVal)) {
          status = 'duplicate';
          errors.push('الرقم القومي مكرر داخل نفس الملف');
        } else {
          status = 'valid';
          seenFileNationalIds.add(nationalIdVal);
        }

        let primaryBranchId: string | null = null;
        if (branchVal) {
          primaryBranchId = branchMap.get(branchVal.toLowerCase()) || null;
        }

        const parsedData = {
          name: nameVal || null,
          nationalId: nationalIdVal || null,
          phone: phoneVal || null,
          branch: branchVal || null,
          primaryBranchId,
          wage: wageNum,
          roleType: 'worker',
        };

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        parsedRows.push({
          rowIndex: r,
          name: parsedData.name,
          nationalId: parsedData.nationalId,
          phone: parsedData.phone,
          branch: parsedData.branch,
          wage: parsedData.wage,
          status,
          errors,
        });

        rowDbRecords.push({
          rowIndex: r,
          rawData,
          parsedData,
          dbStatus: status === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.status === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // 3. Create record in import_jobs (status = 'staged')
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'employees', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'employees.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // 4. Insert staging rows & row errors
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;

        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_IDENTITY'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'nationalId', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        rows: parsedRows,
      };
    });
  }

  /**
   * Upload & stage daily production XLSX file
   * Section 7 Item 2 of HANDOFF.md
   */
  async uploadProductionXlsx(
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerVal = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!headerVal) return;

      if (['date', 'التاريخ', 'تاريخ', 'production_date'].includes(headerVal)) {
        colMap['date'] = colNumber;
      } else if (['branch', 'الفرع', 'فرع', 'branch_name'].includes(headerVal)) {
        colMap['branch'] = colNumber;
      } else if (['project', 'المشروع', 'مشروع', 'project_name'].includes(headerVal)) {
        colMap['project'] = colNumber;
      } else if (['area', 'المنطقة', 'منطقة', 'work_area', 'work_area_name'].includes(headerVal)) {
        colMap['area'] = colNumber;
      } else if (['item', 'البند', 'بند', 'work_item', 'work_item_name'].includes(headerVal)) {
        colMap['item'] = colNumber;
      } else if (['target', 'المستهدف', 'مستهدف', 'target_quantity'].includes(headerVal)) {
        colMap['target'] = colNumber;
      } else if (['actual', 'الفعلي', 'فعلي', 'actual_quantity'].includes(headerVal)) {
        colMap['actual'] = colNumber;
      } else if (['type', 'النوع', 'نوع الإنتاج', 'production_type'].includes(headerVal)) {
        colMap['type'] = colNumber;
      } else if (['team_code', 'كود_الفريق', 'كود الفريق', 'فريق'].includes(headerVal)) {
        colMap['teamCode'] = colNumber;
      }
    });

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch DB entities for FK matching
      const branchesRes = await client.query(
        `SELECT id, name, code FROM branches WHERE company_id = $1`,
        [companyId],
      );
      const branchMap = new Map<string, string>();
      for (const b of branchesRes.rows) {
        branchMap.set(b.name.trim().toLowerCase(), b.id);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b.id);
      }

      const projectsRes = await client.query(
        `SELECT id, name, code, branch_id FROM projects WHERE company_id = $1`,
        [companyId],
      );
      const projectMap = new Map<string, { id: string; branchId: string }>();
      for (const p of projectsRes.rows) {
        projectMap.set(p.name.trim().toLowerCase(), { id: p.id, branchId: p.branch_id });
        if (p.code) projectMap.set(p.code.trim().toLowerCase(), { id: p.id, branchId: p.branch_id });
      }

      const itemsRes = await client.query(
        `SELECT id, name, code FROM work_items WHERE company_id = $1`,
        [companyId],
      );
      const itemMap = new Map<string, string>();
      for (const it of itemsRes.rows) {
        itemMap.set(it.name.trim().toLowerCase(), it.id);
        if (it.code) itemMap.set(it.code.trim().toLowerCase(), it.id);
      }

      const areasRes = await client.query(
        `SELECT id, name, code, project_id FROM work_areas WHERE company_id = $1`,
        [companyId],
      );
      const areaMap = new Map<string, { id: string; projectId: string }>();
      for (const a of areasRes.rows) {
        areaMap.set(`${a.project_id}_${a.name.trim().toLowerCase()}`, { id: a.id, projectId: a.project_id });
        if (a.code) areaMap.set(`${a.project_id}_${a.code.trim().toLowerCase()}`, { id: a.id, projectId: a.project_id });
      }

      // Default active supervisor for company
      const supervisorRes = await client.query(
        `SELECT id FROM employees
         WHERE company_id = $1 AND role_type = 'supervisor' AND is_active = true
         ORDER BY created_at ASC LIMIT 1`,
        [companyId],
      );
      let defaultSupervisorId: string | null = supervisorRes.rows.length > 0 ? supervisorRes.rows[0].id : null;
      if (!defaultSupervisorId) {
        const anyEmp = await client.query(
          `SELECT id FROM employees WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        defaultSupervisorId = anyEmp.rows.length > 0 ? anyEmp.rows[0].id : null;
      }

      // Fetch existing production records for DB duplicate detection
      const existingProdRes = await client.query(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date, branch_id, project_id, work_item_id,
                COALESCE(work_area_id::text, '') AS work_area_id,
                COALESCE(team_code, '') AS team_code
         FROM production_records
         WHERE company_id = $1 AND status NOT IN ('rejected', 'cancelled')`,
        [companyId],
      );
      const dbProdKeys = new Set<string>();
      for (const ep of existingProdRes.rows) {
        dbProdKeys.add(`${ep.date}|${ep.branch_id}|${ep.project_id}|${ep.work_item_id}|${ep.work_area_id}|${ep.team_code}`);
      }

      const seenFileProdKeys = new Set<string>();
      const parsedRows: any[] = [];
      const rowDbRecords: any[] = [];

      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const dateVal = colMap['date'] ? row.getCell(colMap['date']).text?.trim() : null;
        const branchVal = colMap['branch'] ? row.getCell(colMap['branch']).text?.trim() : null;
        const projectVal = colMap['project'] ? row.getCell(colMap['project']).text?.trim() : null;
        const areaVal = colMap['area'] ? row.getCell(colMap['area']).text?.trim() : null;
        const itemVal = colMap['item'] ? row.getCell(colMap['item']).text?.trim() : null;
        const targetVal = colMap['target'] ? row.getCell(colMap['target']).value : 0;
        const actualVal = colMap['actual'] ? row.getCell(colMap['actual']).value : null;
        const typeVal = colMap['type'] ? row.getCell(colMap['type']).text?.trim().toLowerCase() : 'individual';
        const teamCodeVal = colMap['teamCode'] ? row.getCell(colMap['teamCode']).text?.trim() : null;

        if (!dateVal && !branchVal && !projectVal && !itemVal && actualVal === null) {
          continue;
        }

        const errors: string[] = [];
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // 1. Validate Date
        let normalizedDate: string | null = null;
        if (!dateVal || isNaN(Date.parse(dateVal))) {
          errors.push('تاريخ غير صالح');
        } else {
          try {
            normalizedDate = new Date(dateVal).toISOString().split('T')[0];
          } catch {
            errors.push('تاريخ غير صالح');
          }
        }

        // 2. Validate Branch
        let branchId: string | null = null;
        if (!branchVal) {
          errors.push('الفرع حقل إلزامي');
        } else {
          branchId = branchMap.get(branchVal.toLowerCase()) || null;
          if (!branchId) {
            errors.push('الفرع غير موجود');
          }
        }

        // 3. Validate Project
        let projectId: string | null = null;
        if (!projectVal) {
          errors.push('المشروع حقل إلزامي');
        } else {
          const projObj = projectMap.get(projectVal.toLowerCase());
          if (!projObj) {
            errors.push('المشروع غير موجود');
          } else {
            projectId = projObj.id;
          }
        }

        // 4. Validate Item
        let workItemId: string | null = null;
        if (!itemVal) {
          errors.push('البند حقل إلزامي');
        } else {
          workItemId = itemMap.get(itemVal.toLowerCase()) || null;
          if (!workItemId) {
            errors.push('البند غير موجود');
          }
        }

        // 5. Validate Area (optional)
        let workAreaId: string | null = null;
        if (areaVal && projectId) {
          const areaObj = areaMap.get(`${projectId}_${areaVal.toLowerCase()}`);
          if (!areaObj) {
            errors.push('المنطقة غير موجودة في هذا المشروع');
          } else {
            workAreaId = areaObj.id;
          }
        }

        // 6. Validate Actual Quantity
        const actualNum = parseFloat(String(actualVal ?? ''));
        if (actualVal === null || actualVal === undefined || isNaN(actualNum) || actualNum < 0) {
          errors.push('الكمية الفعلية حقل إلزامي');
        }

        // 7. Validate Production Type & Team Code
        const prodType = typeVal === 'team' ? 'team' : 'individual';
        if (prodType === 'team' && !teamCodeVal) {
          errors.push('كود الفريق مطلوب للإنتاج من نوع فريق');
        }

        const targetNum = parseFloat(String(targetVal || '0')) || 0;

        // 8. Duplicate Check
        if (errors.length === 0 && normalizedDate && branchId && projectId && workItemId) {
          const fileKey = `${normalizedDate}|${branchId}|${projectId}|${workItemId}|${workAreaId || ''}|${teamCodeVal || ''}`;
          if (dbProdKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('سجل الإنتاج مكرر في النظام');
          } else if (seenFileProdKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('سجل الإنتاج مكرر داخل نفس الملف');
          } else {
            seenFileProdKeys.add(fileKey);
          }
        }

        if (errors.length > 0 && status !== 'duplicate') {
          status = 'invalid';
        }

        const parsedData = {
          date: normalizedDate || dateVal,
          branchId,
          projectId,
          workItemId,
          workAreaId,
          targetQuantity: targetNum,
          actualQuantity: isNaN(actualNum) ? 0 : actualNum,
          productionType: prodType,
          teamCode: teamCodeVal || null,
          supervisorId: defaultSupervisorId,
        };

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        parsedRows.push({
          rowIndex: r,
          date: dateVal,
          branch: branchVal,
          project: projectVal,
          area: areaVal,
          item: itemVal,
          target: targetNum,
          actual: isNaN(actualNum) ? actualVal : actualNum,
          type: prodType,
          teamCode: teamCodeVal,
          status,
          errors,
        });

        rowDbRecords.push({
          rowIndex: r,
          rawData,
          parsedData,
          dbStatus: status === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.status === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // Create record in import_jobs (status = 'staged')
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'production', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'production.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // Insert staging rows & row errors
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;

        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_PRODUCTION_RECORD'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'production', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        rows: parsedRows,
      };
    });
  }

  /**
   * Upload & stage project BOQ XLSX file
   * Section 7 Item 2 of HANDOFF.md
   */
  async uploadBoqXlsx(
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerVal = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!headerVal) return;

      if (['project', 'المشروع', 'مشروع', 'project_name'].includes(headerVal)) {
        colMap['project'] = colNumber;
      } else if (['branch', 'الفرع', 'فرع', 'branch_name'].includes(headerVal)) {
        colMap['branch'] = colNumber;
      } else if (['area', 'المنطقة', 'منطقة', 'work_area', 'work_area_name'].includes(headerVal)) {
        colMap['area'] = colNumber;
      } else if (['item', 'البند', 'بند', 'work_item', 'work_item_name'].includes(headerVal)) {
        colMap['item'] = colNumber;
      } else if (['quantity', 'الكمية', 'كمية', 'total_quantity', 'qty'].includes(headerVal)) {
        colMap['quantity'] = colNumber;
      } else if (['rate', 'السعر', 'سعر', 'unit_rate', 'price'].includes(headerVal)) {
        colMap['rate'] = colNumber;
      }
    });

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch DB entities for FK matching
      const branchesRes = await client.query(
        `SELECT id, name, code FROM branches WHERE company_id = $1`,
        [companyId],
      );
      const branchMap = new Map<string, string>();
      for (const b of branchesRes.rows) {
        branchMap.set(b.name.trim().toLowerCase(), b.id);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b.id);
      }

      const projectsRes = await client.query(
        `SELECT id, name, code, branch_id FROM projects WHERE company_id = $1`,
        [companyId],
      );
      const projectMap = new Map<string, { id: string; branchId: string }>();
      for (const p of projectsRes.rows) {
        projectMap.set(p.name.trim().toLowerCase(), { id: p.id, branchId: p.branch_id });
        if (p.code) projectMap.set(p.code.trim().toLowerCase(), { id: p.id, branchId: p.branch_id });
      }

      const itemsRes = await client.query(
        `SELECT id, name, code, unit_id FROM work_items WHERE company_id = $1`,
        [companyId],
      );
      const itemMap = new Map<string, { id: string; unitId: string }>();
      for (const it of itemsRes.rows) {
        itemMap.set(it.name.trim().toLowerCase(), { id: it.id, unitId: it.unit_id });
        if (it.code) itemMap.set(it.code.trim().toLowerCase(), { id: it.id, unitId: it.unit_id });
      }

      const areasRes = await client.query(
        `SELECT id, name, code, project_id FROM work_areas WHERE company_id = $1`,
        [companyId],
      );
      const areaMap = new Map<string, { id: string; projectId: string }>();
      for (const a of areasRes.rows) {
        areaMap.set(`${a.project_id}_${a.name.trim().toLowerCase()}`, { id: a.id, projectId: a.project_id });
        if (a.code) areaMap.set(`${a.project_id}_${a.code.trim().toLowerCase()}`, { id: a.id, projectId: a.project_id });
      }

      // Fetch existing BOQ items for DB duplicate detection
      const existingBoqRes = await client.query(
        `SELECT b.project_id, bi.work_item_id, COALESCE(bia.work_area_id::text, '') AS work_area_id
         FROM boq_items bi
         JOIN boq b ON bi.boq_id = b.id AND bi.company_id = b.company_id
         LEFT JOIN boq_item_areas bia ON bi.id = bia.boq_item_id AND bi.company_id = bia.company_id
         WHERE bi.company_id = $1`,
        [companyId],
      );
      const dbBoqKeys = new Set<string>();
      for (const eb of existingBoqRes.rows) {
        dbBoqKeys.add(`${eb.project_id}|${eb.work_item_id}|${eb.work_area_id}`);
      }

      const seenFileBoqKeys = new Set<string>();
      const parsedRows: any[] = [];
      const rowDbRecords: any[] = [];

      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const projectVal = colMap['project'] ? row.getCell(colMap['project']).text?.trim() : null;
        const branchVal = colMap['branch'] ? row.getCell(colMap['branch']).text?.trim() : null;
        const areaVal = colMap['area'] ? row.getCell(colMap['area']).text?.trim() : null;
        const itemVal = colMap['item'] ? row.getCell(colMap['item']).text?.trim() : null;
        const quantityVal = colMap['quantity'] ? row.getCell(colMap['quantity']).value : null;
        const rateVal = colMap['rate'] ? row.getCell(colMap['rate']).value : 0;

        if (!projectVal && !branchVal && !itemVal && quantityVal === null) {
          continue;
        }

        const errors: string[] = [];
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // 1. Validate Project
        let projectId: string | null = null;
        if (!projectVal) {
          errors.push('المشروع حقل إلزامي');
        } else {
          const projObj = projectMap.get(projectVal.toLowerCase());
          if (!projObj) {
            errors.push('المشروع غير موجود');
          } else {
            projectId = projObj.id;
          }
        }

        // 2. Validate Branch
        let branchId: string | null = null;
        if (!branchVal) {
          errors.push('الفرع حقل إلزامي');
        } else {
          branchId = branchMap.get(branchVal.toLowerCase()) || null;
          if (!branchId) {
            errors.push('الفرع غير موجود');
          }
        }

        // 3. Validate Work Item
        let workItemId: string | null = null;
        let unitId: string | null = null;
        if (!itemVal) {
          errors.push('البند حقل إلزامي');
        } else {
          const itemObj = itemMap.get(itemVal.toLowerCase());
          if (!itemObj) {
            errors.push('البند غير موجود');
          } else {
            workItemId = itemObj.id;
            unitId = itemObj.unitId;
          }
        }

        // 4. Validate Area (optional)
        let workAreaId: string | null = null;
        if (areaVal && projectId) {
          const areaObj = areaMap.get(`${projectId}_${areaVal.toLowerCase()}`);
          if (!areaObj) {
            errors.push('المنطقة غير موجودة في هذا المشروع');
          } else {
            workAreaId = areaObj.id;
          }
        }

        // 5. Validate Quantity (> 0)
        const qtyNum = parseFloat(String(quantityVal ?? ''));
        if (quantityVal === null || quantityVal === undefined || isNaN(qtyNum) || qtyNum <= 0) {
          errors.push('الكمية يجب أن تكون أكبر من الصفر');
        }

        const rateNum = parseFloat(String(rateVal || '0')) || 0;

        // 6. Duplicate Check
        if (errors.length === 0 && projectId && workItemId) {
          const fileKey = `${projectId}|${workItemId}|${workAreaId || ''}`;
          if (dbBoqKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('بند المقايسة مكرر في النظام');
          } else if (seenFileBoqKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('بند المقايسة مكرر داخل نفس الملف');
          } else {
            seenFileBoqKeys.add(fileKey);
          }
        }

        if (errors.length > 0 && status !== 'duplicate') {
          status = 'invalid';
        }

        const parsedData = {
          projectId,
          branchId,
          workItemId,
          unitId,
          workAreaId,
          quantity: isNaN(qtyNum) ? 0 : qtyNum,
          rate: rateNum,
        };

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        parsedRows.push({
          rowIndex: r,
          project: projectVal,
          branch: branchVal,
          area: areaVal,
          item: itemVal,
          quantity: isNaN(qtyNum) ? quantityVal : qtyNum,
          rate: rateNum,
          status,
          errors,
        });

        rowDbRecords.push({
          rowIndex: r,
          rawData,
          parsedData,
          dbStatus: status === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.status === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // Create record in import_jobs (status = 'staged')
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'boq', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'boq.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // Insert staging rows & row errors
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;

        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_BOQ_ITEM'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'boq', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        rows: parsedRows,
      };
    });
  }

  /**
   * Commit staged valid rows to employees, production, or boq table
   * Section 7 Item 2 of HANDOFF.md
   */
  async commitImport(companyId: string, jobId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const jobRes = await client.query(
        `SELECT id, status, job_type FROM import_jobs WHERE id = $1 AND company_id = $2`,
        [jobId, companyId],
      );

      if (jobRes.rows.length === 0) {
        throw new NotFoundException(`Import job with ID '${jobId}' not found`);
      }

      const job = jobRes.rows[0];
      if (job.status === 'committed') {
        throw new BadRequestException('This import job has already been committed');
      }

      // Fetch only valid staging rows
      const validRowsRes = await client.query(
        `SELECT id, parsed_data FROM import_staging_rows
         WHERE import_job_id = $1 AND company_id = $2 AND status = 'valid'`,
        [jobId, companyId],
      );

      const validRows = validRowsRes.rows;

      if (job.job_type === 'employees') {
        for (const row of validRows) {
          const p = row.parsed_data;
          await client.query(
            `INSERT INTO employees (
              company_id, identity_number, name, phone, role_type, primary_branch_id, daily_wage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (company_id, identity_number) DO NOTHING`,
            [
              companyId,
              p.nationalId,
              p.name,
              p.phone || null,
              p.roleType || 'worker',
              p.primaryBranchId || null,
              p.wage || 0,
            ],
          );
        }
      } else if (job.job_type === 'production') {
        for (const row of validRows) {
          const p = row.parsed_data;
          await client.query(
            `INSERT INTO production_records (
              company_id, branch_id, project_id, work_item_id, work_area_id,
              date, production_type, actual_quantity, target_quantity, team_code,
              supervisor_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')`,
            [
              companyId,
              p.branchId,
              p.projectId,
              p.workItemId,
              p.workAreaId || null,
              p.date,
              p.productionType || 'individual',
              p.actualQuantity || 0,
              p.targetQuantity || 0,
              p.teamCode || null,
              p.supervisorId,
            ],
          );
        }
      } else if (job.job_type === 'boq') {
        // Group valid rows by projectId
        const rowsByProject = new Map<string, any[]>();
        for (const row of validRows) {
          const p = row.parsed_data;
          if (!rowsByProject.has(p.projectId)) {
            rowsByProject.set(p.projectId, []);
          }
          rowsByProject.get(p.projectId).push(p);
        }

        for (const [projectId, pRows] of rowsByProject.entries()) {
          // Check if BOQ exists for this project
          let boqId: string;
          const boqRes = await client.query(
            `SELECT id FROM boq WHERE company_id = $1 AND project_id = $2 ORDER BY created_at ASC LIMIT 1`,
            [companyId, projectId],
          );

          if (boqRes.rows.length > 0) {
            boqId = boqRes.rows[0].id;
          } else {
            const insertBoqRes = await client.query(
              `INSERT INTO boq (company_id, project_id, name, code, status)
               VALUES ($1, $2, 'مقايسة المشروع', 'BOQ-01', 'active')
               RETURNING id`,
              [companyId, projectId],
            );
            boqId = insertBoqRes.rows[0].id;
          }

          for (const item of pRows) {
            const hasAreaSplit = !!item.workAreaId;
            const insertItemRes = await client.query(
              `INSERT INTO boq_items (
                company_id, boq_id, work_item_id, unit_id, total_quantity,
                unit_rate, has_area_split
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id`,
              [
                companyId,
                boqId,
                item.workItemId,
                item.unitId,
                item.quantity,
                item.rate || 0,
                hasAreaSplit,
              ],
            );

            const boqItemId = insertItemRes.rows[0].id;

            if (item.workAreaId) {
              await client.query(
                `INSERT INTO boq_item_areas (
                  company_id, boq_item_id, work_area_id, quantity
                ) VALUES ($1, $2, $3, $4)`,
                [companyId, boqItemId, item.workAreaId, item.quantity],
              );
            }
          }
        }
      } else if (job.job_type === 'attendance') {
        // Fetch all statuses map for fallback status code resolution
        const stRes = await client.query(
          `SELECT id, code FROM attendance_statuses WHERE company_id = $1 OR company_id IS NULL`,
          [companyId],
        );
        const statusMap = new Map<string, string>();
        for (const s of stRes.rows) {
          statusMap.set(s.code, s.id);
        }

        for (const row of validRows) {
          const p = row.parsed_data;
          let statusId = p.statusId;
          if (!statusId && p.status) {
            statusId = statusMap.get(p.status) || statusMap.get('present');
          }

          await client.query(
            `INSERT INTO attendance (
              company_id, employee_id, project_id, branch_id, date, status_id,
              check_in_time, check_out_time, overtime_hours, source, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (company_id, employee_id, date) DO UPDATE SET
              status_id = EXCLUDED.status_id,
              project_id = EXCLUDED.project_id,
              branch_id = EXCLUDED.branch_id,
              check_in_time = EXCLUDED.check_in_time,
              check_out_time = EXCLUDED.check_out_time,
              overtime_hours = EXCLUDED.overtime_hours,
              source = EXCLUDED.source,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP`,
            [
              companyId,
              p.employeeId,
              p.projectId,
              p.branchId,
              p.date,
              statusId,
              p.checkIn || null,
              p.checkOut || null,
              p.overtime || 0,
              p.source || 'device',
              p.notes || null,
            ],
          );
        }
      }

      // Update staging rows to committed
      await client.query(
        `UPDATE import_staging_rows
         SET status = 'committed'
         WHERE import_job_id = $1 AND company_id = $2 AND status = 'valid'`,
        [jobId, companyId],
      );

      // Update import job status to committed
      await client.query(
        `UPDATE import_jobs
         SET status = 'committed',
             committed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2`,
        [jobId, companyId],
      );

      const errorRowsRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM import_staging_rows
         WHERE import_job_id = $1 AND company_id = $2 AND status != 'committed'`,
        [jobId, companyId],
      );

      return {
        imported: validRows.length,
        skipped: errorRowsRes.rows[0].count,
      };
    });
  }

  /**
   * Upload & stage attendance XLSX file
   * Section 7 Item 2 of HANDOFF.md
   */
  async uploadAttendanceXlsx(
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerVal = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!headerVal) return;

      if (['date', 'التاريخ', 'تاريخ', 'attendance_date'].includes(headerVal)) {
        colMap['date'] = colNumber;
      } else if (
        [
          'employee',
          'الموظف',
          'موظف',
          'national_id',
          'identity',
          'الرقم القومي',
          'رقم قومي',
          'هوية',
          'قومي',
        ].includes(headerVal)
      ) {
        colMap['employee'] = colNumber;
      } else if (['status', 'الحالة', 'حالة', 'attendance_status'].includes(headerVal)) {
        colMap['status'] = colNumber;
      } else if (
        ['checkin', 'check_in', 'وقت_الدخول', 'وقت الدخول', 'دخول', 'حضور_وقت'].includes(
          headerVal,
        )
      ) {
        colMap['checkIn'] = colNumber;
      } else if (
        ['checkout', 'check_out', 'وقت_الخروج', 'وقت الخروج', 'خروج', 'انصراف_وقت'].includes(
          headerVal,
        )
      ) {
        colMap['checkOut'] = colNumber;
      } else if (
        ['overtime', 'إضافي', 'اضافي', 'ساعات_إضافية', 'ساعات اضافية', 'overtime_hours'].includes(
          headerVal,
        )
      ) {
        colMap['overtime'] = colNumber;
      }
    });

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch Employees
      const employeesRes = await client.query(
        `SELECT id, identity_number AS national_id, name, primary_branch_id FROM employees WHERE company_id = $1`,
        [companyId],
      );
      const employeeMap = new Map<
        string,
        { id: string; name: string; primaryBranchId: string | null }
      >();
      for (const emp of employeesRes.rows) {
        employeeMap.set(emp.national_id.trim(), {
          id: emp.id,
          name: emp.name,
          primaryBranchId: emp.primary_branch_id,
        });
      }

      // 2. Fetch Employee active assignments
      const assignmentsRes = await client.query(
        `SELECT employee_id, project_id, branch_id FROM employee_assignments
         WHERE company_id = $1 AND is_active = true
         ORDER BY start_date DESC`,
        [companyId],
      );
      const assignmentMap = new Map<string, { projectId: string; branchId: string }>();
      for (const a of assignmentsRes.rows) {
        if (!assignmentMap.has(a.employee_id)) {
          assignmentMap.set(a.employee_id, {
            projectId: a.project_id,
            branchId: a.branch_id,
          });
        }
      }

      // 3. Fetch fallback projects
      const projectsRes = await client.query(
        `SELECT id, branch_id FROM projects WHERE company_id = $1 AND status = 'active' ORDER BY created_at ASC`,
        [companyId],
      );
      const fallbackProjectByBranch = new Map<string, string>();
      for (const p of projectsRes.rows) {
        if (!fallbackProjectByBranch.has(p.branch_id)) {
          fallbackProjectByBranch.set(p.branch_id, p.id);
        }
      }
      const defaultProjectId = projectsRes.rows.length > 0 ? projectsRes.rows[0].id : null;
      const defaultBranchId = projectsRes.rows.length > 0 ? projectsRes.rows[0].branch_id : null;

      // 4. Fetch Attendance Statuses
      const statusesRes = await client.query(
        `SELECT id, code, name FROM attendance_statuses WHERE company_id IS NULL OR company_id = $1`,
        [companyId],
      );
      const statusMap = new Map<string, string>();
      for (const st of statusesRes.rows) {
        statusMap.set(st.code.trim().toLowerCase(), st.id);
        statusMap.set(st.name.trim().toLowerCase(), st.id);
      }

      // Synonym mapping
      const synonymMap: { [key: string]: string } = {
        حاضر: 'present',
        حضور: 'present',
        موجود: 'present',
        present: 'present',
        غائب: 'absent',
        غياب: 'absent',
        absent: 'absent',
        متأخر: 'late',
        تاخير: 'late',
        تأخير: 'late',
        late: 'late',
        مرضي: 'excused',
        'إجازة مرضية': 'excused',
        إجازة: 'excused',
        اجازة: 'excused',
        إذن: 'excused',
        اذن: 'excused',
        'إذن / إجازة': 'excused',
        leave: 'excused',
        vacation: 'excused',
        sick: 'excused',
        excused: 'excused',
        راحة: 'rest_day',
        عطلة: 'rest_day',
        'عطلة رسمية': 'rest_day',
        'عطلة رسمية / راحة': 'rest_day',
        off: 'rest_day',
        rest_day: 'rest_day',
      };

      // 5. Fetch existing attendance for DB duplicate detection
      const existingAttendanceRes = await client.query(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date_str, employee_id FROM attendance WHERE company_id = $1`,
        [companyId],
      );
      const dbAttendanceKeys = new Set<string>();
      for (const ea of existingAttendanceRes.rows) {
        dbAttendanceKeys.add(`${ea.date_str}|${ea.employee_id}`);
      }

      const seenFileAttendanceKeys = new Set<string>();
      const parsedRows: any[] = [];
      const rowDbRecords: any[] = [];

      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const dateVal = colMap['date'] ? row.getCell(colMap['date']).text?.trim() : null;
        const empVal = colMap['employee']
          ? row.getCell(colMap['employee']).text?.trim()
          : null;
        const statusVal = colMap['status']
          ? row.getCell(colMap['status']).text?.trim()
          : null;
        const checkInVal = colMap['checkIn']
          ? row.getCell(colMap['checkIn']).text?.trim()
          : null;
        const checkOutVal = colMap['checkOut']
          ? row.getCell(colMap['checkOut']).text?.trim()
          : null;
        const overtimeVal = colMap['overtime']
          ? row.getCell(colMap['overtime']).value
          : 0;

        if (!dateVal && !empVal && !statusVal) {
          continue;
        }

        const errors: string[] = [];
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // 1. Validate Date
        let normalizedDate: string | null = null;
        if (!dateVal || isNaN(Date.parse(dateVal))) {
          errors.push('تاريخ غير صالح');
        } else {
          try {
            normalizedDate = new Date(dateVal).toISOString().split('T')[0];
          } catch {
            errors.push('تاريخ غير صالح');
          }
        }

        // 2. Validate Employee
        let employeeId: string | null = null;
        let branchId: string | null = null;
        let projectId: string | null = null;

        if (!empVal) {
          errors.push('رقم هوية الموظف حقل إلزامي');
        } else {
          const empObj = employeeMap.get(empVal);
          if (!empObj) {
            errors.push('الموظف غير موجود');
          } else {
            employeeId = empObj.id;

            // Resolve assignment or fallback
            const asg = assignmentMap.get(empObj.id);
            if (asg) {
              branchId = asg.branchId;
              projectId = asg.projectId;
            } else {
              branchId = empObj.primaryBranchId || defaultBranchId;
              projectId =
                (branchId ? fallbackProjectByBranch.get(branchId) : null) ||
                defaultProjectId;
            }
          }
        }

        // 3. Validate Status
        let statusId: string | null = null;
        if (!statusVal) {
          errors.push('حالة الحضور حقل إلزامي');
        } else {
          const lowerVal = statusVal.toLowerCase();
          const canonicalCode = synonymMap[lowerVal] || lowerVal;
          statusId = statusMap.get(canonicalCode) || statusMap.get(lowerVal) || null;
          if (!statusId) {
            errors.push('حالة الحضور غير صالحة');
          }
        }

        // 4. Validate Check-in & Check-out time range
        const parseTimeMinutes = (timeStr: string | null): number | null => {
          if (!timeStr) return null;
          const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (!m) return null;
          const h = parseInt(m[1], 10);
          const min = parseInt(m[2], 10);
          if (h < 0 || h > 23 || min < 0 || min > 59) return null;
          return h * 60 + min;
        };

        if (checkInVal && checkOutVal) {
          const inMin = parseTimeMinutes(checkInVal);
          const outMin = parseTimeMinutes(checkOutVal);
          if (inMin !== null && outMin !== null && outMin <= inMin) {
            errors.push('وقت الخروج يجب أن يكون بعد وقت الدخول');
          }
        }

        const overtimeNum = parseFloat(String(overtimeVal || '0')) || 0;

        // 5. Duplicate Check
        if (errors.length === 0 && normalizedDate && employeeId) {
          const fileKey = `${normalizedDate}|${employeeId}`;
          if (dbAttendanceKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('سجل الحضور مكرر لنفس الموظف في هذا اليوم');
          } else if (seenFileAttendanceKeys.has(fileKey)) {
            status = 'duplicate';
            errors.push('سجل الحضور مكرر داخل نفس الملف');
          } else {
            seenFileAttendanceKeys.add(fileKey);
          }
        }

        if (errors.length > 0 && status !== 'duplicate') {
          status = 'invalid';
        }

        const parsedData = {
          date: normalizedDate || dateVal,
          employeeId,
          nationalId: empVal,
          branchId,
          projectId,
          statusId,
          statusName: statusVal,
          checkIn: checkInVal,
          checkOut: checkOutVal,
          overtime: overtimeNum,
        };

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        parsedRows.push({
          rowIndex: r,
          date: dateVal,
          employee: empVal,
          status: statusVal,
          checkIn: checkInVal,
          checkOut: checkOutVal,
          overtime: overtimeNum,
          rowStatus: status,
          errors,
        });

        rowDbRecords.push({
          rowIndex: r,
          rawData,
          parsedData,
          dbStatus: status === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.rowStatus === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.rowStatus === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.rowStatus === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // Create record in import_jobs (status = 'staged')
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'attendance', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'attendance.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // Insert staging rows & row errors
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;

        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_ATTENDANCE_RECORD'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'attendance', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        rows: parsedRows,
      };
    });
  }

  /**
   * Update a single staging row parsed_data / status before commit
   * Route: PATCH /api/v1/imports/staging/:rowId
   */
  async updateStagingRow(companyId: string, rowId: string, dto: any) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const rowRes = await client.query(
        `SELECT id, import_job_id, parsed_data, status FROM import_staging_rows WHERE id = $1 AND company_id = $2`,
        [rowId, companyId],
      );
      if (rowRes.rows.length === 0) {
        throw new NotFoundException(`Staging row with ID '${rowId}' not found`);
      }

      const currentRow = rowRes.rows[0];
      const parsedData = { ...currentRow.parsed_data, ...(dto.parsedData || {}) };

      // If status changed by user
      if (dto.parsedData?.status) {
        const stRes = await client.query(
          `SELECT id, name FROM attendance_statuses WHERE code = $1 AND (company_id = $2 OR company_id IS NULL)`,
          [dto.parsedData.status, companyId],
        );
        if (stRes.rows.length > 0) {
          parsedData.statusId = stRes.rows[0].id;
          parsedData.statusName = stRes.rows[0].name;
          parsedData.status = dto.parsedData.status;
        }
      }

      let newStatus = dto.status || currentRow.status;
      if (dto.parsedData && !dto.status && (newStatus === 'error' || newStatus === 'invalid')) {
        newStatus = 'valid';
      }

      if (newStatus === 'valid') {
        await client.query(
          `DELETE FROM import_row_errors WHERE staging_row_id = $1 AND company_id = $2`,
          [rowId, companyId],
        );
      }

      const updateRes = await client.query(
        `UPDATE import_staging_rows
         SET parsed_data = $1, status = $2
         WHERE id = $3 AND company_id = $4
         RETURNING id, import_job_id, row_index, raw_data, parsed_data, status, created_at`,
        [JSON.stringify(parsedData), newStatus, rowId, companyId],
      );

      // Recalculate job summary counts
      const countsRes = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'valid')::int AS valid_count,
           COUNT(*) FILTER (WHERE status = 'error')::int AS error_count,
           COUNT(*)::int AS total_count
         FROM import_staging_rows
         WHERE import_job_id = $1 AND company_id = $2`,
        [currentRow.import_job_id, companyId],
      );

      const { valid_count, error_count, total_count } = countsRes.rows[0];
      await client.query(
        `UPDATE import_jobs
         SET valid_rows = $1, error_rows = $2, total_rows = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND company_id = $5`,
        [valid_count, error_count, total_count, currentRow.import_job_id, companyId],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Upload & stage biometric device attendance file
   * Supports Format A (row per day) and Format B (row per punch)
   * Deducts statuses and overtime using dynamic attendance policies (ZERO constants)
   */
  async uploadAttendanceDeviceXlsx(
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const rawText = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!rawText) return;
      const h = rawText.replace(/[\s_\-]+/g, '');

      // Device code
      if (
        [
          'enrollno', 'enroll', 'empno', 'employeeno', 'badgeno', 'badge', 'رقمالموظف',
          'الكود', 'كودالبصمة', 'كودبصمة', 'الرقم_الوظيفي', 'الرقم_الوظيفي', 'الرقم_الوظيفي',
          'userid', 'user_id', 'pin', 'acno', 'acno.', 'كود', 'code', 'devicecode', 'deviceno',
          'رقم_الموظف', 'رقم_البصمة', 'رقم_الجهاز', 'كود_الموظف'
        ].includes(h) ||
        rawText.includes('enroll') ||
        rawText.includes('كود') ||
        rawText.includes('بصمة')
      ) {
        if (!colMap['deviceCode']) colMap['deviceCode'] = colNumber;
      }
      // Name
      else if (
        ['name', 'الاسم', 'اسم', 'اسمالموظف', 'اسمعامل', 'fullname', 'employeename', 'workername'].includes(h) ||
        rawText.includes('الاسم') || rawText.includes('اسم')
      ) {
        if (!colMap['name']) colMap['name'] = colNumber;
      }
      // National ID
      else if (
        ['identity', 'قومي', 'هوية', 'الرقم_القومي', 'رقمقومي', 'nationalid', 'idnumber', 'رقم_الهوية'].includes(h) ||
        rawText.includes('هوية') || rawText.includes('قومي')
      ) {
        if (!colMap['nationalId']) colMap['nationalId'] = colNumber;
      }
      // Date
      else if (
        ['date', 'day', 'التاريخ', 'تاريخ', 'اليوم', 'punchdate', 'attendancedate', 'تاريخ_البصمة'].includes(h) ||
        rawText.includes('تاريخ') || rawText.includes('date')
      ) {
        if (!colMap['date']) colMap['date'] = colNumber;
      }
      // Check-in
      else if (
        [
          'checkin', 'clockin', 'in', 'punchin', 'الدخول', 'الحضور', 'وقتالدخول', 'وقتالحضور', 'دخول', 'حضور'
        ].includes(h) ||
        rawText.includes('دخول') || rawText.includes('حضور') || rawText.includes('checkin') || rawText.includes('clockin') || rawText === 'in'
      ) {
        if (!colMap['checkIn']) colMap['checkIn'] = colNumber;
      }
      // Check-out
      else if (
        [
          'checkout', 'clockout', 'out', 'punchout', 'الخروج', 'الانصراف', 'وقتالخروج', 'وقتالانصراف', 'خروج', 'انصراف'
        ].includes(h) ||
        rawText.includes('خروج') || rawText.includes('انصراف') || rawText.includes('checkout') || rawText.includes('clockout') || rawText === 'out'
      ) {
        if (!colMap['checkOut']) colMap['checkOut'] = colNumber;
      }
      // Single Time
      else if (
        ['time', 'الوقت', 'وقت', 'punchtime', 'وقت_البصمة'].includes(h) ||
        rawText === 'time' || rawText === 'الوقت'
      ) {
        if (!colMap['time']) colMap['time'] = colNumber;
      }
      // Direction
      else if (
        ['direction', 'inout', 'النوع', 'اتجاه', 'حالة_البصمة', 'punchtype', 'state', 'نوع_الحركة'].includes(h)
      ) {
        if (!colMap['direction']) colMap['direction'] = colNumber;
      }
    });

    const isPunchListFormat = !!colMap['time'] && (!colMap['checkIn'] || !colMap['checkOut']);

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch DB employees for matching
      const employeesRes = await client.query(
        `SELECT e.id, e.name, e.identity_number, e.device_code, e.primary_branch_id,
                (SELECT ea.project_id FROM employee_assignments ea
                 WHERE ea.employee_id = e.id AND ea.company_id = e.company_id AND ea.is_active = true
                 ORDER BY ea.created_at DESC LIMIT 1) AS active_project_id,
                (SELECT ea.branch_id FROM employee_assignments ea
                 WHERE ea.employee_id = e.id AND ea.company_id = e.company_id AND ea.is_active = true
                 ORDER BY ea.created_at DESC LIMIT 1) AS active_branch_id
         FROM employees e
         WHERE e.company_id = $1`,
        [companyId],
      );

      const deviceCodeMap = new Map<string, any>();
      const nationalIdMap = new Map<string, any>();
      const nameMap = new Map<string, any>();

      for (const emp of employeesRes.rows) {
        if (emp.device_code) {
          deviceCodeMap.set(String(emp.device_code).trim().toLowerCase(), emp);
        }
        if (emp.identity_number) {
          nationalIdMap.set(String(emp.identity_number).trim().toLowerCase(), emp);
        }
        if (emp.name) {
          nameMap.set(String(emp.name).trim().toLowerCase(), emp);
        }
      }

      // 2. Fetch default branch & project
      const defBranchRes = await client.query(
        `SELECT id FROM branches WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [companyId],
      );
      const defaultBranchId = defBranchRes.rows[0]?.id || null;

      const defProjRes = await client.query(
        `SELECT id FROM projects WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [companyId],
      );
      const defaultProjectId = defProjRes.rows[0]?.id || null;

      // 3. Fetch attendance statuses
      const statusRes = await client.query(
        `SELECT id, code, name FROM attendance_statuses WHERE company_id = $1 OR company_id IS NULL`,
        [companyId],
      );
      const statusMap = new Map<string, { id: string; name: string }>();
      for (const st of statusRes.rows) {
        statusMap.set(st.code, { id: st.id, name: st.name });
      }

      const presentStatus = statusMap.get('present') || { id: '00000000-0000-0000-0002-000000000001', name: 'حاضر' };
      const lateStatus = statusMap.get('late') || { id: '00000000-0000-0000-0002-000000000002', name: 'متأخر' };
      const absentStatus = statusMap.get('absent') || { id: '00000000-0000-0000-0002-000000000003', name: 'غائب' };

      // 4. Fetch existing attendance keys for duplicate detection
      const existingAttRes = await client.query(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date, employee_id FROM attendance WHERE company_id = $1`,
        [companyId],
      );
      const dbAttendanceKeys = new Set<string>();
      for (const a of existingAttRes.rows) {
        dbAttendanceKeys.add(`${a.date}|${a.employee_id}`);
      }

      const seenFileAttendanceKeys = new Set<string>();
      const parsedRows: any[] = [];
      const rowDbRecords: any[] = [];

      const parseTimeVal = (cellVal: any): string | null => {
        if (cellVal === null || cellVal === undefined || cellVal === '') return null;
        if (cellVal instanceof Date) {
          const h = String(cellVal.getUTCHours() || cellVal.getHours()).padStart(2, '0');
          const m = String(cellVal.getUTCMinutes() || cellVal.getMinutes()).padStart(2, '0');
          return `${h}:${m}`;
        }
        if (typeof cellVal === 'number') {
          // Fraction of 24h
          const totalMins = Math.round(cellVal * 24 * 60);
          const h = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
          const m = String(totalMins % 60).padStart(2, '0');
          return `${h}:${m}`;
        }
        const str = String(cellVal).trim();
        const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (match) {
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        }
        return null;
      };

      const parseDateVal = (cellVal: any): string | null => {
        if (!cellVal) return null;
        if (cellVal instanceof Date) {
          return cellVal.toISOString().split('T')[0];
        }
        if (typeof cellVal === 'number') {
          const date = new Date(Math.round((cellVal - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
        }
        const str = String(cellVal).trim();
        const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (ymd) {
          return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
        }
        const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
        if (dmy) {
          return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        }
        try {
          const d = new Date(str);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch {}
        return null;
      };

      const parseTimeToMinutes = (timeStr: string | null): number | null => {
        if (!timeStr) return null;
        const m = timeStr.match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      };

      let primaryPolicyUsed: any = null;

      // Extract raw items
      interface RawPunchItem {
        rowIndex: number;
        deviceCodeVal: string | null;
        nameVal: string | null;
        nationalIdVal: string | null;
        dateVal: string | null;
        checkInVal: string | null;
        checkOutVal: string | null;
        timeVal: string | null;
        rawData: any;
      }

      const rawItems: RawPunchItem[] = [];
      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const deviceCodeVal = colMap['deviceCode'] ? row.getCell(colMap['deviceCode']).text?.trim() : null;
        const nameVal = colMap['name'] ? row.getCell(colMap['name']).text?.trim() : null;
        const nationalIdVal = colMap['nationalId'] ? row.getCell(colMap['nationalId']).text?.trim() : null;
        const dateRaw = colMap['date'] ? row.getCell(colMap['date']).value : null;
        const dateVal = parseDateVal(dateRaw) || (colMap['date'] ? row.getCell(colMap['date']).text?.trim() : null);

        const checkInRaw = colMap['checkIn'] ? row.getCell(colMap['checkIn']).value : null;
        const checkInVal = parseTimeVal(checkInRaw) || (colMap['checkIn'] ? row.getCell(colMap['checkIn']).text?.trim() : null);

        const checkOutRaw = colMap['checkOut'] ? row.getCell(colMap['checkOut']).value : null;
        const checkOutVal = parseTimeVal(checkOutRaw) || (colMap['checkOut'] ? row.getCell(colMap['checkOut']).text?.trim() : null);

        const timeRaw = colMap['time'] ? row.getCell(colMap['time']).value : null;
        const timeVal = parseTimeVal(timeRaw) || (colMap['time'] ? row.getCell(colMap['time']).text?.trim() : null);

        if (!deviceCodeVal && !nameVal && !nationalIdVal && !dateVal && !checkInVal && !timeVal) {
          continue;
        }

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        rawItems.push({
          rowIndex: r,
          deviceCodeVal,
          nameVal,
          nationalIdVal,
          dateVal,
          checkInVal,
          checkOutVal,
          timeVal,
          rawData,
        });
      }

      // Group punches if Format B (Punch list)
      interface GroupedAttendanceRecord {
        rowIndex: number;
        deviceCodeVal: string | null;
        nameVal: string | null;
        nationalIdVal: string | null;
        dateVal: string;
        checkIn: string | null;
        checkOut: string | null;
        rawData: any;
      }

      const groupedRecords: GroupedAttendanceRecord[] = [];

      if (isPunchListFormat) {
        const groups = new Map<string, { punches: string[]; item: RawPunchItem }>();
        for (const item of rawItems) {
          const empKey = (item.deviceCodeVal || item.nationalIdVal || item.nameVal || 'UNKNOWN').toLowerCase();
          const dKey = item.dateVal || 'NO_DATE';
          const groupKey = `${empKey}|${dKey}`;

          if (!groups.has(groupKey)) {
            groups.set(groupKey, { punches: [], item });
          }
          if (item.timeVal) {
            groups.get(groupKey)!.punches.push(item.timeVal);
          }
        }

        for (const [, grp] of groups.entries()) {
          grp.punches.sort((a, b) => {
            const minA = parseTimeToMinutes(a) || 0;
            const minB = parseTimeToMinutes(b) || 0;
            return minA - minB;
          });

          const checkIn = grp.punches[0] || null;
          const checkOut = grp.punches.length > 1 ? grp.punches[grp.punches.length - 1] : null;

          groupedRecords.push({
            rowIndex: grp.item.rowIndex,
            deviceCodeVal: grp.item.deviceCodeVal,
            nameVal: grp.item.nameVal,
            nationalIdVal: grp.item.nationalIdVal,
            dateVal: grp.item.dateVal || new Date().toISOString().split('T')[0],
            checkIn,
            checkOut,
            rawData: grp.item.rawData,
          });
        }
      } else {
        // Format A
        for (const item of rawItems) {
          groupedRecords.push({
            rowIndex: item.rowIndex,
            deviceCodeVal: item.deviceCodeVal,
            nameVal: item.nameVal,
            nationalIdVal: item.nationalIdVal,
            dateVal: item.dateVal || new Date().toISOString().split('T')[0],
            checkIn: item.checkInVal,
            checkOut: item.checkOutVal,
            rawData: item.rawData,
          });
        }
      }

      // Process grouped records
      for (const rec of groupedRecords) {
        const errors: string[] = [];
        let rowStatus: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // 1. Employee Matching
        let matchedEmployee: any = null;
        if (rec.deviceCodeVal) {
          matchedEmployee = deviceCodeMap.get(rec.deviceCodeVal.toLowerCase());
        }
        if (!matchedEmployee && rec.nationalIdVal) {
          matchedEmployee = nationalIdMap.get(rec.nationalIdVal.toLowerCase());
        }
        if (!matchedEmployee && rec.nameVal) {
          matchedEmployee = nameMap.get(rec.nameVal.toLowerCase());
        }

        if (!matchedEmployee) {
          const idenf = rec.deviceCodeVal || rec.nationalIdVal || rec.nameVal || 'غير محدد';
          errors.push(`EMPLOYEE_NOT_FOUND: لم يتم العثور على الموظف (${idenf})`);
          rowStatus = 'invalid';
        }

        // 2. Date
        const dateStr = parseDateVal(rec.dateVal) || rec.dateVal;
        if (!dateStr || isNaN(Date.parse(dateStr))) {
          errors.push('تاريخ غير صالح');
          rowStatus = 'invalid';
        }

        const projectId = matchedEmployee?.active_project_id || defaultProjectId;
        const branchId = matchedEmployee?.active_branch_id || matchedEmployee?.primary_branch_id || defaultBranchId;

        // 3. Dynamic Policy deduction (ZERO constants!)
        const policy = await this.attendancePoliciesService.getEffectivePolicy(
          companyId,
          projectId,
          dateStr || new Date().toISOString().split('T')[0],
          client,
        );

        if (!primaryPolicyUsed) {
          primaryPolicyUsed = policy;
        }

        const shiftStartMins = parseTimeToMinutes(policy.shift_start_time) || 480;
        const graceMins = Number(policy.grace_minutes || 15);
        const checkInMins = parseTimeToMinutes(rec.checkIn);
        const checkOutMins = parseTimeToMinutes(rec.checkOut);

        let finalStatusObj = presentStatus;
        let finalStatusCode = 'present';
        let overtime = 0;
        let notes: string | null = null;

        if (checkInMins !== null) {
          if (checkInMins > shiftStartMins + graceMins) {
            finalStatusObj = lateStatus;
            finalStatusCode = 'late';
          } else {
            finalStatusObj = presentStatus;
            finalStatusCode = 'present';
          }

          if (checkOutMins !== null) {
            if (checkOutMins <= checkInMins) {
              errors.push('وقت الخروج يجب أن يكون بعد وقت الدخول');
              rowStatus = 'invalid';
            } else {
              const breakMins = Number(policy.break_minutes || 0);
              const thresholdHours = Number(policy.overtime_threshold_hours || 8);
              const workedMinutes = Math.max(0, checkOutMins - checkInMins - breakMins);
              const workedHours = workedMinutes / 60;
              overtime = Math.max(0, Number((workedHours - thresholdHours).toFixed(2)));
            }
          } else {
            notes = 'بدون انصراف';
          }
        } else {
          finalStatusObj = absentStatus;
          finalStatusCode = 'absent';
        }

        // 4. Duplicate Check
        if (matchedEmployee && dateStr && errors.length === 0) {
          const fileKey = `${dateStr}|${matchedEmployee.id}`;
          if (dbAttendanceKeys.has(fileKey)) {
            rowStatus = 'duplicate';
            errors.push('سجل الحضور مكرر لنفس الموظف في هذا اليوم');
          } else if (seenFileAttendanceKeys.has(fileKey)) {
            rowStatus = 'duplicate';
            errors.push('سجل الحضور مكرر داخل نفس الملف');
          } else {
            seenFileAttendanceKeys.add(fileKey);
          }
        }

        const parsedData = {
          date: dateStr,
          employeeId: matchedEmployee?.id || null,
          employeeName: matchedEmployee?.name || rec.nameVal || '—',
          nationalId: matchedEmployee?.identity_number || rec.nationalIdVal || null,
          deviceCode: matchedEmployee?.device_code || rec.deviceCodeVal || null,
          projectId,
          branchId,
          statusId: finalStatusObj.id,
          statusName: finalStatusObj.name,
          status: finalStatusCode,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          overtime,
          source: 'device',
          notes,
          policyId: policy.id,
        };

        parsedRows.push({
          rowIndex: rec.rowIndex,
          date: dateStr,
          employee: matchedEmployee?.name || rec.nameVal || rec.deviceCodeVal || 'غير معروف',
          deviceCode: rec.deviceCodeVal,
          nationalId: rec.nationalIdVal,
          status: finalStatusObj.name,
          statusCode: finalStatusCode,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          overtime,
          source: 'device',
          notes,
          rowStatus,
          errors,
        });

        rowDbRecords.push({
          rowIndex: rec.rowIndex,
          rawData: rec.rawData,
          parsedData,
          dbStatus: rowStatus === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.rowStatus === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.rowStatus === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.rowStatus === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // Insert into import_jobs
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'attendance', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'attendance_biometric.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // Insert staging rows
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;
        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_ATTENDANCE_RECORD'
              : err.includes('EMPLOYEE_NOT_FOUND')
              ? 'EMPLOYEE_NOT_FOUND'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'attendance', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        detectedColumns: colMap,
        policyUsed: primaryPolicyUsed
          ? {
              id: primaryPolicyUsed.id,
              shiftStartTime: primaryPolicyUsed.shift_start_time,
              shiftEndTime: primaryPolicyUsed.shift_end_time,
              graceMinutes: primaryPolicyUsed.grace_minutes,
              breakMinutes: primaryPolicyUsed.break_minutes,
              overtimeThresholdHours: primaryPolicyUsed.overtime_threshold_hours,
              overtimeMultiplier: primaryPolicyUsed.overtime_multiplier,
              effectiveFrom: primaryPolicyUsed.effective_from,
              projectName: primaryPolicyUsed.project_name || 'السياسة العامة للمنشأة',
            }
          : null,
        rows: parsedRows,
      };
    });
  }
}

