import {
  BarChart3,
  ChefHat,
  GitBranch,
  LayoutGrid,
  MonitorSmartphone,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Sparkles,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type Locale = "ar" | "en";
type Localized = Record<Locale, string>;

export interface MarketingFeature {
  slug: string;
  icon: LucideIcon;
  category: "guest" | "operations" | "insights";
  title: Localized;
  eyebrow: Localized;
  summary: Localized;
  description: Localized;
  benefits: Localized[];
  workflow: { title: Localized; body: Localized }[];
  capabilities: Localized[];
  accent: string;
}

export const marketingFeatures: MarketingFeature[] = [
  {
    slug: "digital-menu",
    icon: MonitorSmartphone,
    category: "guest",
    title: { ar: "المنيو الرقمي", en: "Digital menu" },
    eyebrow: { ar: "واجهة ضيوفك", en: "Your guest-facing storefront" },
    summary: { ar: "منيو عام للتصفح الآن؛ أدوات تحرير الأقسام والمنتجات قيد التطوير.", en: "A browse-only public menu today; category and product editing tools are still in development." },
    description: { ar: "المنيو العام المتاح يعرض تفاصيل المطعم والأصناف المنشورة ضمن تجربة ملائمة للهاتف. إدارة الأقسام والأسعار والصور والتوفر من لوحة المطعم ستُستكمل في خطوة إدارة المنيو.", en: "The current public menu presents restaurant and published item details in a mobile-friendly view. Admin tools for managing categories, prices, photos and availability will be completed in the menu-management phase." },
    benefits: [
      { ar: "المنيو المنشور يعرض تفاصيل الأصناف للضيف؛ أدوات التعديل من لوحة المطعم قادمة.", en: "The published menu displays item details to guests; restaurant-dashboard editing tools are upcoming." },
      { ar: "واجهة عامة متوافقة مع الهاتف تتضمن الأقسام والبحث.", en: "A mobile-friendly public view with categories and search." },
      { ar: "إظهار الأوصاف والصور والأسعار المتوفرة ضمن بيانات النشر.", en: "Display available descriptions, photos and prices from published menu data." },
    ],
    workflow: [
      { title: { ar: "حرّر المنيو — خطوة قادمة", en: "Edit the menu — upcoming phase" }, body: { ar: "محرر الأقسام والمنتجات والأسعار والصور سيُبنى في خطوة إدارة المنيو؛ لا يتاح هذا التحرير من لوحة المطعم الحالية.", en: "The category, product, price and photo editor will be built in the menu-management phase; this editing is not available in the current restaurant dashboard." } },
      { title: { ar: "اختر أصنافاً مميزة — لاحقاً", en: "Select featured items — later" }, body: { ar: "أدوات تمييز الأصناف وترتيب الأقسام جزء من مرحلة محرر المنيو القادمة.", en: "Featured-item controls and category ordering are part of the upcoming menu-editor phase." } },
      { title: { ar: "استعرض الرابط العام", en: "Browse the public URL" }, body: { ar: "الرابط الحالي يفتح المنيو للتصفح فقط؛ إرسال الطلب سيُضاف في مرحلة منيو الزبون.", en: "The current URL opens a browse-only menu; guest order submission is planned for the guest-menu phase." } },
    ],
    capabilities: [
      { ar: "منيو عام للتصفح مع أقسام وبحث (متاح الآن)", en: "Browse-only public menu with categories and search (available now)" },
      { ar: "تحرير الأقسام والمنتجات والصور (خطوة 4)", en: "Edit categories, products and photos (step 4)" },
      { ar: "تعدد اللغات والأسعار", en: "Multiple languages and clear pricing" },
      { ar: "التعديلات والعروض وترتيب الأقسام ضمن خطوة 4", en: "Menu editing, promotions and category ordering in step 4" },
    ],
    accent: "emerald",
  },
  {
    slug: "qr-ordering",
    icon: QrCode,
    category: "guest",
    title: { ar: "منيو عبر QR", en: "QR menu access" },
    eyebrow: { ar: "من الرمز إلى المنيو", en: "From scan to menu" },
    summary: { ar: "استعرض المنيو العام عبر رابط أو رمز QR خارجي؛ مولّد الأكواد داخل التطبيق يأتي في مرحلة لاحقة.", en: "Browse the public menu by URL or an externally generated QR code; in-app code generation is coming in a later phase." },
    description: { ar: "المنيو العام متاح للتصفح. يمكن لرمز QR من أداة خارجية فتح رابط المنيو؛ مولّد الأكواد داخل التطبيق والروابط المرتبطة بالطاولات ضمن خطوة QR والطاولات. إرسال الطلب وربطه بالمطبخ سيأتيان في خطوات الطلبات اللاحقة.", en: "The current public menu is browse-only. A QR code from any external tool can point to its URL; the in-app generator and table-specific links belong to the table/QR phase. Guest order submission and kitchen routing follow in later order-workflow steps." },
    benefits: [
      { ar: "دخول مباشر من كاميرا الهاتف إلى صفحة ويب.", en: "Open directly from a phone camera into a web page." },
      { ar: "افتح القائمة مباشرة في متصفح الهاتف دون تطبيق إضافي.", en: "Open the menu directly in a phone browser without installing another app." },
      { ar: "يمكن ربط رمز خارجي برابط المنيو العام؛ الرموز المرتبطة بالطاولات ستُضاف مع أدوات الطاولات.", en: "An external QR code can link to the public menu; table-specific codes will arrive with table tools." },
    ],
    workflow: [
      { title: { ar: "انسخ رابط المنيو العام", en: "Copy the public menu URL" }, body: { ar: "استخدم الرابط الحالي في أداة QR خارجية؛ مولّد الأكواد داخل DineFlow سيُضاف في مرحلة الطاولات وQR.", en: "Use the current URL in an external QR tool; DineFlow's in-app generator will be added in the table/QR phase." } },
      { title: { ar: "اربط الرمز بالرابط", en: "Link a code to the URL" }, body: { ar: "إن استخدمت أداة خارجية، اطبع الرمز وضعه حيث يراه الضيف؛ التوليد والتصدير من داخل التطبيق يأتيان لاحقاً.", en: "If you use an external tool, print and place that code for guests; in-app generation and export will come later." } },
      { title: { ar: "تصفّح المنيو", en: "Browse the menu" }, body: { ar: "يفتح الرابط القائمة للتصفح فقط؛ إرسال الطلب من واجهة الضيف سيأتي مع مرحلة الطلبات.", en: "The URL opens the menu for browsing only; guest order submission will arrive with the order-workflow phase." } },
    ],
    capabilities: [
      { ar: "رابط المنيو العام الآن؛ روابط الطاولات ضمن المرحلة القادمة", en: "Public menu URL now; table-specific links are planned" },
      { ar: "لا حاجة لتطبيق للضيف", en: "No guest app required" },
      { ar: "تجربة ويب ملائمة للجوال", en: "A mobile-friendly web experience" },
      { ar: "فتح المنيو عبر QR؛ الطلب الإلكتروني ضمن مرحلة لاحقة", en: "QR menu access; online ordering is planned for a later release" },
    ],
    accent: "sky",
  },
  {
    slug: "table-management",
    icon: LayoutGrid,
    category: "operations",
    title: { ar: "إدارة الطاولات", en: "Table management" },
    eyebrow: { ar: "صالة أوضح", en: "A clearer dining room" },
    summary: { ar: "تابع الطاولات والمناطق والجلسات من شاشة تشغيل واحدة.", en: "Track tables, dining areas and sessions from one operations view." },
    description: { ar: "نظّم الطاولات ضمن مناطق، راجع حالتها، واربط الخدمة بجلسة واضحة. تساعد الرؤية الموحّدة الفريق على معرفة الطاولات المتاحة والمشغولة وما يرتبط بها من طلبات.", en: "Organise tables into areas, review their status and connect service to a clear dining session. A shared view helps the team see availability and the orders associated with each table." },
    benefits: [
      { ar: "حالة الطاولة ظاهرة للفريق بدلاً من الاعتماد على التخمين.", en: "Table status is visible to the team rather than left to guesswork." },
      { ar: "تقسيم الصالة إلى مناطق تخدم طريقة عمل مطعمك.", en: "Group the dining room into areas that match your operation." },
      { ar: "اربط الجلسات والطلبات بالطاولة عند الحاجة.", en: "Associate sessions and orders with a table when needed." },
    ],
    workflow: [
      { title: { ar: "أنشئ المناطق", en: "Set up areas" }, body: { ar: "سمّ مناطق الصالة لتسهيل تنظيم الطاولات.", en: "Name dining areas to organise tables clearly." } },
      { title: { ar: "أضف الطاولات", en: "Add tables" }, body: { ar: "حدّد الاسم والسعة والرمز المرتبط بكل طاولة.", en: "Set a name, capacity and associated code for each table." } },
      { title: { ar: "تابع الحالة", en: "Track status" }, body: { ar: "استخدم العرض التشغيلي لمتابعة التوفر والجلسات.", en: "Use the operations view to follow availability and sessions." } },
    ],
    capabilities: [
      { ar: "مناطق وطاولات بسعاتها", en: "Dining areas and table capacities" },
      { ar: "حالات الطاولة والجلسة", en: "Table and session statuses" },
      { ar: "ربط الطلبات بالطاولات", en: "Orders associated with tables" },
      { ar: "أساس لمخطط الصالة", en: "Foundation for a floor plan" },
    ],
    accent: "violet",
  },
  {
    slug: "order-management",
    icon: ShoppingBag,
    category: "operations",
    title: { ar: "إدارة الطلبات", en: "Order management" },
    eyebrow: { ar: "كل طلب في مساره", en: "Every order in its flow" },
    summary: { ar: "شاهد الطلبات وحالاتها وتفاصيلها في مكان واحد.", en: "See orders, statuses and details in one place." },
    description: { ar: "اجمع طلبات القنوات المتاحة في قائمة تشغيل مرتبة. راجع الأصناف والكميات والملاحظات والطاولة أو نوع الخدمة، ثم تابع تغير الحالة وفق صلاحيات الفريق.", en: "Bring supported order channels into an organised operational list. Review items, quantities, notes, table or service type, then follow status changes according to team permissions." },
    benefits: [
      { ar: "صورة موحّدة للطلبات الجديدة والجارية والمكتملة.", en: "A single view of new, active and completed orders." },
      { ar: "تفاصيل الأصناف والكميات والملاحظات في سياق الطلب.", en: "Items, quantities and notes stay with the order context." },
      { ar: "سجل للحالات يساعد على متابعة سير العمل.", en: "A status history helps teams follow the order flow." },
    ],
    workflow: [
      { title: { ar: "استقبل", en: "Receive" }, body: { ar: "تظهر الطلبات التي تصل إلى مطعمك ضمن قائمة واضحة.", en: "Incoming orders appear in a clear operational list." } },
      { title: { ar: "حدّث الحالة", en: "Update status" }, body: { ar: "انقل الطلب بين المراحل التي تسمح بها صلاحياتك.", en: "Move the order through stages your permissions allow." } },
      { title: { ar: "أكمل الخدمة", en: "Complete service" }, body: { ar: "تابع الطلب حتى التسليم والإكمال مع حفظ سجله.", en: "Follow the order through handoff and completion with its history." } },
    ],
    capabilities: [
      { ar: "عرض الطلبات وتفاصيلها", en: "Order list and details" },
      { ar: "حالات وسجل زمني", en: "Statuses and event history" },
      { ar: "معلومات الطاولة ونوع الطلب", en: "Table and order-type context" },
      { ar: "صلاحيات حسب دور الموظف", en: "Permissions by staff role" },
    ],
    accent: "amber",
  },
  {
    slug: "kitchen-display",
    icon: ChefHat,
    category: "operations",
    title: { ar: "شاشة المطبخ", en: "Kitchen display" },
    eyebrow: { ar: "من الطلب إلى التحضير", en: "From order to preparation" },
    summary: { ar: "رتّب تذاكر المطبخ وتابع ما بدأ وما أصبح جاهزاً.", en: "Organise kitchen tickets and track what is in progress or ready." },
    description: { ar: "حوّل الطلبات إلى تذاكر واضحة للفريق. تابع وقت الاستلام والبدء والجاهزية، ونظّم المحطات بحسب طريقة تجهيز الأصناف حتى يعرف كل فرد ما يحتاج إلى الانتباه الآن.", en: "Turn orders into clear kitchen tickets. Track when work arrives, starts and becomes ready, and organise stations around how dishes are prepared so each team member knows what needs attention." },
    benefits: [
      { ar: "ترتيب بصري للتذاكر حسب مرحلة العمل.", en: "A visual ticket flow organised by work stage." },
      { ar: "إظهار تفاصيل الصنف والكمية والملاحظات.", en: "Show item, quantity and preparation notes." },
      { ar: "دعم تنظيم محطات التحضير ومتابعة الزمن.", en: "Support station organisation and elapsed-time awareness." },
    ],
    workflow: [
      { title: { ar: "استقبل التذكرة", en: "Receive a ticket" }, body: { ar: "تظهر تفاصيل الطلب لتكون مرئية لفريق التحضير.", en: "Order details appear for the preparation team." } },
      { title: { ar: "ابدأ التحضير", en: "Start preparing" }, body: { ar: "حدّث حالة العمل مع بقاء وقت الطلب وملاحظاته أمامك.", en: "Update work status while keeping order time and notes in view." } },
      { title: { ar: "أعلن الجاهزية", en: "Mark it ready" }, body: { ar: "انقل التذكرة إلى الجاهز كي يعرف الفريق أن الخطوة التالية بدأت.", en: "Move the ticket to ready so the team knows the next handoff can begin." } },
    ],
    capabilities: [
      { ar: "طوابير حسب حالة التحضير", en: "Queues by preparation status" },
      { ar: "تفاصيل الأصناف والملاحظات", en: "Item details and notes" },
      { ar: "محطات مطبخ قابلة للتنظيم", en: "Organisable kitchen stations" },
      { ar: "أوقات الطلب والبدء والجاهزية", en: "Order, start and ready times" },
    ],
    accent: "orange",
  },
  {
    slug: "staff-management",
    icon: Users,
    category: "operations",
    title: { ar: "إدارة الموظفين", en: "Staff management" },
    eyebrow: { ar: "الفريق المناسب للصلاحية المناسبة", en: "The right access for each role" },
    summary: { ar: "نظّم أعضاء الفريق والأدوار والصلاحيات في بيئة المطعم.", en: "Organise team members, roles and access within your restaurant." },
    description: { ar: "اجمع عضويات الفريق والأدوار والصلاحيات في مكان واحد. امنح كل شخص مستوى الوصول المناسب لمهمته، وقلّل إظهار المعلومات التشغيلية أو المالية لمن لا يحتاج إليها.", en: "Keep team membership, roles and permissions together. Give each person the access that fits their work and avoid exposing operational or financial information to people who do not need it." },
    benefits: [
      { ar: "الأدوار توضّح ما يمكن لكل موظف الوصول إليه.", en: "Roles clarify what each staff member can access." },
      { ar: "إدارة العضويات ضمن نطاق المطعم.", en: "Manage memberships within the restaurant boundary." },
      { ar: "فصل صلاحيات التشغيل عن الوصول المالي والإداري.", en: "Separate operational permissions from financial and administrative access." },
    ],
    workflow: [
      { title: { ar: "أضف عضواً", en: "Add a member" }, body: { ar: "سجّل الموظف واربطه بمطعمك أو فرعه.", en: "Add a staff member and associate them with your restaurant or branch." } },
      { title: { ar: "اختر الدور", en: "Choose a role" }, body: { ar: "حدّد ما يحتاجه عمل الموظف من صلاحيات.", en: "Choose the permissions required for the employee's work." } },
      { title: { ar: "راجع الوصول", en: "Review access" }, body: { ar: "حدّث العضوية أو الدور عندما تتغيّر المسؤوليات.", en: "Update membership or role as responsibilities change." } },
    ],
    capabilities: [
      { ar: "عضويات للموظفين", en: "Staff memberships" },
      { ar: "أدوار وصلاحيات", en: "Roles and permissions" },
      { ar: "دعم الفروع المرتبطة", en: "Support for associated branches" },
      { ar: "سياق للمراجعة وسجل النشاط", en: "Context for review and activity history" },
    ],
    accent: "blue",
  },
  {
    slug: "analytics",
    icon: BarChart3,
    category: "insights",
    title: { ar: "التحليلات والتقارير", en: "Analytics & reports" },
    eyebrow: { ar: "رؤية أوضح للأداء", en: "A clearer view of performance" },
    summary: { ar: "تابع مؤشرات الطلب والمبيعات والمنتجات من لوحة واحدة.", en: "Follow order, sales and product indicators from one dashboard." },
    description: { ar: "اجمع الأرقام التشغيلية ضمن مؤشرات وتقارير تساعدك على طرح الأسئلة الصحيحة عن أداء المطعم. انتقل من نظرة عامة إلى تفاصيل الطلبات والمنتجات بحسب بيانات حسابك وصلاحياتك.", en: "Bring operational figures into indicators and reports that help you ask better questions about restaurant performance. Move from an overview into order and product details according to your account data and permissions." },
    benefits: [
      { ar: "مؤشرات أساسية للمبيعات والطلبات ومتوسط قيمة الطلب.", en: "Core indicators for sales, orders and average order value." },
      { ar: "مقارنة المنتجات لمعرفة ما يلقى اهتماماً أكبر.", en: "Compare products to understand what receives more attention." },
      { ar: "بيانات مرئية تساعد على مراجعة التشغيل اليومي.", en: "Readable data for reviewing day-to-day operations." },
    ],
    workflow: [
      { title: { ar: "اختر الفترة", en: "Choose a period" }, body: { ar: "ابدأ بالنطاق الزمني المناسب لسؤالك.", en: "Start with the time range that fits your question." } },
      { title: { ar: "استكشف المؤشرات", en: "Explore indicators" }, body: { ar: "راجع المبيعات والطلبات وأداء المنتجات.", en: "Review sales, orders and product performance." } },
      { title: { ar: "حوّل الرؤية إلى إجراء", en: "Turn insight into action" }, body: { ar: "استخدم ما تراه لتوجيه قرارات التشغيل والمنيو.", en: "Use what you see to guide operational and menu decisions." } },
    ],
    capabilities: [
      { ar: "نظرة عامة على المبيعات والطلبات", en: "Sales and order overview" },
      { ar: "مؤشرات متوسط الطلب والطاولات", en: "Average-order and table indicators" },
      { ar: "قوائم المنتجات الأعلى أداءً", en: "Top-performing product lists" },
      { ar: "تفاوت الوصول بحسب الصلاحيات", en: "Access scoped by permissions" },
    ],
    accent: "rose",
  },
  {
    slug: "ai-assistant",
    icon: Sparkles,
    category: "insights",
    title: { ar: "مساعد الذكاء الاصطناعي", en: "AI assistant" },
    eyebrow: { ar: "أسئلة تساعدك على التفكير", en: "Questions that help you think" },
    summary: { ar: "مساعدة تحليلية باللغة الطبيعية ضمن سياق بيانات المطعم.", en: "Natural-language analytical assistance in your restaurant context." },
    description: { ar: "صُمم المساعد لمساندة فهم البيانات وصياغة الأسئلة والاقتراحات التشغيلية. استخدمه كوسيلة مساعدة لتحليل المؤشرات أو توليد أفكار؛ تبقى مراجعة الأرقام والقرارات النهائية بيد فريق المطعم.", en: "The assistant is intended to help interpret data, frame questions and explore operational ideas. Use it to support analysis or generate suggestions; your restaurant team remains responsible for verifying figures and making final decisions." },
    benefits: [
      { ar: "اسأل بلغة طبيعية بدلاً من بناء استعلامات معقدة.", en: "Ask in natural language instead of building complex queries." },
      { ar: "استكشف اتجاهات الأداء وصِغ أسئلة متابعة.", en: "Explore performance patterns and frame follow-up questions." },
      { ar: "اقتراحات مساعدة لا تستبدل مراجعة البيانات أو الحكم البشري.", en: "Helpful suggestions that do not replace data checks or human judgement." },
    ],
    workflow: [
      { title: { ar: "اسأل عن هدفك", en: "Ask about your goal" }, body: { ar: "ابدأ بسؤال واضح عن أداء أو مؤشر متاح.", en: "Start with a clear question about available performance data." } },
      { title: { ar: "راجع الإجابة", en: "Review the response" }, body: { ar: "تحقق من المقاييس والسياق، واطلب توضيحاً عند الحاجة.", en: "Check the metrics and context, and ask for clarification when needed." } },
      { title: { ar: "قرّر بمسؤولية", en: "Decide responsibly" }, body: { ar: "قيّم الاقتراح قبل تحويله إلى قرار تشغيلي.", en: "Evaluate a suggestion before turning it into an operational decision." } },
    ],
    capabilities: [
      { ar: "استكشاف مؤشرات الأداء بالسؤال", en: "Explore performance indicators conversationally" },
      { ar: "تلخيص وتحليل مساعد", en: "Assisted summaries and analysis" },
      { ar: "اقتراح أفكار قابلة للمراجعة", en: "Ideas that remain open to review" },
      { ar: "مراجعة بشرية للقرارات", en: "Human review for decisions" },
    ],
    accent: "teal",
  },
  {
    slug: "multi-branch",
    icon: GitBranch,
    category: "operations",
    title: { ar: "إدارة الفروع", en: "Multi-branch management" },
    eyebrow: { ar: "نظرة مترابطة للفروع", en: "Connected branch operations" },
    summary: { ar: "نظّم فروع المطعم ضمن حساب واحد مع سياق لكل فرع.", en: "Organise restaurant branches under one account with branch context." },
    description: { ar: "احتفظ بهيكل واضح للمطعم وفروعه، وميّز بيانات كل موقع ضمن صلاحياته. راجع حدود الباقة قبل إضافة فروع جديدة، واضبط من يستطيع الوصول إلى كل فرع.", en: "Keep a clear structure for your restaurant and branches, and distinguish each location's data within its access scope. Review plan limits before adding locations and control who can access each branch." },
    benefits: [
      { ar: "هيكل واحد يربط الفروع بالمنشأة الرئيسية.", en: "One structure connects branches to the parent restaurant." },
      { ar: "مراعاة سياق الفرع عند التشغيل والوصول.", en: "Branch context is considered for operations and access." },
      { ar: "حدود الفروع ظاهرة ضمن الباقة المختارة.", en: "Branch limits are visible in the selected plan." },
    ],
    workflow: [
      { title: { ar: "أنشئ فرعاً", en: "Create a branch" }, body: { ar: "أضف الموقع ضمن حساب المطعم وخطة الاشتراك.", en: "Add a location within the restaurant account and plan." } },
      { title: { ar: "اضبط الفريق", en: "Assign the team" }, body: { ar: "اربط الموظفين بالأدوار والفروع التي يعملون فيها.", en: "Associate staff with the roles and branches where they work." } },
      { title: { ar: "تابع كل موقع", en: "Review each location" }, body: { ar: "استخدم محدد الفرع لمراجعة سياق العمل المناسب.", en: "Use the branch selector to review the appropriate operating context." } },
    ],
    capabilities: [
      { ar: "سجل فروع مركزي", en: "Central branch directory" },
      { ar: "صلاحيات مرتبطة بالفرع", en: "Branch-aware permissions" },
      { ar: "سياق منفصل للموقع", en: "Location-specific context" },
      { ar: "حدود باقة واضحة", en: "Visible plan limits" },
    ],
    accent: "indigo",
  },
  {
    slug: "pos",
    icon: UtensilsCrossed,
    category: "operations",
    title: { ar: "نقطة البيع POS", en: "Point of sale (POS)" },
    eyebrow: { ar: "طلبات مباشرة على الكاونتر", en: "Counter and in-house orders" },
    summary: { ar: "واجهة تشغيل للطلبات اليدوية مرتبطة بالمنيو والطلبات.", en: "An operational interface for manual orders connected to menu and order records." },
    description: { ar: "تخدم نقطة البيع عمليات الطلب المباشر داخل المطعم، مع اختيار المنتجات والكميات والطاولات وتسجيل تفاصيل الطلب. صُممت لتتكامل مع منيو المطعم وسجل الطلبات، وتخضع إجراءات الدفع الفعلي لتكامل مزوّد الدفع المتاح.", en: "The POS supports direct ordering in the restaurant, with product and quantity selection, table context and order records. It is designed to connect with the restaurant menu and order history; actual payment processing depends on the available payment-provider integration." },
    benefits: [
      { ar: "إدخال يدوي للطلب من واجهة تشغيلية واحدة.", en: "Enter manual orders from one operational interface." },
      { ar: "العمل ضمن منيو المطعم وسجل الطلبات.", en: "Work from the restaurant menu and order record." },
      { ar: "تمييز تسجيل الدفع النقدي عن تأكيد الدفع الإلكتروني.", en: "Distinguish cash recording from verified electronic payment." },
    ],
    workflow: [
      { title: { ar: "ابدأ الطلب", en: "Start an order" }, body: { ar: "اختر نوع الخدمة والطاولة عند الحاجة.", en: "Choose a service type and table when needed." } },
      { title: { ar: "أضف الأصناف", en: "Add items" }, body: { ar: "حدد المنتجات والكميات وأضف الملاحظات.", en: "Select products and quantities, then add notes." } },
      { title: { ar: "أرسل وتابع", en: "Send and follow" }, body: { ar: "أرسل الطلب إلى سير التشغيل وتابع حالته.", en: "Send the order into operations and follow its status." } },
    ],
    capabilities: [
      { ar: "اختيار المنتجات والأقسام", en: "Product and category selection" },
      { ar: "اختيار طاولة ونوع الطلب", en: "Table and order-type context" },
      { ar: "إدارة عناصر الطلب والكميات", en: "Order lines and quantities" },
      { ar: "تسجيل الدفع وفق حالة التكامل", en: "Payment recording according to integration status" },
    ],
    accent: "emerald",
  },
  {
    slug: "inventory",
    icon: PackageCheck,
    category: "operations",
    title: { ar: "إدارة المخزون", en: "Inventory management" },
    eyebrow: { ar: "مخزون تحت المتابعة", en: "Inventory in view" },
    summary: { ar: "نظّم المواد والموردين وحركات المخزون ضمن التشغيل.", en: "Organise ingredients, suppliers and stock movements in operations." },
    description: { ar: "اجمع سجلات المواد والموردين والحركات لتكوين رؤية تشغيلية أفضل للمخزون. تساعد الحدود والتنبيهات الفريق على مراجعة النواقص، مع بقاء الجرد والتحديثات الدقيقة مسؤولية المستخدم المخوّل.", en: "Bring ingredient, supplier and movement records together for a clearer operational view of stock. Thresholds and alerts help teams review shortages, while authorised users remain responsible for accurate counts and updates." },
    benefits: [
      { ar: "سجل مركزي للمواد ووحدات القياس.", en: "A central record for ingredients and units of measure." },
      { ar: "تتبع حركات المخزون والموردين.", en: "Track stock movements and suppliers." },
      { ar: "مراجعة المواد المنخفضة بحسب حدود يحددها المطعم.", en: "Review low stock against restaurant-defined thresholds." },
    ],
    workflow: [
      { title: { ar: "سجّل المادة", en: "Record an item" }, body: { ar: "أضف المادة ووحدتها ومعلومات المورد عند توفرها.", en: "Add the item, its unit and supplier details where available." } },
      { title: { ar: "حدّث الحركة", en: "Record a movement" }, body: { ar: "سجّل الإضافة أو الاستخدام للحفاظ على رصيد مفهوم.", en: "Record additions or usage to maintain an understandable balance." } },
      { title: { ar: "راجع التنبيهات", en: "Review alerts" }, body: { ar: "افحص المواد التي وصلت إلى الحد الذي عيّنته.", en: "Review items that have reached a threshold you set." } },
    ],
    capabilities: [
      { ar: "مواد وموردون", en: "Ingredients and suppliers" },
      { ar: "حركات وأرصدة المخزون", en: "Stock movements and balances" },
      { ar: "وحدات وحدود تنبيه", en: "Units and alert thresholds" },
      { ar: "مراجعة تشغيلية للمواد", en: "Operational ingredient review" },
    ],
    accent: "lime",
  },
];

export const faqs: { category: Localized; question: Localized; answer: Localized }[] = [
  {
    category: { ar: "البدء", en: "Getting started" },
    question: { ar: "هل يحتاج الزبون إلى تحميل تطبيق؟", en: "Do guests need to download an app?" },
    answer: { ar: "لا. يفتح الزبون رابط المنيو في متصفح هاتفه، ويمكنه الوصول إليه من رمز QR.", en: "No. Guests open the menu link in their phone browser, including from a QR code." },
  },
  {
    category: { ar: "البدء", en: "Getting started" },
    question: { ar: "كيف أبدأ إعداد مطعمي؟", en: "How do I set up my restaurant?" },
    answer: { ar: "أنشئ حساباً وأدخل بيانات المطعم الأولية المتاحة حالياً. المعالج الكامل وتحرير المنيو وإدارة الطاولات والاشتراك ستُستكمل في خطوات البناء المخصصة لها.", en: "Create an account and enter the initial restaurant details currently available. Full onboarding, menu editing, table management and subscriptions will be completed in their dedicated build steps." },
  },
  {
    category: { ar: "البدء", en: "Getting started" },
    question: { ar: "هل أحتاج إلى أجهزة خاصة؟", en: "Do I need special hardware?" },
    answer: { ar: "يمكن تصفح المنيو وإكمال الإعداد الأولي عبر متصفح حديث. تجهيزات المطبخ أو نقطة البيع تتعلق بميزات تشغيلية ستُبنى في مراحل لاحقة.", en: "The public menu and initial setup work in a modern browser. Kitchen or POS equipment depends on operational features that will be built in later phases." },
  },
  {
    category: { ar: "المنيو والطلبات", en: "Menu & orders" },
    question: { ar: "هل أستطيع تعديل الأسعار والمنيو بعد نشرهما؟", en: "Can I change prices and the menu after publishing?" },
    answer: { ar: "ليس بعد. المنيو العام متاح للتصفح فقط؛ محرر الأسعار والأقسام والمنتجات سيُستكمل في خطوة إدارة المنيو.", en: "Not yet. The public menu is browse-only; editing prices, categories and products will be completed in the menu-management phase." },
  },
  {
    category: { ar: "المنيو والطلبات", en: "Menu & orders" },
    question: { ar: "هل يمكن للضيف طلب الطعام عبر QR؟", en: "Can a guest order using QR?" },
    answer: { ar: "حالياً يفتح رمز QR المنيو للتصفح. إرسال الطلب من واجهة الضيف وتوجيهه للمطبخ سيُضافان ضمن مرحلة الطلبات اللاحقة.", en: "Currently, a QR code opens the menu for browsing. Guest order submission and kitchen routing will be added in a later order-workflow phase." },
  },
  {
    category: { ar: "المنيو والطلبات", en: "Menu & orders" },
    question: { ar: "هل يدعم النظام الطلبات الداخلية والاستلام والتوصيل؟", en: "Does it support dine-in, pickup and delivery orders?" },
    answer: { ar: "أنواع الطلب موجودة في بنية البيانات، لكن استقبال الطلبات ومعالجتها غير متاحين بعد؛ مسار الطلب التشغيلي مخطط لخطوة 6 وطلبات الضيوف لخطوة 11.", en: "Order types exist in the data model, but order submission and processing are not available yet; operational order flow is planned for step 6 and guest ordering for step 11." },
  },
  {
    category: { ar: "المنيو والطلبات", en: "Menu & orders" },
    question: { ar: "هل يمكن إضافة خيارات وإضافات للمنتج؟", en: "Can products have options and add-ons?" },
    answer: { ar: "يدعم النظام بنية للخيارات والمجموعات والإضافات، وستكتمل واجهات إدارتها في مرحلة إدارة المنيو.", en: "The system supports options, modifier groups and add-ons; their management screens are part of the menu-management build step." },
  },
  {
    category: { ar: "المنيو والطلبات", en: "Menu & orders" },
    question: { ar: "هل تصل الطلبات إلى المطبخ؟", en: "Do orders reach the kitchen?" },
    answer: { ar: "ليس بعد. شاشة المطبخ التفاعلية مخططة لخطوة 7 بعد استكمال مسارات الطلبات.", en: "Not yet. The interactive kitchen display is planned for step 7 after the order workflows are built." },
  },
  {
    category: { ar: "الخطط والأسعار", en: "Plans & pricing" },
    question: { ar: "هل الأسعار والحدود ثابتة؟", en: "Are prices and limits fixed?" },
    answer: { ar: "تعرض صفحة الأسعار بيانات الخطط النشطة الموجودة في المنصة. تعديلات الأسعار والحدود تدار من إعدادات المنصة المخوّلة.", en: "The pricing page displays active plans configured in the platform. Price and limit changes are managed by authorised platform settings." },
  },
  {
    category: { ar: "الخطط والأسعار", en: "Plans & pricing" },
    question: { ar: "هل يوجد خيار سنوي؟", en: "Is annual billing available?" },
    answer: { ar: "تُعرض قيمة السنة من إعدادات الباقة مع إجمالي الفترة والمقابل الشهري التوضيحي. تفعيل الاشتراك والتحصيل الإلكتروني سيأتي مع مرحلة الاشتراكات.", en: "The plan data displays an annual total and an indicative monthly equivalent. Subscription activation and online collection will follow in the subscription build phase." },
  },
  {
    category: { ar: "الخطط والأسعار", en: "Plans & pricing" },
    question: { ar: "هل يتوفر تخصيص للمؤسسات؟", en: "Are enterprise arrangements available?" },
    answer: { ar: "يمكن إرسال طلب للمؤسسات من صفحة الأسعار أو التواصل، ليُراجع الفريق الاحتياج قبل تحديد النطاق المناسب.", en: "Enterprise enquiries can be sent from pricing or contact so the team can review requirements before defining a scope." },
  },
  {
    category: { ar: "الخطط والأسعار", en: "Plans & pricing" },
    question: { ar: "كيف أختار الباقة المناسبة؟", en: "How do I choose the right plan?" },
    answer: { ar: "قارن حدود الباقات الظاهرة؛ التسجيل لا يختار باقة مدفوعة حالياً، وسيُبنى اختيار الخطة وإدارة الاشتراك في خطوة الاشتراكات. تواصل معنا لاحتياج المؤسسات.", en: "Compare the displayed plan limits; signup does not select a paid plan yet. Plan selection and subscription management will be built in the subscription phase. Contact us for enterprise needs." },
  },
  {
    category: { ar: "البيانات والأمان", en: "Data & security" },
    question: { ar: "هل بيانات المطاعم معزولة؟", en: "Is restaurant data isolated?" },
    answer: { ar: "بنية البيانات تفصل سجلات المطاعم، وتطبّق المسارات الداخلية المكتملة سياق المطعم والصلاحيات. المشروع لا يزال قيد البناء؛ لا تُدخل بيانات عملاء حقيقية قبل اكتمال واختبار جميع الميزات وأمن النشر.", en: "The data model scopes restaurant records, and completed internal routes apply restaurant context and permissions. The product is still under development; do not enter real customer data until all features and deployment security have been completed and tested." },
  },
  {
    category: { ar: "البيانات والأمان", en: "Data & security" },
    question: { ar: "هل يستطيع كل موظف رؤية التقارير المالية؟", en: "Can every staff member see financial reports?" },
    answer: { ar: "الوصول المالي يُضبط وفق الأدوار والصلاحيات. التقارير المالية نفسها ستُستكمل في خطوة التقارير؛ لا تستخدمها كميزة متاحة حالياً.", en: "Financial access is designed to follow roles and permissions. The financial-reporting screens are planned for the reporting phase and are not available yet." },
  },
  {
    category: { ar: "البيانات والأمان", en: "Data & security" },
    question: { ar: "ما دور الذكاء الاصطناعي في القرارات؟", en: "What role does AI play in decisions?" },
    answer: { ar: "مساعد الذكاء الاصطناعي مخطط لمرحلة لاحقة ولم يُطلق بعد. عند إتاحته سيكون أداة مساندة؛ راجع الأرقام ولا تعتمد على اقتراح آلي وحده لقرار مالي أو تشغيلي مهم.", en: "The AI assistant is planned for a later phase and has not launched. When available it will be a supporting tool; verify figures and do not rely on an automated suggestion alone for an important decision." },
  },
  {
    category: { ar: "الدعم", en: "Support" },
    question: { ar: "كيف أتواصل مع فريق DineFlow؟", en: "How can I reach the DineFlow team?" },
    answer: { ar: "أرسل استفسارك من صفحة التواصل وحدد موضوع الرسالة، وسنتمكن من مراجعة تفاصيل طلبك.", en: "Send an enquiry from the contact page and choose a topic so your request can be reviewed." },
  },
];

export const faqCategories = Array.from(new Set(faqs.map((item) => item.category.en)));
