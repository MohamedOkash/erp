# وثيقة عقد واجهات برمجة التطبيقات (API Contract) — نظام إدارة مقاولات البناء (Construction ERP)

هذه الوثيقة تمثل المرجع الشامل والنهائي (Source of Truth) لجميع الـ Endpoints في الـ Backend (`apps/api`) لربط وتكامل واجهات المستخدم (Frontend Integration). تم توثيق جميع المسارات بناءً على الكود المصدري الفعلي والـ DTOs والـ Controllers والـ Services الموجودة داخل المشروع.

---

## 1. القواعد العامة للاتصال (Global Conventions)

- **الرابط الأساسي (Base URL):** `http://localhost:3000/api/v1`
- **نظام التوثيق والأمان (Authentication):**
  - ترويسة الطلب الإلزامية لجميع المسارات المحمية: `Authorization: Bearer <TOKEN>`
  - يتم استخراج هوية الشركة (`company_id`) والمستخدم (`user_id`) تلقائيًا من الـ Token عبر `SessionAuthGuard`.
  - لا يُسمح بتمرير أي ترويسة مثل `x-company-id` تجاوزًا لنظام الأمان.
- **تنسيق البيانات (Content Types):**
  - الطلبات العادية: `Content-Type: application/json`
  - رفع الملفات (XLSX, Documents): `multipart/form-data`
  - تنزيل الملفات: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` أو `application/octet-stream`
- **هيكل الترقيم الموحد (Standard Pagination):**
  ```json
  {
    "data": [ ... ],
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
  ```

---

## 2. موديول المصادقة (Authentication Module)

### 1) تسجيل الدخول (Login)
- **المسار:** `POST /api/v1/auth/login`
- **الوصف:** التحقق من البريد الإلكتروني وكلمة المرور وإنشاء جلسة عمل جديدة (Session Token) صالحة لمدة 24 ساعة.
- **المصادقة:** عام (Public - لا يتطلب Token)
- **الـ Request Body:**
  ```json
  {
    "email": "string (required, email format)",
    "password": "string (required, min 6 chars)"
  }
  ```
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "token": "a1b2c3d4e5f6...",
    "user": {
      "id": "00000000-0000-0000-0003-000000000001",
      "email": "admin@company1.com",
      "fullName": "مدير النظام",
      "role": "admin",
      "companyId": "c0000000-0000-0000-0000-000000000001"
    }
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `200 OK`: تسجيل الدخول بنجاح.
  - `401 Unauthorized`: خطأ في البريد أو كلمة المرور (`INVALID_CREDENTIALS`).
  - `400 Bad Request`: بيانات غير صالحة.

### 2) استعلام بيانات المستخدم الحالي (Get Current User)
- **المسار:** `GET /api/v1/auth/me`
- **الوصف:** استرجاع بيانات المستخدم صاحب الجلسة الحالية وصلاحياته.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "id": "00000000-0000-0000-0003-000000000001",
    "email": "admin@company1.com",
    "fullName": "مدير النظام",
    "role": "admin",
    "companyId": "c0000000-0000-0000-0000-000000000001",
    "permissions": []
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `200 OK`: استرجاع البيانات بنجاح.
  - `401 Unauthorized`: الـ Token غير موجود أو منتهي الصلاحية (`UNAUTHORIZED`).

---

## 3. موديول الموظفين والعمال (Employees Module)

### 1) قائمة الموظفين مع الفلاتر والترقيم (List Employees)
- **المسار:** `GET /api/v1/employees`
- **الوصف:** استعراض قائمة الموظفين والعمال للشركة مع إمكانية الفلترة والبحث.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Query Parameters:**
  - `branchId`: UUID (اختياري)
  - `role`: string (اختياري: `worker`, `engineer`, `supervisor`, إلخ)
  - `isDirectHire`: boolean (اختياري: `true` تعيين مباشر، `false` مقاول باطن)
  - `search`: string (اختياري: بحث بالاسم أو الكود)
  - `nationalId`: string (اختياري: بحث بالرقم القومي)
  - `code`: string (اختياري: كود الموظف)
  - `page`: number (افتراضي 1)
  - `limit`: number (افتراضي 20، أقصى حد 100)
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "e0000000-0000-0000-0000-000000000001",
        "companyId": "c0000000-0000-0000-0000-000000000001",
        "branchId": "b0000000-0000-0000-0000-000000000001",
        "name": "أحمد محمود",
        "code": "EMP-001",
        "role": "worker",
        "nationalId": "29001011234567",
        "phone": "01012345678",
        "isDirectHire": true,
        "dailyWage": "250.00",
        "isActive": true,
        "branchName": "فرع 1"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 2) استعراض موظف محدد (Get Employee by ID)
- **المسار:** `GET /api/v1/employees/:id`
- **الوصف:** استرجاع بيانات موظف محدد وتعييناته الحالية في المشاريع.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "id": "e0000000-0000-0000-0000-000000000001",
    "name": "أحمد محمود",
    "code": "EMP-001",
    "role": "worker",
    "nationalId": "29001011234567",
    "branchName": "فرع 1",
    "assignments": [
      {
        "projectId": "f0000000-0000-0000-0000-000000000001",
        "projectName": "مشروع 1",
        "assignedDate": "2026-01-01"
      }
    ]
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `200 OK`: تم العثور على الموظف.
  - `404 Not Found`: الموظف غير موجود (`EMPLOYEE_NOT_FOUND`).

### 3) إضافة موظف جديد (Create Employee)
- **المسار:** `POST /api/v1/employees`
- **الوصف:** إضافة موظف أو عامل جديد مع فحص فرادة الكود والرقم القومي.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:**
  ```json
  {
    "branchId": "b0000000-0000-0000-0000-000000000001",
    "name": "محمد علي",
    "code": "EMP-002",
    "role": "worker",
    "nationalId": "29501011234568",
    "phone": "01098765432",
    "isDirectHire": true,
    "dailyWage": 300,
    "contractorName": null,
    "isActive": true
  }
  ```
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "id": "uuid-generated",
    "companyId": "c0000000-0000-0000-0000-000000000001",
    "name": "محمد علي",
    "code": "EMP-002",
    "role": "worker",
    "isActive": true
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `201 Created`: تم إنشاء الموظف بنجاح.
  - `409 Conflict`: كود الموظف أو الرقم القومي مكرر (`EMPLOYEE_CODE_DUPLICATE` أو `NATIONAL_ID_DUPLICATE`).

---

## 4. موديول الإنتاجية اليومية (Daily Production Module)

### 1) استعراض سجلات الإنتاج (List Production Records)
- **المسار:** `GET /api/v1/production`
- **الوصف:** استعراض سجلات الإنتاج اليومية مع فلاتر المشروع والفرع والتاريخ والحالة.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Query Parameters:**
  - `projectId`, `branchId`, `workItemId`: UUID (اختياري)
  - `status`: string (`draft`, `submitted`, `supervisor_approved`, `engineer_approved`, `final_approved`, `rejected`, `cancelled`)
  - `fromDate`, `toDate`: ISO Date YYYY-MM-DD
  - `page`, `limit`: number
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "d0000000-0000-0000-0000-000000000001",
        "date": "2026-08-15",
        "productionType": "individual",
        "actualQuantity": "120.00",
        "targetQuantity": "100.00",
        "status": "final_approved",
        "projectName": "مشروع 1",
        "workItemName": "بند 1",
        "branchName": "فرع 1"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 2) تسجيل إنتاجية يومية جديدة (Create Production Record)
- **المسار:** `POST /api/v1/production`
- **الوصف:** تسجيل تقرير إنتاجية يومي لبند عمل محدد مع توزيع الكميات على العمال (فردي/جماعي) والتحقق من قواعد العمل (R5 - إجمالي كميات العمال = إجمالي كمية السجل).
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:**
  ```json
  {
    "branchId": "b0000000-0000-0000-0000-000000000001",
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "workItemId": "00000000-0000-0000-0005-000000000001",
    "workAreaId": "a0000000-0000-0000-0000-000000000001",
    "date": "2026-08-16",
    "productionType": "individual",
    "actualQuantity": 100,
    "targetQuantity": 90,
    "supervisorId": "e0000000-0000-0000-0000-000000000001",
    "notes": "تم إنجاز المطلوب بالكامل",
    "workers": [
      {
        "employeeId": "e0000000-0000-0000-0000-000000000001",
        "workerType": "individual",
        "individualQuantity": 100,
        "hoursWorked": 8
      }
    ]
  }
  ```
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "id": "uuid-generated",
    "status": "draft",
    "actualQuantity": 100,
    "workersCount": 1
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `201 Created`: تم تسجيل الإنتاج.
  - `422 Unprocessable Entity`: عدم تطابق مجموع كميات العمال مع الكمية الكلية (`WORKER_QUANTITY_MISMATCH`).

### 3) اعتماد سجل الإنتاج (Approve Production Record)
- **المسار:** `POST /api/v1/production/:id/approve`
- **الوصف:** اعتماد سجل الإنتاجية وترقيته إلى المرحلة التالية (`supervisor_approved` ثم `engineer_approved` ثم `final_approved`).
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:**
  ```json
  {
    "approvedLevel": "supervisor_approved | engineer_approved | final_approved",
    "notes": "تمت المراجعة والاعتماد"
  }
  ```
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "id": "d0000000-0000-0000-0000-000000000001",
    "status": "final_approved",
    "finalApprovedAt": "2026-08-16T01:00:00Z"
  }
  ```

### 4) طلب تعديل / تصحيح إنتاج (Create Production Correction)
- **المسار:** `POST /api/v1/production/:id/correction`
- **الوصف:** تسجيل طلب تصحيح لكمية الإنتاج مع بيان السبب والكمية المصححة.
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:**
  ```json
  {
    "correctedQuantity": 110,
    "reason": "تصحيح خطأ قياس المساح"
  }
  ```
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "id": "uuid-generated",
    "productionRecordId": "d0000000-0000-0000-0000-000000000001",
    "previousQuantity": 100,
    "correctedQuantity": 110,
    "status": "pending"
  }
  ```

---

## 5. موديول الحضور والانصراف (Attendance Module)

### 1) استعراض سجلات الحضور (List Attendance)
- **المسار:** `GET /api/v1/attendance`
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Query Parameters:** `fromDate`, `toDate`, `employeeId`, `projectId`, `branchId`, `statusId`, `page`, `limit`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "uuid-attendance",
        "date": "2026-08-16",
        "employeeName": "أحمد محمود",
        "statusName": "حاضر",
        "statusCode": "present",
        "checkInTime": "08:00:00",
        "checkOutTime": "16:30:00",
        "overtimeHours": "0.50",
        "projectName": "مشروع 1"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 2) تسجيل حضور جديد (Create Attendance)
- **المسار:** `POST /api/v1/attendance`
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:**
  ```json
  {
    "employeeId": "e0000000-0000-0000-0000-000000000001",
    "statusId": "00000000-0000-0000-0007-000000000001",
    "date": "2026-08-16",
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "branchId": "b0000000-0000-0000-0000-000000000001",
    "checkInTime": "08:00",
    "checkOutTime": "17:00",
    "overtimeHours": 1.0,
    "notes": "حضور منتظم مع ساعة إضافي"
  }
  ```
- **رموز الاستجابة والأخطاء:**
  - `201 Created`: تم تسجيل الحضور.
  - `409 Conflict`: الموظف مسجل حضور بالفعل في نفس التاريخ (`ATTENDANCE_ALREADY_EXISTS`).
  - `422 Unprocessable Entity`: وقت الانصراف يسبق وقت الحضور (`INVALID_TIME_RANGE`).

### 3) تعديل سجل حضور (Update Attendance)
- **المسار:** `PATCH /api/v1/attendance/:id`
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Request Body:** حقول اختيارية (`statusId`, `checkInTime`, `checkOutTime`, `overtimeHours`, `notes`)
- **الـ Response الناجح:** `200 OK`

### 4) حذف سجل حضور (Delete Attendance)
- **المسار:** `DELETE /api/v1/attendance/:id`
- **المصادقة:** إلزامي (`Bearer <TOKEN>`)
- **الـ Response الناجح:** `204 No Content`

---

## 6. موديول الإشعارات (Notifications Module)

### 1) استعراض إشعارات المستخدم الحالي (List Notifications)
- **المسار:** `GET /api/v1/notifications`
- **الـ Query Parameters:** `unreadOnly` (boolean), `page`, `limit`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "uuid-notif",
        "title": "تنبيه انخفاض إنتاجية",
        "body": "سجل مشروع 1 إنتاجية أقل من 80%",
        "type": "alert",
        "data": { "projectId": "f000..." },
        "isRead": false,
        "createdAt": "2026-08-16T01:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "unreadCount": 1
  }
  ```

### 2) عدد الإشعارات غير المقروءة (Unread Count)
- **المسار:** `GET /api/v1/notifications/unread-count`
- **الـ Response:** `{ "count": 3 }`

### 3) إنشاء إشعار (Create Notification)
- **المسار:** `POST /api/v1/notifications`
- **الـ Request Body:** `{ "userId": "uuid", "title": "string", "body": "string", "type": "info", "data": {} }`

### 4) تعليم إشعار كمقروء (Mark as Read)
- **المسار:** `PATCH /api/v1/notifications/:id/read` $\rightarrow$ `200 OK`

### 5) تعليم جميع الإشعارات كمقروءة (Mark All as Read)
- **المسار:** `POST /api/v1/notifications/mark-all-read` $\rightarrow$ `{ "success": true, "count": 5 }`

---

## 7. موديول التنبيهات الذكية (Alert Rules & Engine)

### 1) قائمة قواعد التنبيهات (List Alert Rules)
- **المسار:** `GET /api/v1/alert-rules`
- **الـ Response الناجح (200 OK):** `{ "data": [...], "total": 2, "page": 1, "totalPages": 1 }`

### 2) إنشاء قاعدة تنبيه (Create Alert Rule)
- **المسار:** `POST /api/v1/alert-rules`
- **الـ Request Body:**
  ```json
  {
    "name": "تنبيه تجاوز هدر المواد 10%",
    "type": "material_waste",
    "condition": {
      "metric": "waste_percentage",
      "operator": ">",
      "threshold": 10
    },
    "threshold": 10,
    "enabled": true
  }
  ```
- **الـ Response الناجح:** `201 Created` (أو `409 Conflict` `ALERT_RULE_NAME_DUPLICATE`).

### 3) تعديل وحذف قاعدة تنبيه
- **المسار:** `PATCH /api/v1/alert-rules/:id` $\rightarrow$ `200 OK`
- **المسار:** `DELETE /api/v1/alert-rules/:id` $\rightarrow$ `204 No Content`

### 4) تشغيل التقييم الفوري للقواعد (Evaluate Now)
- **المسار:** `POST /api/v1/alert-rules/evaluate-now`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "evaluatedCount": 3,
    "triggeredCount": 1,
    "notificationsSent": 2
  }
  ```

---

## 8. موديول التكاليف والمصروفات (Costs Module)

### 1) قائمة قيود التكاليف مع الفلاتر (List Costs)
- **المسار:** `GET /api/v1/costs`
- **الـ Query Parameters:** `fromDate`, `toDate`, `projectId`, `branchId`, `category` (`labor`, `material`, `equipment`, `overhead`), `page`, `limit`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "uuid-cost",
        "date": "2026-08-16",
        "category": "material",
        "amount": "15000.00",
        "description": "شراء حديد تسليح",
        "referenceNumber": "INV-2026-001",
        "projectName": "مشروع 1",
        "branchName": "فرع 1"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 2) ملخص التكاليف والمجاميع (Costs Summary)
- **المسار:** `GET /api/v1/costs/summary`
- **الـ Query Parameters:** `fromDate`, `toDate`, `projectId`, `branchId`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "byProject": [{ "projectId": "f000...", "projectName": "مشروع 1", "totalAmount": 15000 }],
    "byBranch": [{ "branchId": "b000...", "branchName": "فرع 1", "totalAmount": 15000 }],
    "byCategory": [{ "category": "material", "totalAmount": 15000 }],
    "grandTotal": 15000
  }
  ```

### 3) إضافة قيد تكلفة (Create Cost Entry)
- **المسار:** `POST /api/v1/costs`
- **الـ Request Body:**
  ```json
  {
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "branchId": "b0000000-0000-0000-0000-000000000001",
    "category": "material",
    "date": "2026-08-16",
    "amount": 5000,
    "description": "خرسانة جاهزة",
    "referenceNumber": "REC-901"
  }
  ```
- **الـ Response الناجح:** `201 Created`

### 4) الحساب التلقائي لتكلفة العمالة من الحضور (Labor Auto-Calculate)
- **المسار:** `POST /api/v1/costs/labor-auto-calculate`
- **الوصف:** احتساب تكلفة العمالة تلقائيًا من سجلات الحضور والأجور اليومية والإضافي:
  $\text{Total} = (\text{Days Present} \times \text{Daily Wage}) + (\text{Overtime Hours} \times (\frac{\text{Daily Wage}}{8} \times 1.5))$
- **الـ Request Body:** `{ "fromDate": "2026-08-01", "toDate": "2026-08-16", "projectId": "f000..." }`
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "createdEntriesCount": 1,
    "totalAmount": 2875.00,
    "entries": [ ... ]
  }
  ```

---

## 9. موديول الحوافز والمكافآت (Incentives Module)

### 1) قواعد الحوافز (Incentive Rules CRUD)
- **`GET /api/v1/incentive-rules`**: قائمة القواعد مع الترقيم.
- **`POST /api/v1/incentive-rules`**: إضافة قاعدة جديدة.
  - **Body:** `{ "name": "مكافأة 110% إنتاج", "type": "production_bonus", "thresholdPercentage": 110, "rewardAmount": 500, "enabled": true }`
  - **Conflict (409):** `INCENTIVE_RULE_NAME_DUPLICATE`
- **`PATCH /api/v1/incentive-rules/:id`**: تعديل قاعدة.
- **`DELETE /api/v1/incentive-rules/:id`**: حذف قاعدة $\rightarrow$ `204 No Content`.

### 2) احتساب الحوافز والمكافآت (Calculate Incentives)
- **المسار:** `POST /api/v1/incentives/calculate`
- **الوصف:** حساب مستحقات العمال بمقارنة نسبة الإنجاز الفعلي مقابل المستهدف بالحد الأدنى للقاعدة.
- **الـ Request Body:** `{ "fromDate": "2026-08-01", "toDate": "2026-08-16", "employeeIds": [] }`
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "calculations": [
      {
        "employeeId": "e0000000-0000-0000-0000-000000000001",
        "employeeName": "أحمد محمود",
        "projectId": "f0000000-0000-0000-0000-000000000001",
        "ruleId": "uuid-rule",
        "ruleName": "مكافأة 110% إنتاج",
        "amount": 500,
        "reason": "تحقيق نسبة إنجاز 120.0% متجاوزة الحد المستهدف (110%)",
        "percentage": 120.0
      }
    ],
    "totalAmount": 500
  }
  ```

### 3) اعتماد وصرف الحوافز (Approve Incentives)
- **المسار:** `POST /api/v1/incentives/approve`
- **الـ Request Body:**
  ```json
  {
    "calculations": [
      {
        "employeeId": "e0000000-0000-0000-0000-000000000001",
        "ruleId": "uuid-rule",
        "amount": 500,
        "notes": "معتمد لشهر أغسطس"
      }
    ]
  }
  ```
- **الـ Response الناجح (201 Created):** `{ "createdCount": 1, "totalAmount": 500 }`

### 4) دفتر سجل الحوافز (Incentive Ledger)
- **المسار:** `GET /api/v1/incentive-ledger`
- **الـ Query Params:** `fromDate`, `toDate`, `employeeId`, `status` (`pending`, `approved`, `paid`, `cancelled`), `page`, `limit`
- **الـ Response الناجح (200 OK):**
  ```json
  {
    "data": [ ... ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "summary": {
      "totalPending": 500,
      "totalPaid": 0,
      "grandTotal": 500
    }
  }
  ```

### 5) صرف الحافز (Mark as Paid)
- **المسار:** `PATCH /api/v1/incentive-ledger/:id/mark-paid` $\rightarrow$ `200 OK` (`status: "paid"`)

---

## 10. موديول إدارة المستندات والمخططات (Documents Module)

### 1) رفع مستند جديد (Upload Document)
- **المسار:** `POST /api/v1/documents/upload`
- **التنسيق:** `multipart/form-data`
- **الحقول:**
  - `file`: Binary File (إلزامي)
  - `title`: string (اختياري)
  - `category`: string (اختياري - يتم إنشاء الفئة تلقائيًا إذا لم تكن موجودة)
  - `categoryId`: UUID (اختياري)
  - `projectId`: UUID (اختياري)
  - `documentNumber`: string (اختياري)
  - `notes`: string (اختياري)
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "id": "uuid-doc",
    "title": "مخطط الموقع العام",
    "categoryId": "uuid-cat",
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "documentNumber": "DOC-2026-001",
    "fileName": "site_plan.pdf",
    "fileSize": 102400,
    "fileUrl": "uploads/documents/2026/08/16/uuid_site_plan.pdf",
    "version": 1,
    "createdAt": "2026-08-16T01:00:00Z"
  }
  ```

### 2) قائمة المستندات (List Documents)
- **المسار:** `GET /api/v1/documents`
- **الـ Query Params:** `projectId`, `categoryId`, `category`, `page`, `limit`
- **الـ Response الناجح (200 OK):** `{ "data": [...], "total": 1, "page": 1, "limit": 20, "totalPages": 1 }`

### 3) تحميل المستند (Download Document)
- **المسار:** `GET /api/v1/documents/:id/download`
- **الـ Query Params:** `version` (رقم الإصدار اختياري - الافتراضي الإصدار الأحدث)
- **الـ Response:** Binary Stream مع ترويسات `Content-Disposition: attachment; filename="..."` و `Content-Type: application/octet-stream`.

### 4) رفع إصدار جديد للمستند (Upload New Version)
- **المسار:** `POST /api/v1/documents/:id/upload-new-version`
- **التنسيق:** `multipart/form-data` (`file`, `notes`)
- **الـ Response الناجح (201 Created):** `{ "documentId": "uuid-doc", "version": 2, "fileName": "site_plan_v2.pdf" }`

### 5) استعراض إصدارات المستند (Get Document Versions)
- **المسار:** `GET /api/v1/documents/:id/versions` $\rightarrow$ `{ "versions": [ { "version": 2 }, { "version": 1 } ] }`

### 6) حذف مستند (Delete Document)
- **المسار:** `DELETE /api/v1/documents/:id`
- **الوصف:** حذف المستند وكافة إصداراته وتنظيف الملفات الفعلية من القرص الصلب.
- **الـ Response الناجح:** `204 No Content`

---

## 11. موديول التقارير المحفوظة (Saved Reports Module)

### 1) قائمة التقارير المحفوظة (List Saved Reports)
- **المسار:** `GET /api/v1/saved-reports`
- **الوصف:** استعراض التقارير الخاصة بالمستخدم والتقارير العامة والمشتركة معه.
- **الـ Response الناجح (200 OK):** `{ "data": [...], "total": 1, "page": 1, "totalPages": 1 }`

### 2) إنشاء وحفظ تقرير جديد (Create Saved Report)
- **المسار:** `POST /api/v1/saved-reports`
- **الـ Request Body:**
  ```json
  {
    "name": "تقرير الإنتاج اليومي للمشاريع",
    "reportType": "production | attendance | costs | boq",
    "filters": { "status": "final_approved" },
    "columns": ["date", "actual_quantity", "target_quantity", "project_name"],
    "isPublic": true,
    "sharedUserIds": []
  }
  ```
- **الـ Response الناجح:** `201 Created` (أو `409 Conflict` `SAVED_REPORT_NAME_DUPLICATE`).

### 3) تشغيل التقرير ديناميكيًا (Run Saved Report)
- **المسار:** `POST /api/v1/saved-reports/:id/run`
- **الوصف:** تنفيذ استعلام التقرير حسب نوعه وفلاتره وإرجاع البيانات المجمعة.
- **الـ Response الناجح (201 Created):**
  ```json
  {
    "report": {
      "id": "uuid-report",
      "name": "تقرير الإنتاج اليومي للمشاريع",
      "reportType": "production"
    },
    "data": [ ... ],
    "total": 15,
    "summary": { "totalRecords": 15, "totalActualQuantity": 1850.5 }
  }
  ```

### 4) مشاركة التقرير مع مستخدمين (Share Saved Report)
- **المسار:** `POST /api/v1/saved-reports/:id/share`
- **الـ Request Body:** `{ "userIds": ["uuid-user-1", "uuid-user-2"] }`
- **الـ Response الناجح:** `{ "sharedCount": 2 }`

### 5) تعديل وحذف التقرير
- **المسار:** `PATCH /api/v1/saved-reports/:id` $\rightarrow$ `200 OK`
- **المسار:** `DELETE /api/v1/saved-reports/:id` $\rightarrow$ `204 No Content`

---

## 12. موديول الاستيراد والتصدير عبر الإكسيل (XLSX Import/Export)

### أ) الاستيراد (Import with 2-Phase Staging & Validation)
تعتمد جميع عمليات الاستيراد على مرحلتين:
1. رفع الملف للتحقق والمعاينة (`/upload`) $\rightarrow$ يرجع `stagingId` وإحصائيات بالأخطاء والسجلات الصالحة.
2. اعتماد الإدراج الفعلي في قاعدة البيانات (`/commit`) $\rightarrow$ إدراج نهائي مع RLS Transactions.

| الموديول | مسار الرفع والمعاينة (Upload) | مسار الاعتماد النهائي (Commit) |
| :--- | :--- | :--- |
| **الموظفين (Employees)** | `POST /api/v1/imports/employees/upload` | `POST /api/v1/imports/employees/commit` |
| **الإنتاجية (Production)** | `POST /api/v1/imports/production/upload` | `POST /api/v1/imports/production/commit` |
| **المقايسة (BOQ)** | `POST /api/v1/imports/boq/upload` | `POST /api/v1/imports/boq/commit` |
| **الحضور (Attendance)** | `POST /api/v1/imports/attendance/upload` | `POST /api/v1/imports/attendance/commit` |

- **هيكل استجابة الرفع (Upload Response Structure):**
  ```json
  {
    "stagingId": "c4d8e9f0-1234-5678-90ab-cdef12345678",
    "totalRows": 50,
    "validRows": 48,
    "invalidRows": 2,
    "errors": [
      { "row": 5, "field": "code", "message": "كود الموظف مكرر في النظام" }
    ],
    "preview": [ ... ]
  }
  ```
- **هيكل طلب الاعتماد (Commit Request Body):**
  ```json
  {
    "stagingId": "c4d8e9f0-1234-5678-90ab-cdef12345678"
  }
  ```
- **هيكل استجابة الاعتماد (Commit Response):**
  ```json
  {
    "success": true,
    "insertedCount": 48
  }
  ```

---

### ب) التصدير والقوالب (Export & Templates)

| الموديول | مسار تنزيل القالب الفارغ (Template) | مسار تصدير البيانات الكاملة (Export) |
| :--- | :--- | :--- |
| **الموظفين (Employees)** | `GET /api/v1/exports/employees/template` | `GET /api/v1/exports/employees` |
| **الإنتاجية (Production)** | `GET /api/v1/exports/production/template` | `GET /api/v1/exports/production` |
| **المقايسة (BOQ)** | `GET /api/v1/exports/boq/template` | `GET /api/v1/exports/boq` |
| **الحضور (Attendance)** | `GET /api/v1/exports/attendance/template` | `GET /api/v1/exports/attendance` |

- **الاستجابة:** ملف Excel بتنسيق `.xlsx` مع ترويسة `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## 13. ملحق (Appendix)

### أ) جدول رموز الأخطاء المخصصة (Custom Error Codes)

| Error Code | Message (الوصف) | Module | HTTP Status |
| :--- | :--- | :--- | :--- |
| `INVALID_CREDENTIALS` | البريد الإلكتروني أو كلمة المرور غير صحيحة | Auth | 401 Unauthorized |
| `UNAUTHORIZED` | الجلسة غير مصرح بها أو الـ Token مفقود | Auth | 401 Unauthorized |
| `EMPLOYEE_NOT_FOUND` | الموظف غير موجود في الشركة | Employees | 404 Not Found |
| `EMPLOYEE_CODE_DUPLICATE` | كود الموظف مستخدم بالفعل | Employees | 409 Conflict |
| `NATIONAL_ID_DUPLICATE` | الرقم القومي مسجل لموظف آخر | Employees | 409 Conflict |
| `PRODUCTION_RECORD_NOT_FOUND` | سجل الإنتاج غير موجود | Production | 404 Not Found |
| `WORKER_QUANTITY_MISMATCH` | مجموع كميات العمال لا يطابق إجمالي كمية السجل | Production | 422 Unprocessable Entity |
| `ATTENDANCE_NOT_FOUND` | سجل الحضور غير موجود | Attendance | 404 Not Found |
| `ATTENDANCE_ALREADY_EXISTS` | الموظف مسجل حضور بالفعل في هذا التاريخ | Attendance | 409 Conflict |
| `INVALID_TIME_RANGE` | وقت الانصراف يجب أن يكون بعد وقت الحضور | Attendance | 422 Unprocessable Entity |
| `ALERT_RULE_NOT_FOUND` | قاعدة التنبيه غير موجودة | Alerts | 404 Not Found |
| `ALERT_RULE_NAME_DUPLICATE` | اسم قاعدة التنبيه مكرر في الشركة | Alerts | 409 Conflict |
| `COST_ENTRY_NOT_FOUND` | قيد التكلفة غير موجود | Costs | 404 Not Found |
| `INCENTIVE_RULE_NOT_FOUND` | قاعدة الحوافز غير موجودة | Incentives | 404 Not Found |
| `INCENTIVE_RULE_NAME_DUPLICATE`| اسم قاعدة الحوافز مكرر في الشركة | Incentives | 409 Conflict |
| `INCENTIVE_LEDGER_ENTRY_NOT_FOUND` | قيد دفتر الحوافز غير موجود | Incentives | 404 Not Found |
| `DOCUMENT_NOT_FOUND` | المستند غير موجود | Documents | 404 Not Found |
| `DOCUMENT_VERSION_NOT_FOUND` | إصدار المستند المطلوب غير موجود | Documents | 404 Not Found |
| `DOCUMENT_FILE_NOT_FOUND` | الملف غير موجود على وحدة التخزين | Documents | 404 Not Found |
| `SAVED_REPORT_NOT_FOUND` | التقرير المحفوظ غير موجود | Reports | 404 Not Found |
| `SAVED_REPORT_NAME_DUPLICATE`| اسم التقرير مكرر للمستخدم الحالي | Reports | 409 Conflict |
| `STAGING_NOT_FOUND` | جلسة الاستيراد المؤقتة غير موجودة أو منتهية | Imports | 404 Not Found |

---

### ب) 5 أمثلة كاملة للاستخدام (5 End-to-End Examples)

#### 1. تسجيل الدخول (Login)
- **Request:**
  ```http
  POST /api/v1/auth/login HTTP/1.1
  Host: localhost:3000
  Content-Type: application/json

  {
    "email": "admin@company1.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "d7a8e520-912b-4567-89ab-1234567890cd",
    "user": {
      "id": "00000000-0000-0000-0003-000000000001",
      "email": "admin@company1.com",
      "fullName": "مدير النظام",
      "role": "admin",
      "companyId": "c0000000-0000-0000-0000-000000000001"
    }
  }
  ```

---

#### 2. تسجيل تقرير إنتاجية يومي (Create Production Record)
- **Request:**
  ```http
  POST /api/v1/production HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer d7a8e520-912b-4567-89ab-1234567890cd
  Content-Type: application/json

  {
    "branchId": "b0000000-0000-0000-0000-000000000001",
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "workItemId": "00000000-0000-0000-0005-000000000001",
    "workAreaId": "a0000000-0000-0000-0000-000000000001",
    "date": "2026-08-16",
    "productionType": "individual",
    "actualQuantity": 100,
    "targetQuantity": 90,
    "supervisorId": "e0000000-0000-0000-0000-000000000001",
    "notes": "أعمال تشطيبات الدور الأول",
    "workers": [
      {
        "employeeId": "e0000000-0000-0000-0000-000000000001",
        "workerType": "individual",
        "individualQuantity": 100,
        "hoursWorked": 8
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "d0000000-0000-0000-0000-000000000099",
    "status": "draft",
    "actualQuantity": 100,
    "workersCount": 1
  }
  ```

---

#### 3. اعتماد سجل إنتاجية (Approve Production Record)
- **Request:**
  ```http
  POST /api/v1/production/d0000000-0000-0000-0000-000000000099/approve HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer d7a8e520-912b-4567-89ab-1234567890cd
  Content-Type: application/json

  {
    "approvedLevel": "final_approved",
    "notes": "تم الاعتماد النهائي بعد المعاينة"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "d0000000-0000-0000-0000-000000000099",
    "status": "final_approved",
    "finalApprovedAt": "2026-08-16T01:30:00.000Z"
  }
  ```

---

#### 4. استيراد ملف إكسيل موظفين (Upload & Preview Employee Excel)
- **Request:**
  ```http
  POST /api/v1/imports/employees/upload HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer d7a8e520-912b-4567-89ab-1234567890cd
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

  ------WebKitFormBoundary7MA4YWxkTrZu0gW
  Content-Disposition: form-data; name="file"; filename="employees_batch_01.xlsx"
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

  [Binary Excel Data]
  ------WebKitFormBoundary7MA4YWxkTrZu0gW--
  ```
- **Response (201 Created):**
  ```json
  {
    "stagingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "totalRows": 25,
    "validRows": 25,
    "invalidRows": 0,
    "errors": [],
    "preview": [
      {
        "rowNumber": 2,
        "name": "إبراهيم حسن",
        "code": "EMP-105",
        "role": "worker",
        "nationalId": "29102031234567",
        "dailyWage": 300,
        "branchName": "فرع 1"
      }
    ]
  }
  ```

---

#### 5. البحث عن موظف بالرقم القومي (Search Employee by National ID)
- **Request:**
  ```http
  GET /api/v1/employees?nationalId=29001011234567 HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer d7a8e520-912b-4567-89ab-1234567890cd
  ```
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "e0000000-0000-0000-0000-000000000001",
        "companyId": "c0000000-0000-0000-0000-000000000001",
        "branchId": "b0000000-0000-0000-0000-000000000001",
        "name": "أحمد محمود",
        "code": "EMP-001",
        "role": "worker",
        "nationalId": "29001011234567",
        "phone": "01012345678",
        "isDirectHire": true,
        "dailyWage": "250.00",
        "isActive": true,
        "branchName": "فرع 1"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```
