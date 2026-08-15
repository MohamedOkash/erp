import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DatabaseService } from '../database/database.service';
import {
  ImportSummary,
  ImportUploadResponseDto,
  StagingRowResponse,
} from './dto/upload-response.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly db: DatabaseService) {}

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
        `SELECT national_id FROM employees WHERE company_id = $1`,
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
              company_id, national_id, name, phone, role_type, primary_branch_id, daily_wage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (company_id, national_id) DO NOTHING`,
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
}
