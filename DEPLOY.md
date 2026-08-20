# دليل نشر وتشغيل منظومة المقاولات (Construction ERP Deployment Guide)

يوثق هذا الدليل خطوات النشر الاحترافي لمنظومة المقاولات (`Construction ERP`) عبر مسارين متكاملين:
1. **المسار (أ):** سيرفر سحابي خاص (VPS) باستخدام Docker Compose + Nginx + شهادة SSL مجانية (Certbot).
2. **المسار (ب):** الاستضافة السحابية المدارة/المجانية (Managed / Serverless / PaaS).

---

## متطلبات التشغيل العامة (Prerequisites)

- **قاعدة بيانات PostgreSQL:** إصدار 14+ (موصى بـ Supabase أو AWS RDS أو PostgreSQL Container).
- **Node.js:** إصدار 20 LTS أو أعلى.
- **Docker & Docker Compose:** في حال اختيار مسار الحاويات (VPS).

## التطوير المحلي (Local Development)
يتم تشغيل بيئة التطوير المحلية الموحدة (الباكيند والواجهة معًا لمنع مشكلة 502) بأمر: `npm run dev` فقط.

---

## المسار (أ): النشر على سيرفر خاص (VPS / Dedicated Server)

هذا هو المسار الأفضل والأنسب للإنتاج المؤسسي وضمان أعلى درجات الأداء والأمان.

### الخطوة 1: استنساخ المشروع وإعداد المتغيرات البيئية

```bash
# 1. استنساخ المستودع
git clone <YOUR_REPOSITORY_URL> /opt/construction-erp
cd /opt/construction-erp

# 2. إنشاء ملف المتغيرات البيئية من القالب
cp .env.example .env

# 3. تعديل المتغيرات البيئية
nano .env
```

تأكد من ضبط المتغيرات التالية داخل `.env`:
- `DATABASE_URL`: رابط اتصال قاعدة البيانات المباشر.
- `JWT_SECRET`: مفتاح تشفير عشوائي قوي (32 حرفًا على الأقل).
- `CORS_ORIGIN`: دومين الواجهة الأمامية (مثل: `https://erp.yourcompany.com`).
- `NODE_ENV`: اضبطه دائمًا على `production`.

### الخطوة 2: تطبيق الـ Migrations وتهيئة النظام

```bash
# تطبيق جميع الهياكل والـ Bootstrap دون أي بيانات وهمية
NODE_ENV=production node scripts/apply-migrations.js
```

### الخطوة 3: بناء وتشغيل الحاويات عبر Docker Compose

```bash
# بناء وتشغيل الخدمات في الخلفية
docker compose up -d --build

# التحقق من حالة الخدمات وسجلات التشغيل
docker compose ps
docker compose logs -f api
```

### الخطوة 4: ضبط الدومين وشهادة الأمان SSL (Certbot)

على السيرفر الرئيسي (Host)، قم بتثبيت Nginx و Certbot لتوجيه الدومين إلى الحاوية:

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# إعداد ملف Nginx Host: /etc/nginx/sites-available/erp.yourcompany.com
sudo nano /etc/nginx/sites-available/erp.yourcompany.com
```

محتوى الإعداد:
```nginx
server {
    server_name erp.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:80; # منفذ حاوية الويب
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

تفعيل وتوليد الشهادة:
```bash
sudo ln -s /etc/nginx/sites-available/erp.yourcompany.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# استخراج شهادة SSL مجانية تلقائية التجديد
sudo certbot --nginx -d erp.yourcompany.com
```

---

## المسار (ج): النشر المجاني الموحد على منصة Vercel (Single-Platform Fullstack)

تم تجهيز المنظومة بملف إعداد موحد `vercel.json` ومعالج سحابي خفيف `api/index.ts` لتمكين النشر الكامل (API + Web Frontend) على منصة Vercel بنقرة واحدة ومجاناً 100%.

### أوامر النشر السريع (3 خطوات فقط):

```bash
# 1. تثبيت Vercel CLI (اختياري، أو النشر المباشر عبر ربط GitHub)
npm install -g vercel

# 2. تطبيق الهياكل المرجعية على قاعدة بيانات Supabase الحية
NODE_ENV=production node scripts/apply-migrations.js

# 3. النشر الفوري للإنتاج
vercel --prod
```

### المتغيرات البيئية المطلوبة في لوحة تحكم Vercel (Project Settings -> Environment Variables):
- `DATABASE_URL`: رابط اتصال قاعدة بيانات Supabase المباشر (Session Pooler أو Direct).
- `JWT_SECRET`: مفتاح تشفير أمان الجلسات (سلسلة عشوائية 32+ حرف).
- `NODE_ENV`: اضبط القيمة على `production`.

---

## قائمة الفحص قبل العرض المباشر (Pre-Demo Production Checklist)

| البند | الوصف | الحالة الموصى بها |
| :--- | :--- | :---: |
| **تغيير كلمة مرور الأدمن** | تغيير كلمة المرور الافتراضية لحساب `admin` عبر شاشة إعدادات الحساب إلى كلمة سر قوية. | ✔ إلزامي |
| **نظافة البيانات التشغيلية** | التأكد من خلو الجداول من أي بيانات تجريبية عبر تشغيل `scripts/purge-demo-data.js`. | ✔ إلزامي |
| **تقييد نطاق الـ CORS** | التأكد من ضبط `CORS_ORIGIN` في الـ API على دومين الموقع المعتمد فقط وعدم تركه مفتوحًا في بيئة الإنتاج. | ✔ إلزامي |
| **تفعيل عزل البيانات RLS** | التأكد من عمل سياسات Row-Level Security على مستوى الشركات والمشاريع. | ✔ مفعّل ومختبر |
| **فحص سجلات الأخطاء** | التأكد من عدم وجود طباعة للمفاتيح الحساسة في `console.log`. | ✔ نظيف |
| **اختبار سلامة اللغات** | التأكد من اكتمال ترجمة جميع مفاتيح اللغات (عربي / إنجليزي / أوردو) بنسبة 100%. | ✔ 1931 مفتاح مكتمل (0 أخطاء) |

