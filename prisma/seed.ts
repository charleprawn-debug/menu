import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncPermissions, createRestaurantWithDefaults } from "../src/lib/services/restaurant";
import { seedDemoRestaurant } from "./seed-demo";

const db = new PrismaClient();

const PASSWORD = "Admin123!";

async function truncateAll() {
  await db.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

async function main() {
  console.log("→ Clearing existing data…");
  await truncateAll();

  console.log("→ Syncing permissions…");
  const permissionCount = await syncPermissions();
  console.log(`   ${permissionCount} permissions`);

  console.log("→ Seeding features & plans…");
  const featureDefs = [
    { key: "digital_menu", nameAr: "منيو رقمي", nameEn: "Digital menu", category: "CORE" },
    { key: "qr_ordering", nameAr: "الطلب عبر QR", nameEn: "QR ordering", category: "CORE" },
    { key: "table_management", nameAr: "إدارة الطاولات", nameEn: "Table management", category: "CORE" },
    { key: "order_management", nameAr: "إدارة الطلبات", nameEn: "Order management", category: "CORE" },
    { key: "kitchen_display", nameAr: "شاشة المطبخ", nameEn: "Kitchen display", category: "OPERATIONS" },
    { key: "staff_management", nameAr: "إدارة الموظفين", nameEn: "Staff management", category: "CORE" },
    { key: "analytics", nameAr: "التقارير والتحليلات", nameEn: "Reports & analytics", category: "GROWTH" },
    { key: "ai_assistant", nameAr: "المساعد الذكي", nameEn: "AI assistant", category: "GROWTH" },
    { key: "multi_branch", nameAr: "تعدد الفروع", nameEn: "Multi-branch", category: "SCALE" },
    { key: "pos", nameAr: "نقطة البيع", nameEn: "POS", category: "OPERATIONS" },
    { key: "inventory", nameAr: "المخزون", nameEn: "Inventory", category: "SCALE" },
    { key: "custom_domain", nameAr: "نطاق مخصص", nameEn: "Custom domain", category: "SCALE" },
    { key: "reservations", nameAr: "الحجوزات", nameEn: "Reservations", category: "OPERATIONS" },
    { key: "marketing", nameAr: "التسويق والكوبونات", nameEn: "Marketing & coupons", category: "GROWTH" },
    { key: "loyalty", nameAr: "برنامج الولاء", nameEn: "Loyalty", category: "GROWTH" },
    { key: "delivery", nameAr: "إدارة التوصيل", nameEn: "Delivery management", category: "OPERATIONS" },
    { key: "webhooks", nameAr: "Webhooks والتكاملات", nameEn: "Webhooks & integrations", category: "SCALE" },
    { key: "api_access", nameAr: "واجهة API", nameEn: "API access", category: "SCALE" },
  ];

  const features: Record<string, string> = {};
  for (const feature of featureDefs) {
    const created = await db.feature.create({ data: feature });
    features[feature.key] = created.id;
  }

  const planDefs = [
    {
      key: "starter",
      name: "Starter",
      nameEn: "Starter",
      description: "لمطعم واحد صغير يبدأ رحلته الرقمية.",
      descriptionEn: "For one small restaurant getting started with digital operations.",
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      maxBranches: 1,
      maxStaff: 5,
      maxTables: 10,
      maxProducts: 50,
      storageMb: 500,
      isPopular: false,
      sortOrder: 1,
      features: ["digital_menu", "qr_ordering", "table_management", "order_management", "staff_management", "analytics"],
    },
    {
      key: "pro",
      name: "Pro",
      nameEn: "Pro",
      description: "للمطاعم النامية التي تحتاج تشغيلاً كاملاً.",
      descriptionEn: "For growing restaurants that need a complete operations toolkit.",
      monthlyPrice: 249,
      yearlyPrice: 2490,
      trialDays: 14,
      maxBranches: 3,
      maxStaff: 25,
      maxTables: 40,
      maxProducts: 300,
      storageMb: 5000,
      isPopular: true,
      sortOrder: 2,
      features: [
        "digital_menu",
        "qr_ordering",
        "table_management",
        "order_management",
        "kitchen_display",
        "staff_management",
        "analytics",
        "pos",
        "reservations",
        "marketing",
        "delivery",
      ],
    },
    {
      key: "business",
      name: "Business",
      nameEn: "Business",
      description: "لسلاسل المطاعم والفروع المتعددة.",
      descriptionEn: "For restaurant groups and multi-location operations.",
      monthlyPrice: 599,
      yearlyPrice: 5990,
      trialDays: 14,
      maxBranches: -1,
      maxStaff: -1,
      maxTables: -1,
      maxProducts: -1,
      storageMb: 50000,
      isPopular: false,
      sortOrder: 3,
      features: featureDefs.map((f) => f.key),
    },
  ];

  const plans: Record<string, string> = {};
  for (const plan of planDefs) {
    const created = await db.plan.create({
      data: {
        key: plan.key,
        name: plan.name,
        nameEn: plan.nameEn,
        description: plan.description,
        descriptionEn: plan.descriptionEn,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: "SAR",
        trialDays: plan.trialDays,
        maxBranches: plan.maxBranches,
        maxStaff: plan.maxStaff,
        maxTables: plan.maxTables,
        maxProducts: plan.maxProducts,
        storageMb: plan.storageMb,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        features: {
          create: plan.features.map((key) => ({ featureId: features[key] })),
        },
      },
    });
    plans[plan.key] = created.id;
  }

  console.log("→ Seeding menu themes…");
  const themes = [
    { key: "classic", name: "كلاسيكي", description: "تصميم دافئ بألوان ترابية", config: { layout: "grid", cardStyle: "elevated", radius: 16 } },
    { key: "modern", name: "عصري", description: "خطوط نظيفة ومساحات واسعة", config: { layout: "grid", cardStyle: "flat", radius: 12 } },
    { key: "elegant", name: "أنيق", description: "داكن مع لمسات ذهبية", config: { layout: "list", cardStyle: "bordered", radius: 8 } },
    { key: "minimal", name: "بسيط", description: "أبيض هادئ وتركيز على الصور", config: { layout: "grid", cardStyle: "minimal", radius: 4 } },
    { key: "vibrant", name: "حيوي", description: "ألوان جريئة لعلامات شبابية", config: { layout: "masonry", cardStyle: "filled", radius: 20 } },
  ];
  for (const [index, theme] of themes.entries()) {
    await db.menuTheme.create({
      data: { ...theme, isDefault: index === 0 },
    });
  }

  console.log("→ Seeding platform settings…");
  const settings = [
    { key: "platform_name", value: "DineFlow", group: "BRAND" },
    { key: "support_email", value: "support@dineflow.app", group: "CONTACT" },
    { key: "default_currency", value: "SAR", group: "LOCALIZATION" },
    { key: "default_locale", value: "ar", group: "LOCALIZATION" },
    { key: "trial_days", value: 14, group: "BILLING" },
    { key: "maintenance_mode", value: false, group: "SYSTEM" },
    { key: "allow_registration", value: true, group: "SYSTEM" },
    { key: "terms_url", value: "/terms", group: "LEGAL" },
    { key: "privacy_url", value: "/privacy", group: "LEGAL" },
  ];
  for (const setting of settings) {
    await db.platformSetting.create({ data: { key: setting.key, value: setting.value as never, group: setting.group } });
  }

  console.log("→ Creating platform admin…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const admin = await db.user.create({
    data: {
      name: "مدير المنصة",
      email: "admin@dineflow.app",
      passwordHash,
      isPlatformAdmin: true,
      platformRole: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  console.log("→ Creating demo owner & restaurant…");
  const owner = await db.user.create({
    data: {
      name: "سامي العتيبي",
      email: "owner@dineflow.app",
      passwordHash,
      phone: "+966 55 123 4567",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  const restaurant = await createRestaurantWithDefaults({
    userId: owner.id,
    name: "مطعم البيت الشامي",
    description:
      "مطبخ شامي أصيل يقدّم المشاوي والمقبلات الشرقية بأجواء عائلية دافئة في قلب الرياض.",
    cuisineType: "مطبخ شامي",
    country: "السعودية",
    city: "الرياض",
    address: "طريق الملك فهد، حي العليا، الرياض",
    phone: "+966 11 456 7890",
    email: "hello@alshami.sa",
    currency: "SAR",
    timezone: "Asia/Riyadh",
    locale: "ar",
  });

  await db.restaurant.update({
    where: { id: restaurant.id },
    data: {
      slug: "demo",
      status: "ACTIVE",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
      primaryColor: "#059669",
      secondaryColor: "#0f172a",
      openingHours: {
        sun: { open: "12:00", close: "01:00", closed: false },
        mon: { open: "12:00", close: "01:00", closed: false },
        tue: { open: "12:00", close: "01:00", closed: false },
        wed: { open: "12:00", close: "01:00", closed: false },
        thu: { open: "12:00", close: "02:00", closed: false },
        fri: { open: "13:00", close: "02:00", closed: false },
        sat: { open: "12:00", close: "02:00", closed: false },
      },
      orderSettings: {
        requireApproval: false,
        autoAccept: true,
        minOrder: 20,
        maxOrder: 5000,
        allowWhenClosed: false,
        defaultPrepMinutes: 20,
        allowEdit: true,
        allowCancel: true,
        maxConcurrent: 40,
        serviceFeeRate: 0,
        deliveryFee: 12,
        taxRate: 15,
      },
      paymentSettings: {
        cash: true,
        card: true,
        online: true,
        wallet: false,
        payAtPickup: true,
        payOnDelivery: true,
      },
      reservationSettings: {
        enabled: true,
        autoConfirm: false,
        maxGuests: 12,
        durationMinutes: 90,
        slotMinutes: 30,
        maxPerSlot: 4,
        cancelHours: 2,
      },
      notificationSettings: {
        newOrder: true,
        cancelledOrder: true,
        reservation: true,
        waiterCall: true,
        payment: true,
        subscription: true,
        email: true,
        browser: false,
      },
      menuTheme: {
        themeKey: "classic",
        layout: "grid",
        cardStyle: "elevated",
        radius: 16,
        showCalories: true,
        showAllergens: true,
        showRating: true,
        headerStyle: "cover",
        footerText: "شكراً لزيارتكم · البيت الشامي",
      },
      seo: {
        title: "مطعم البيت الشامي — مشاوي ومقبلات شامية في الرياض",
        description: "أشهى المشاوي والمقبلات الشامية في الرياض. اطلب أونلاين أو احجز طاولتك.",
      },
    },
  });

  const proPlan = plans.pro;
  await db.subscription.update({
    where: { restaurantId: restaurant.id },
    data: {
      planId: proPlan,
      status: "ACTIVE",
      billingCycle: "YEARLY",
      currentPeriodStart: new Date(Date.now() - 30 * 86400000),
      currentPeriodEnd: new Date(Date.now() + 335 * 86400000),
      trialEndsAt: null,
    },
  });

  console.log("→ Creating staff accounts…");
  const staffDefs = [
    { name: "ليلى الحربي", email: "manager@dineflow.app", role: "general_manager", title: "المدير العام" },
    { name: "أحمد الشمري", email: "waiter@dineflow.app", role: "waiter", title: "نادل" },
    { name: "ريم القحطاني", email: "cashier@dineflow.app", role: "cashier", title: "كاشير" },
    { name: "مروان العلي", email: "chef@dineflow.app", role: "chef", title: "شيف" },
    { name: "فهد الدوسري", email: "accountant@dineflow.app", role: "accountant", title: "محاسب" },
  ];

  const staffMembers: { id: string; name: string; role: string }[] = [];
  for (const staff of staffDefs) {
    const user = await db.user.create({
      data: {
        name: staff.name,
        email: staff.email,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    const role = await db.role.findFirst({ where: { restaurantId: restaurant.id, key: staff.role } });
    const member = await db.restaurantMember.create({
      data: {
        restaurantId: restaurant.id,
        userId: user.id,
        title: staff.title,
        status: "ACTIVE",
        roles: role ? { create: { roleId: role.id } } : undefined,
      },
    });
    staffMembers.push({ id: member.id, name: staff.name, role: staff.role });
  }

  console.log("→ Seeding demo restaurant data…");
  await seedDemoRestaurant({
    restaurantId: restaurant.id,
    ownerId: owner.id,
    ownerName: owner.name,
    staff: staffMembers,
  });

  console.log("→ Creating subscription invoices…");
  const subscription = await db.subscription.findUniqueOrThrow({ where: { restaurantId: restaurant.id } });
  for (let index = 0; index < 3; index += 1) {
    const periodStart = new Date(Date.now() - (index + 1) * 30 * 86400000);
    const periodEnd = new Date(Date.now() - index * 30 * 86400000);
    const invoice = await db.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        number: `SUB-${new Date().getFullYear()}-${String(1000 + index)}`,
        amount: 2490,
        currency: "SAR",
        status: "PAID",
        periodStart,
        periodEnd,
        dueAt: periodStart,
        paidAt: periodStart,
      },
    });
    await db.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: 2490,
        currency: "SAR",
        method: "CARD",
        status: "SUCCEEDED",
        reference: `PAY-${1000 + index}`,
        paidAt: periodStart,
      },
    });
  }

  console.log("→ Creating support ticket…");
  const ticket = await db.supportTicket.create({
    data: {
      restaurantId: restaurant.id,
      requesterId: owner.id,
      subject: "طلب مساعدة في ربط النطاق المخصص",
      description: "أرغب في ربط نطاق menu.alshami.sa بالمنيو، ما الخطوات المطلوبة؟",
      category: "DOMAIN",
      priority: "NORMAL",
      status: "OPEN",
    },
  });
  await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: owner.id,
      body: "أرغب في ربط نطاق menu.alshami.sa بالمنيو، ما الخطوات المطلوبة؟",
    },
  });
  await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: admin.id,
      body: "أهلاً بك! أرسلنا لك سجل CNAME المطلوب، وبعد التحقق سيتم إصدار شهادة SSL تلقائياً.",
    },
  });

  console.log("→ Creating notifications…");
  const notifications = [
    { type: "ORDER_NEW", title: "طلب جديد #1048", body: "طاولة 4 · 3 أصناف · 148 ر.س" },
    { type: "WAITER_CALL", title: "استدعاء نادل — طاولة 9", body: "طلب فاتورة" },
    { type: "REVIEW", title: "تقييم جديد 5 نجوم", body: "«أفضل مشاوي جربتها في الرياض»" },
    { type: "PAYMENT", title: "تم استلام دفعة", body: "فاتورة INV-1041 · 210 ر.س" },
    { type: "SUBSCRIPTION", title: "اشتراكك نشط", body: "باقة Pro · تتجدد بعد 335 يوم" },
  ];
  for (const [index, notification] of notifications.entries()) {
    await db.notification.create({
      data: {
        userId: owner.id,
        restaurantId: restaurant.id,
        type: notification.type as never,
        title: notification.title,
        body: notification.body,
        isRead: index > 2,
        readAt: index > 2 ? new Date() : null,
        createdAt: new Date(Date.now() - index * 3600000),
      },
    });
  }

  console.log("\n✔ Seed completed");
  console.log("────────────────────────────────────────");
  console.log("Platform admin : admin@dineflow.app / Admin123!");
  console.log("Restaurant owner: owner@dineflow.app / Admin123!");
  console.log("Manager        : manager@dineflow.app / Admin123!");
  console.log("Waiter         : waiter@dineflow.app / Admin123!");
  console.log("Cashier        : cashier@dineflow.app / Admin123!");
  console.log("Chef           : chef@dineflow.app / Admin123!");
  console.log("Accountant     : accountant@dineflow.app / Admin123!");
  console.log("Demo menu      : /r/demo");
  console.log("────────────────────────────────────────\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
