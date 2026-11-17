import { PrismaClient } from "@prisma/client";
import { calculateTotals } from "../src/lib/money";
import { randomCode } from "../src/lib/utils";

const db = new PrismaClient();

interface StaffRef {
  id: string;
  name: string;
  role: string;
}

interface SeedDemoInput {
  restaurantId: string;
  ownerId: string;
  ownerName: string;
  staff: StaffRef[];
}

function daysAgo(days: number, hour = 13, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const CATEGORIES = [
  { key: "grills", nameAr: "المشاوي", nameEn: "Grills", image: "/images/food/grills.jpg" },
  { key: "appetizers", nameAr: "المقبلات", nameEn: "Appetizers", image: "/images/food/appetizers.jpg" },
  { key: "mains", nameAr: "الأطباق الرئيسية", nameEn: "Main dishes", image: "/images/food/mains.jpg" },
  { key: "desserts", nameAr: "الحلويات", nameEn: "Desserts", image: "/images/food/desserts.jpg" },
  { key: "drinks", nameAr: "المشروبات", nameEn: "Drinks", image: "/images/food/drinks.jpg" },
];

const PRODUCTS = [
  { cat: "grills", ar: "مشاوي مشكلة", en: "Mixed grill", price: 85, desc: "تشكيلة من الكباب والشيش طاووق وريش الغنم مع الخضار المشوية.", featured: true, tags: ["الأكثر طلباً"] },
  { cat: "grills", ar: "كباب لحم", en: "Beef kebab", price: 62, desc: "كباب لحم بقري مفروم متبّل بالبهارات الشامية، يقدّم مع خبز طازج." },
  { cat: "grills", ar: "شيش طاووق", en: "Shish tawook", price: 55, desc: "قطع دجاج متبّلة بالليمون والثوم، مشوية على الفحم." },
  { cat: "grills", ar: "ريش غنم", en: "Lamb chops", price: 95, desc: "ريش غنم طرية مشوية على الفحم مع صلصة الثوم.", featured: true },
  { cat: "grills", ar: "دجاج مشوي نصف", en: "Half grilled chicken", price: 48, desc: "نصف دجاجة متبّلة بالأعشاب مع بطاطا مشوية." },
  { cat: "appetizers", ar: "حمص بالطحينة", en: "Hummus", price: 18, desc: "حمص كريمي بالطحينة وزيت الزيتون البكر." },
  { cat: "appetizers", ar: "متبل باذنجان", en: "Mutabbal", price: 18, desc: "باذنجان مشوي مع الطحينة والليمون." },
  { cat: "appetizers", ar: "فتوش", en: "Fattoush", price: 24, desc: "خضار طازجة مع خبز محمّص ودبس الرمان.", featured: true },
  { cat: "appetizers", ar: "تبولة", en: "Tabbouleh", price: 22, desc: "بقدونس وبرغل وطماطم مع عصير الليمون." },
  { cat: "appetizers", ar: "ورق عنب", en: "Vine leaves", price: 26, desc: "ورق عنب محشي بالأرز والخضار مع زيت الزيتون." },
  { cat: "appetizers", ar: "سمبوسة جبن", en: "Cheese sambousek", price: 20, desc: "معجنات مقرمشة محشوة بالجبنة العكاوي." },
  { cat: "mains", ar: "كبسة لحم", en: "Lamb kabsa", price: 65, desc: "أرز بسمتي بالبهارات مع لحم غنم طري ومكسرات.", featured: true },
  { cat: "mains", ar: "مندي دجاج", en: "Chicken mandi", price: 55, desc: "دجاج مطهو ببطء على الطريقة الحضرمية مع أرز مندي." },
  { cat: "mains", ar: "مقلوبة دجاج", en: "Chicken maqluba", price: 52, desc: "أرز وباذنجان ودجاج مقلوبة تقليدية مع لبن." },
  { cat: "mains", ar: "برياني لحم", en: "Beef biryani", price: 58, desc: "أرز برياني بالبهارات الهندية مع لحم بقري." },
  { cat: "desserts", ar: "كنافة نابلسية", en: "Kunafa", price: 28, desc: "كنافة بالجبنة مع القطر والفستق الحلبي.", featured: true },
  { cat: "desserts", ar: "بقلاوة", en: "Baklava", price: 24, desc: "طبقات رقيقة محشوة بالفستق والعسل." },
  { cat: "desserts", ar: "أم علي", en: "Umm Ali", price: 26, desc: "حلوى الحليب بالعجين والمكسرات." },
  { cat: "drinks", ar: "ليمون بالنعناع", en: "Lemon mint", price: 16, desc: "عصير ليمون طازج مع النعناع.", featured: true },
  { cat: "drinks", ar: "شاي أحمر", en: "Tea", price: 8, desc: "شاي أحمر مع النعناع الطازج." },
  { cat: "drinks", ar: "قهوة عربية", en: "Arabic coffee", price: 12, desc: "قهوة عربية بالهيل تقدم مع التمر." },
  { cat: "drinks", ar: "مشروب غازي", en: "Soft drink", price: 7, desc: "مشروب غازي مبرّد." },
];

const CUSTOMERS = [
  { name: "عبدالله السالم", phone: "+966 50 111 2233" },
  { name: "منى العبدلي", phone: "+966 55 222 3344" },
  { name: "تركي الفيصل", phone: "+966 53 333 4455" },
  { name: "هند المطيري", phone: "+966 56 444 5566" },
  { name: "يوسف الزهراني", phone: "+966 54 555 6677" },
  { name: "سارة العمري", phone: "+966 58 666 7788" },
  { name: "بدر الشهري", phone: "+966 59 777 8899" },
  { name: "لينا الخالدي", phone: "+966 50 888 9900" },
];

export async function seedDemoRestaurant({ restaurantId, ownerId, ownerName, staff }: SeedDemoInput) {
  const areaMain = await db.restaurantArea.findFirst({ where: { restaurantId } });
  const areaTerrace = await db.restaurantArea.create({
    data: { restaurantId, name: "الشرفة", color: "#dbeafe", sortOrder: 1 },
  });
  const areaVip = await db.restaurantArea.create({
    data: { restaurantId, name: "غرف VIP", color: "#ede9fe", sortOrder: 2 },
  });

  const categories: Record<string, string> = {};
  for (const [index, category] of CATEGORIES.entries()) {
    const created = await db.menuCategory.create({
      data: {
        restaurantId,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        imageUrl: category.image,
        sortOrder: index,
        isVisible: true,
      },
    });
    categories[category.key] = created.id;
  }

  const products: { id: string; nameAr: string; price: number; categoryKey: string }[] = [];
  for (const [index, product] of PRODUCTS.entries()) {
    const created = await db.product.create({
      data: {
        restaurantId,
        categoryId: categories[product.cat],
        nameAr: product.ar,
        nameEn: product.en,
        descriptionAr: product.desc,
        price: product.price,
        taxRate: 15,
        prepMinutes: 10 + (index % 4) * 5,
        ingredients: product.desc,
        allergens: product.cat === "desserts" ? ["حليب", "مكسرات", "جلوتين"] : product.cat === "grills" ? ["جلوتين"] : [],
        tags: product.tags ?? [],
        isFeatured: product.featured ?? false,
        isVisible: true,
        sortOrder: index,
        imageUrl: CATEGORIES.find((c) => c.key === product.cat)?.image,
        soldCount: 20 + ((index * 13) % 140),
        rating: 4.3 + ((index % 7) / 10),
      },
    });
    products.push({ id: created.id, nameAr: created.nameAr, price: Number(created.price), categoryKey: product.cat });
  }

  // Modifier groups
  const sizeGroup = await db.modifierGroup.create({
    data: {
      restaurantId,
      nameAr: "الحجم",
      nameEn: "Size",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 0,
      options: {
        create: [
          { nameAr: "عادي", nameEn: "Regular", priceDelta: 0, isDefault: true, sortOrder: 0 },
          { nameAr: "كبير", nameEn: "Large", priceDelta: 8, sortOrder: 1 },
          { nameAr: "عائلي", nameEn: "Family", priceDelta: 18, sortOrder: 2 },
        ],
      },
    },
  });

  const extrasGroup = await db.modifierGroup.create({
    data: {
      restaurantId,
      nameAr: "إضافات",
      nameEn: "Extras",
      isRequired: false,
      minSelect: 0,
      maxSelect: 3,
      isMultiple: true,
      sortOrder: 1,
      options: {
        create: [
          { nameAr: "جبنة إضافية", nameEn: "Extra cheese", priceDelta: 5, sortOrder: 0 },
          { nameAr: "صوص ثوم", nameEn: "Garlic sauce", priceDelta: 3, sortOrder: 1 },
          { nameAr: "خبز إضافي", nameEn: "Extra bread", priceDelta: 2, sortOrder: 2 },
          { nameAr: "بطاطا مقلية", nameEn: "French fries", priceDelta: 9, sortOrder: 3 },
        ],
      },
    },
  });

  for (const product of products) {
    if (product.categoryKey === "grills" || product.categoryKey === "mains") {
      await db.productModifierGroup.createMany({
        data: [
          { productId: product.id, groupId: sizeGroup.id, sortOrder: 0 },
          { productId: product.id, groupId: extrasGroup.id, sortOrder: 1 },
        ],
      });
    }
  }

  const extras = [
    { nameAr: "جبنة", price: 5 },
    { nameAr: "صوص", price: 3 },
    { nameAr: "بطاطا", price: 9 },
    { nameAr: "مشروب", price: 7 },
  ];
  for (const [index, extra] of extras.entries()) {
    const created = await db.extra.create({
      data: { restaurantId, nameAr: extra.nameAr, price: extra.price, sortOrder: index },
    });
    for (const product of products.slice(0, 6)) {
      await db.productExtra.create({ data: { productId: product.id, extraId: created.id } });
    }
  }

  // Tables
  const tables: { id: string; number: string }[] = [];
  const tableDefs = [
    ...Array.from({ length: 8 }, (_, i) => ({ number: String(i + 1), areaId: areaMain?.id, seats: i % 3 === 0 ? 6 : 4, shape: i % 3 === 0 ? "ROUND" : "SQUARE" })),
    { number: "9", areaId: areaTerrace.id, seats: 4, shape: "SQUARE" },
    { number: "10", areaId: areaTerrace.id, seats: 2, shape: "ROUND" },
    { number: "11", areaId: areaVip.id, seats: 8, shape: "RECTANGLE" },
    { number: "12", areaId: areaVip.id, seats: 10, shape: "RECTANGLE" },
  ] as const;

  for (const [index, table] of tableDefs.entries()) {
    const created = await db.table.create({
      data: {
        restaurantId,
        areaId: table.areaId ?? null,
        number: table.number,
        name: `طاولة ${table.number}`,
        seats: table.seats,
        shape: table.shape as never,
        status: index < 3 ? "OCCUPIED" : index === 4 ? "RESERVED" : "AVAILABLE",
        positionX: 60 + (index % 4) * 170,
        positionY: 60 + Math.floor(index / 4) * 170,
        width: 110,
        height: 90,
        qrCodes: {
          create: {
            restaurantId,
            code: randomCode(12),
            type: "TABLE",
            label: `طاولة ${table.number}`,
          },
        },
      },
    });
    tables.push({ id: created.id, number: created.number });
  }

  await db.tableQrCode.create({
    data: { restaurantId, code: randomCode(12), type: "MENU", label: "المنيو العام" },
  });
  await db.tableQrCode.create({
    data: { restaurantId, code: randomCode(12), type: "PICKUP", label: "الاستلام" },
  });
  await db.tableQrCode.create({
    data: { restaurantId, code: randomCode(12), type: "DELIVERY", label: "التوصيل" },
  });

  // Customers
  const customers: { id: string; name: string; phone: string }[] = [];
  for (const customer of CUSTOMERS) {
    const created = await db.customer.create({
      data: {
        restaurantId,
        name: customer.name,
        phone: customer.phone,
        totalOrders: 0,
        totalSpent: 0,
      },
    });
    customers.push({ id: created.id, name: customer.name, phone: customer.phone });
  }

  // Table sessions
  const session1 = await db.tableSession.create({
    data: {
      restaurantId,
      tableId: tables[0].id,
      code: randomCode(8),
      guests: 4,
      status: "OPEN",
      openedById: ownerId,
      openedAt: daysAgo(0, 13, 20),
    },
  });
  const session2 = await db.tableSession.create({
    data: {
      restaurantId,
      tableId: tables[1].id,
      code: randomCode(8),
      guests: 2,
      status: "OPEN",
      openedById: ownerId,
      openedAt: daysAgo(0, 14, 5),
    },
  });

  await db.table.update({ where: { id: tables[0].id }, data: { status: "OCCUPIED" } });
  await db.table.update({ where: { id: tables[1].id }, data: { status: "OCCUPIED" } });

  const stations = await db.kitchenStation.findMany({ where: { restaurantId } });
  const kitchenStation = stations.find((s) => s.type === "KITCHEN") ?? stations[0];
  const barStation = stations.find((s) => s.type === "BAR") ?? stations[0];

  // Orders
  let orderNumber = 1001;
  const activeOrders: { id: string; number: number }[] = [];

  for (let day = 13; day >= 0; day -= 1) {
    const ordersToday = day === 0 ? 9 : 2 + (day % 3);
    for (let index = 0; index < ordersToday; index += 1) {
      const itemCount = 1 + ((day + index) % 3);
      const selected = Array.from({ length: itemCount }, (_, itemIndex) => {
        const product = products[(day * 5 + index * 3 + itemIndex) % products.length];
        return { product, quantity: 1 + ((index + itemIndex) % 2) };
      });

      const lines = selected.map((line) => ({
        unitPrice: line.product.price,
        quantity: line.quantity,
        taxRate: 15,
      }));

      const type = index % 5 === 0 ? "DELIVERY" : index % 4 === 0 ? "PICKUP" : "DINE_IN";
      const table = type === "DINE_IN" ? tables[(day + index) % tables.length] : null;
      const customer = customers[(day + index) % customers.length];

      let status: "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "REJECTED" = "COMPLETED";
      if (day === 0) {
        const pool = ["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "COMPLETED"] as const;
        status = pool[index % pool.length];
      } else if (day === 1 && index === 0) {
        status = "COMPLETED";
      } else if (index === 4 && day % 5 === 0) {
        status = "CANCELLED";
      } else if (index === 5 && day % 7 === 0) {
        status = "REJECTED";
      }

      const totals = calculateTotals({
        lines,
        currency: "SAR",
        deliveryFee: type === "DELIVERY" ? 12 : 0,
      });

      const createdAt = daysAgo(day, 12 + ((index * 2) % 10), (index * 7) % 60);
      const paid = status === "COMPLETED";

      const order = await db.order.create({
        data: {
          restaurantId,
          orderNumber,
          type,
          status,
          tableId: table?.id ?? null,
          sessionId: type === "DINE_IN" && day === 0 && index < 2 ? (index === 0 ? session1.id : session2.id) : null,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          deliveryAddress: type === "DELIVERY" ? "حي الملقا، شارع الأمير سلطان، مبنى 12" : null,
          deliveryArea: type === "DELIVERY" ? "شمال الرياض" : null,
          deliveryFee: totals.deliveryFee,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          itemsCount: totals.itemsCount,
          currency: "SAR",
          paymentMethod: type === "DELIVERY" ? "PAY_ON_DELIVERY" : index % 3 === 0 ? "CARD" : "CASH",
          paymentStatus: paid ? "PAID" : "UNPAID",
          source: type === "DINE_IN" ? "QR" : "MANUAL",
          createdById: staff.find((s) => s.role === "cashier")?.id ? null : null,
          acceptedAt: status !== "NEW" ? new Date(createdAt.getTime() + 60000) : null,
          preparingAt: ["PREPARING", "READY", "COMPLETED"].includes(status) ? new Date(createdAt.getTime() + 120000) : null,
          readyAt: ["READY", "COMPLETED"].includes(status) ? new Date(createdAt.getTime() + 900000) : null,
          completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + 1500000) : null,
          cancelledAt: ["CANCELLED", "REJECTED"].includes(status) ? new Date(createdAt.getTime() + 300000) : null,
          createdAt,
          items: {
            create: selected.map((line) => ({
              productId: line.product.id,
              nameSnapshot: line.product.nameAr,
              unitPrice: line.product.price,
              quantity: line.quantity,
              lineTotal: line.product.price * line.quantity,
              taxRate: 15,
              status: status === "COMPLETED" ? "SERVED" : status === "READY" ? "READY" : "PENDING",
            })),
          },
          statusHistory: {
            create: [
              { toStatus: "NEW", createdAt, changedById: ownerId },
              ...(status !== "NEW" ? [{ fromStatus: "NEW" as never, toStatus: status, createdAt: new Date(createdAt.getTime() + 120000), changedById: ownerId }] : []),
            ],
          },
        },
        include: { items: true },
      });

      if (paid) {
        const invoice = await db.invoice.create({
          data: {
            restaurantId,
            orderId: order.id,
            invoiceNumber: `INV-${orderNumber}`,
            customerName: customer.name,
            customerPhone: customer.phone,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            paidAmount: totals.total,
            currency: "SAR",
            status: "PAID",
            issuedAt: createdAt,
            items: {
              create: order.items.map((item) => ({
                name: item.nameSnapshot,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.lineTotal,
              })),
            },
          },
        });
        await db.payment.create({
          data: {
            restaurantId,
            invoiceId: invoice.id,
            orderId: order.id,
            amount: totals.total,
            currency: "SAR",
            method: index % 3 === 0 ? "CARD" : "CASH",
            status: "PAID",
            receivedById: ownerId,
            paidAt: new Date(createdAt.getTime() + 1600000),
            reference: `TXN-${orderNumber}`,
          },
        });
        await db.customer.update({
          where: { id: customer.id },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: totals.total },
            lastOrderAt: createdAt,
          },
        });
      }

      if (["NEW", "ACCEPTED", "PREPARING", "READY"].includes(status)) {
        activeOrders.push({ id: order.id, number: orderNumber });
        const drinkItem = order.items.find((item) => products.find((p) => p.id === item.productId)?.categoryKey === "drinks");
        await db.kitchenTicket.create({
          data: {
            orderId: order.id,
            stationId: (drinkItem ? barStation : kitchenStation)?.id,
            ticketNumber: orderNumber,
            status: status === "NEW" ? "QUEUED" : status === "ACCEPTED" ? "QUEUED" : status === "PREPARING" ? "PREPARING" : "READY",
            createdAt,
            startedAt: status === "PREPARING" || status === "READY" ? new Date(createdAt.getTime() + 120000) : null,
            readyAt: status === "READY" ? new Date(createdAt.getTime() + 800000) : null,
            items: {
              create: order.items.map((item) => ({
                orderItemId: item.id,
                name: item.nameSnapshot,
                quantity: item.quantity,
                status: status === "READY" ? "READY" : "QUEUED",
              })),
            },
          },
        });
      }

      orderNumber += 1;
    }
  }

  // Reservations
  const reservationDefs = [
    { name: "خالد المالكي", phone: "+966 50 123 7788", guests: 4, hour: "20:30", status: "CONFIRMED", days: 0 },
    { name: "أمل السبيعي", phone: "+966 55 987 1122", guests: 2, hour: "21:00", status: "PENDING", days: 0 },
    { name: "سلطان العتيبي", phone: "+966 53 456 3344", guests: 6, hour: "19:00", status: "CONFIRMED", days: 1 },
    { name: "نورة الشمري", phone: "+966 56 222 8899", guests: 3, hour: "20:00", status: "PENDING", days: 1 },
    { name: "ماجد القحطاني", phone: "+966 54 777 6655", guests: 8, hour: "21:30", status: "CONFIRMED", days: 2 },
    { name: "هيا الدوسري", phone: "+966 58 333 4455", guests: 2, hour: "18:30", status: "CONFIRMED", days: 3 },
  ];
  for (const [index, reservation] of reservationDefs.entries()) {
    await db.reservation.create({
      data: {
        restaurantId,
        tableId: tables[index % tables.length].id,
        customerName: reservation.name,
        customerPhone: reservation.phone,
        date: daysAgo(-reservation.days, 0, 0),
        time: reservation.hour,
        guests: reservation.guests,
        status: reservation.status as never,
        note: index % 2 === 0 ? "يفضّل طاولة قريبة من النافذة" : null,
        statusHistory: {
          create: [{ toStatus: reservation.status as never, createdAt: daysAgo(1, 12, 0) }],
        },
      },
    });
  }

  // Waiter calls
  await db.waiterCall.create({
    data: {
      restaurantId,
      tableId: tables[8].id,
      type: "BILL",
      note: "طلب الفاتورة",
      status: "PENDING",
      createdAt: new Date(Date.now() - 4 * 60000),
    },
  });
  await db.waiterCall.create({
    data: {
      restaurantId,
      tableId: tables[2].id,
      type: "WATER",
      note: "ماء إضافي",
      status: "PENDING",
      createdAt: new Date(Date.now() - 11 * 60000),
    },
  });
  await db.waiterCall.create({
    data: {
      restaurantId,
      tableId: tables[3].id,
      type: "WAITER",
      status: "HANDLED",
      handledById: staff.find((s) => s.role === "waiter")?.id,
      createdAt: new Date(Date.now() - 40 * 60000),
      handledAt: new Date(Date.now() - 35 * 60000),
    },
  });

  // Coupons
  await db.coupon.createMany({
    data: [
      {
        restaurantId,
        name: "خصم الترحيب",
        code: "WELCOME10",
        type: "PERCENTAGE",
        value: 10,
        minOrder: 50,
        maxDiscount: 40,
        maxUses: 500,
        usedCount: 34,
        isActive: true,
        startsAt: daysAgo(30),
        endsAt: daysAgo(-60),
      },
      {
        restaurantId,
        name: "توصيل مجاني",
        code: "FREEDEL",
        type: "FIXED",
        value: 12,
        minOrder: 80,
        maxUses: 200,
        usedCount: 12,
        isActive: true,
        startsAt: daysAgo(10),
        endsAt: daysAgo(-20),
      },
      {
        restaurantId,
        name: "عرض رمضان",
        code: "RAMADAN20",
        type: "PERCENTAGE",
        value: 20,
        minOrder: 100,
        maxDiscount: 60,
        maxUses: 1000,
        usedCount: 0,
        isActive: false,
        startsAt: daysAgo(-90),
        endsAt: daysAgo(-60),
      },
    ],
  });

  // Reviews
  const reviewDefs = [
    { rating: 5, comment: "أفضل مشاوي جربتها في الرياض، والخدمة سريعة جداً.", productIndex: 0 },
    { rating: 5, comment: "الكنافة رهيبة والأجواء عائلية. أنصح الجميع.", productIndex: 15 },
    { rating: 4, comment: "الأكل لذيذ، لكن الانتظار كان طويلاً قليلاً في وقت الذروة.", productIndex: 1 },
    { rating: 5, comment: "الفتوش طازج والليمون بالنعناع منعش.", productIndex: 7 },
    { rating: 4, comment: "أسعار مناسبة مقابل الجودة والكمية.", productIndex: 11 },
    { rating: 3, comment: "التوصيل تأخر 15 دقيقة، لكن الأكل وصل ساخناً.", productIndex: 12 },
    { rating: 5, comment: "أفضل حمص بالطحينة في المدينة.", productIndex: 5 },
    { rating: 5, comment: "تجربة ممتازة من الطلب عبر QR حتى الدفع.", productIndex: 2 },
  ];
  for (const [index, review] of reviewDefs.entries()) {
    await db.customerReview.create({
      data: {
        restaurantId,
        customerId: customers[index % customers.length].id,
        productId: products[review.productIndex % products.length].id,
        rating: review.rating,
        comment: review.comment,
        status: "PUBLISHED",
        createdAt: daysAgo(index + 1, 18, 30),
        reply: index === 2 ? "شكراً لملاحظتك، عملنا على تحسين سرعة الخدمة في أوقات الذروة." : null,
        repliedAt: index === 2 ? daysAgo(index, 10, 0) : null,
      },
    });
  }

  // Expenses
  const expenses = [
    { title: "شراء لحوم طازجة", category: "INGREDIENTS", amount: 1850, method: "CASH", days: 1 },
    { title: "فواتير كهرباء", category: "UTILITIES", amount: 940, method: "BANK_TRANSFER", days: 4 },
    { title: "رواتب فريق المطبخ", category: "PAYROLL", amount: 12500, method: "BANK_TRANSFER", days: 6 },
    { title: "تسويق على إنستغرام", category: "MARKETING", amount: 750, method: "CARD", days: 8 },
    { title: "صيانة معدات المطبخ", category: "MAINTENANCE", amount: 430, method: "CASH", days: 11 },
    { title: "تعبئة وتغليف", category: "PACKAGING", amount: 620, method: "CASH", days: 13 },
  ];
  for (const expense of expenses) {
    await db.expense.create({
      data: {
        restaurantId,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        currency: "SAR",
        method: expense.method as never,
        spentAt: daysAgo(expense.days, 11, 0),
        notes: null,
        createdById: ownerId,
      },
    });
  }

  // Inventory
  const inventoryCategories = [
    { name: "لحوم", items: [{ name: "لحم غنم", unit: "كجم", qty: 42, min: 15, cost: 55 }, { name: "دجاج", unit: "كجم", qty: 60, min: 20, cost: 18 }] },
    { name: "خضار", items: [{ name: "طماطم", unit: "كجم", qty: 25, min: 10, cost: 6 }, { name: "بقدونس", unit: "حزمة", qty: 40, min: 15, cost: 2 }] },
    { name: "مشروبات", items: [{ name: "ليمون", unit: "كجم", qty: 18, min: 8, cost: 7 }, { name: "نعناع", unit: "حزمة", qty: 12, min: 10, cost: 2.5 }] },
  ];
  for (const category of inventoryCategories) {
    const created = await db.inventoryCategory.create({ data: { restaurantId, name: category.name } });
    for (const item of category.items) {
      const inventoryItem = await db.inventoryItem.create({
        data: {
          restaurantId,
          categoryId: created.id,
          name: item.name,
          unit: item.unit,
          quantity: item.qty,
          minQuantity: item.min,
          costPerUnit: item.cost,
        },
      });
      await db.stockMovement.create({
        data: {
          restaurantId,
          itemId: inventoryItem.id,
          type: "IN",
          quantity: item.qty,
          unitCost: item.cost,
          reason: "رصيد افتتاحي",
          createdById: ownerId,
          createdAt: daysAgo(14, 9, 0),
        },
      });
    }
  }

  const supplier = await db.supplier.create({
    data: { restaurantId, name: "مؤسسة الأطعمة الطازجة", contactName: "أبو خالد", phone: "+966 50 999 8877", email: "orders@freshfood.sa" },
  });
  await db.purchaseOrder.create({
    data: {
      restaurantId,
      supplierId: supplier.id,
      number: "PO-1001",
      status: "RECEIVED",
      total: 3200,
      expectedAt: daysAgo(3, 9, 0),
      receivedAt: daysAgo(3, 11, 0),
      createdById: ownerId,
      items: {
        create: [
          { name: "لحم غنم", quantity: 40, unitCost: 55, total: 2200 },
          { name: "دجاج", quantity: 50, unitCost: 18, total: 900 },
        ],
      },
    },
  });

  // Activity logs
  const activity = [
    { action: "product.update", entity: "Product", description: "تم تحديث سعر «مشاوي مشكلة» من 80 إلى 85 ر.س" },
    { action: "order.cancel", entity: "Order", description: "تم إلغاء الطلب #1034 بسبب طلب العميل" },
    { action: "table.session.open", entity: "TableSession", description: "تم فتح جلسة على طاولة 1" },
    { action: "staff.invite", entity: "RestaurantMember", description: "تمت دعوة مروان العلي كشيف" },
    { action: "coupon.create", entity: "Coupon", description: "تم إنشاء كوبون WELCOME10" },
    { action: "settings.update", entity: "Restaurant", description: "تم تحديث أوقات العمل ليوم الجمعة" },
    { action: "reservation.confirm", entity: "Reservation", description: "تم تأكيد حجز خالد المالكي" },
    { action: "invoice.void", entity: "Invoice", description: "تم إلغاء الفاتورة INV-1029 بعد مراجعة المحاسب" },
  ];
  for (const [index, entry] of activity.entries()) {
    await db.staffActivityLog.create({
      data: {
        restaurantId,
        actorId: ownerId,
        action: entry.action,
        entity: entry.entity,
        description: entry.description,
        createdAt: daysAgo(index % 5, 10 + index, 15),
        ip: "185.24.10.5",
      },
    });
  }

  // Announcement
  await db.announcement.create({
    data: {
      title: "تحديث جديد: تحسينات على شاشة المطبخ",
      body: "أضفنا مؤقتات لكل صنف وإمكانية تأجيل الطلب مع تسجيل السبب. التحديث متاح الآن لجميع المطاعم.",
      audience: "ALL",
      channel: "IN_APP",
      status: "SENT",
      sentAt: daysAgo(2, 9, 0),
      createdById: ownerId,
      stats: { delivered: 320, read: 214 },
    },
  });

  // Loyalty
  for (const [index, customer] of customers.slice(0, 5).entries()) {
    const account = await db.loyaltyAccount.create({
      data: {
        restaurantId,
        customerId: customer.id,
        points: 120 + index * 85,
        lifetimePoints: 300 + index * 120,
        tier: index > 2 ? "SILVER" : "BRONZE",
      },
    });
    await db.loyaltyTransaction.create({
      data: { accountId: account.id, points: 120 + index * 85, type: "EARN", reason: "مكافأة ترحيبية" },
    });
  }

  await db.reward.createMany({
    data: [
      { restaurantId, name: "مشروب مجاني", description: "أي مشروب من القائمة", pointsCost: 100, type: "FREE_ITEM", value: 16 },
      { restaurantId, name: "خصم 25 ر.س", description: "على أي طلب فوق 100 ر.س", pointsCost: 250, type: "DISCOUNT", value: 25 },
      { restaurantId, name: "حلوى مجانية", description: "كنافة أو بقلاوة", pointsCost: 180, type: "FREE_ITEM", value: 28 },
    ],
  });

  // Campaigns
  await db.campaign.createMany({
    data: [
      {
        restaurantId,
        name: "عرض نهاية الأسبوع",
        type: "PROMO",
        audience: "جميع العملاء",
        offer: "خصم 15% على المشاوي يومي الخميس والجمعة",
        channel: "IN_APP",
        startsAt: daysAgo(2),
        endsAt: daysAgo(-5),
        status: "RUNNING",
        stats: { sent: 1240, opened: 680, redeemed: 94 },
      },
      {
        restaurantId,
        name: "استرجاع العملاء الخاملين",
        type: "RETENTION",
        audience: "لم يطلبوا منذ 60 يوم",
        offer: "كوبون 20% صالح لأسبوع",
        channel: "EMAIL",
        startsAt: daysAgo(-3),
        endsAt: daysAgo(-17),
        status: "SCHEDULED",
        stats: { sent: 0, opened: 0, redeemed: 0 },
      },
    ],
  });

  // Custom domain
  await db.customDomain.create({
    data: {
      restaurantId,
      domain: "menu.alshami.sa",
      status: "PENDING",
      sslStatus: "PENDING",
      isPrimary: false,
    },
  });

  // AI conversation sample
  const conversation = await db.aiConversation.create({
    data: {
      restaurantId,
      userId: ownerId,
      title: "تحليل مبيعات الأسبوع",
    },
  });
  await db.aiMessage.createMany({
    data: [
      { conversationId: conversation.id, role: "user", content: "ما أكثر وجبة مبيعاً هذا الأسبوع؟" },
      {
        conversationId: conversation.id,
        role: "assistant",
        content:
          "الأكثر مبيعاً هذا الأسبوع هو «مشاوي مشكلة» بـ 84 طلباً وإيراد 7,140 ر.س، يليه «كبسة لحم» بـ 61 طلباً. أنصح بإبراز المشاوي المشكلة في أعلى المنيو وربطها بعرض نهاية الأسبوع.",
      },
    ],
  });

  // Automation rule
  await db.automationRule.create({
    data: {
      restaurantId,
      name: "إخفاء المنتج عند نفاد المخزون",
      trigger: "STOCK_OUT",
      conditions: { trackStock: true },
      actions: [{ type: "HIDE_PRODUCT" }, { type: "NOTIFY_OWNER" }],
      isActive: true,
      runCount: 4,
      lastRunAt: daysAgo(3, 16, 0),
    },
  });

  await db.webhook.create({
    data: {
      restaurantId,
      url: "https://example.com/webhooks/dineflow",
      secret: randomCode(24),
      events: ["order.created", "order.completed", "payment.received"],
      isActive: false,
    },
  });

  return { orderNumber, activeOrders };
}
