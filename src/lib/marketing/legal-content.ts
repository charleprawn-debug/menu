export type LegalLocale = "ar" | "en";
type Bilingual = Record<LegalLocale, string>;
export interface LegalSection { title: Bilingual; body: Bilingual[] }

export const legalNotice: Bilingual = {
  ar: "مسودة ما قبل الإطلاق: مشغّل الخدمة واسمه القانوني وعنوانه والاختصاص القانوني ووسائل التواصل الرسمية لم تُحدد في مواصفات المشروع. يجب إكمال هذه البيانات ومراجعة النصوص مع مستشار قانوني محلي قبل إتاحة الخدمة تجارياً.",
  en: "Pre-launch review draft: the service operator's legal name, address, governing jurisdiction and official contact details were not specified in the project brief. Complete those details and obtain local legal review before commercial launch.",
};

export const termsSections: LegalSection[] = [
  {
    title: { ar: "1. نطاق الشروط والموافقة", en: "1. Scope and acceptance" },
    body: [
      { ar: "تحكم هذه الشروط وصولك إلى منصة DineFlow واستخدامك لها، بما في ذلك لوحة المطعم والمنيو العام والأدوات المرتبطة بها. باستخدام الخدمة أو إنشاء حساب، تقر بأنك قرأت هذه الشروط وتملك الصلاحية للتصرف باسمك أو باسم المنشأة التي تمثلها.", en: "These terms govern access to and use of the DineFlow platform, including restaurant dashboards, public menus and related tools. By using the service or creating an account, you confirm that you have read these terms and are authorised to act for yourself or the organisation you represent." },
      { ar: "إذا كان المستخدم يتصرف نيابة عن مطعم أو منشأة، فإن الإشارات إلى «أنت» تشمل المستخدم والمنشأة في حدود الصلاحيات المخولة له. إذا لم توافق على الشروط، فلا تستخدم الخدمة.", en: "Where a user acts for a restaurant or organisation, references to “you” include that user and organisation within the authority granted. If you do not agree, do not use the service." },
    ],
  },
  {
    title: { ar: "2. الحسابات والمسؤوليات", en: "2. Accounts and responsibilities" },
    body: [
      { ar: "قد تتطلب بعض الأدوات حساباً. قدم معلومات صحيحة وحدّثها، واحفظ بيانات الدخول، واستخدم أدوار وصلاحيات الفريق بمسؤولية. أنت مسؤول عن الأنشطة التي تتم عبر حساباتك وعن مراجعة الوصول عند تغير أدوار الموظفين.", en: "Some tools require an account. Provide accurate, current information, protect credentials and assign staff roles and permissions responsibly. You are responsible for activity through your accounts and for reviewing access when staff responsibilities change." },
      { ar: "أبلغ مشغّل الخدمة عن الاستخدام غير المصرح به أو الاشتباه باختراق الحساب. لا تشارك بيانات الدخول أو تحاول تجاوز ضوابط الوصول.", en: "Notify the service operator of unauthorised use or suspected account compromise. Do not share credentials or attempt to bypass access controls." },
    ],
  },
  {
    title: { ar: "3. الاشتراك والأسعار والدفع", en: "3. Plans, prices and payment" },
    body: [
      { ar: "تظهر صفحة الأسعار الخطط والأسعار وحدود الاستخدام كما هي مضبوطة في المنصة وقت العرض. تختلف الميزات والحدود بحسب الخطة. أي تجربة أو دورة فوترة أو رسوم أو ضريبة تخضع لما يظهر قبل تأكيد الاشتراك وما يرد في اتفاق منفصل إن وجد.", en: "The pricing page displays plans, prices and usage limits as configured in the platform at the time shown. Features and limits differ by plan. Any trial, billing cycle, fee or tax is governed by the information presented before subscription confirmation and any separate agreement, if applicable." },
      { ar: "لا يصبح الدفع الإلكتروني مؤكداً لمجرد عرضه داخل واجهة النظام؛ يجب أن تؤكده جهة الدفع المعنية. عند تفعيل الدفع أو التجديد، ستعرض آلية الدفع والشروط المرتبطة به قبل إتمام العملية.", en: "An electronic payment is not confirmed merely because it appears in the interface; it must be confirmed by the applicable payment provider. When payments or renewals are enabled, the payment method and associated terms should be presented before completion." },
    ],
  },
  {
    title: { ar: "4. استخدام مقبول", en: "4. Acceptable use" },
    body: [
      { ar: "استخدم الخدمة وفق القانون والحقوق المطبقة، ولا تستخدمها لإرسال محتوى غير قانوني أو مضلل أو ضار، أو لانتهاك خصوصية الآخرين أو حقوقهم، أو لمحاولة الوصول غير المصرح به أو الإضرار باستقرار الخدمة.", en: "Use the service in accordance with applicable law and rights. Do not use it to distribute unlawful, deceptive or harmful content, infringe others' privacy or rights, gain unauthorised access or disrupt service stability." },
      { ar: "أنت مسؤول عن دقة قوائم الطعام والأسعار والمواد المسببة للحساسية والتوفر ومعلومات الطلب التي تنشرها للضيوف، وعن معالجة الطلبات وفق التزامات مطعمك.", en: "You are responsible for the accuracy of menus, prices, allergen and availability information, and order details shown to guests, as well as fulfilling orders under your restaurant's obligations." },
    ],
  },
  {
    title: { ar: "5. محتوى المطعم والملكية الفكرية", en: "5. Restaurant content and intellectual property" },
    body: [
      { ar: "تحتفظ بملكية المحتوى الذي ترفعه إلى الخدمة، وتمنح مشغّلها ترخيصاً محدوداً لتخزينه ومعالجته وعرضه بالقدر اللازم لتوفير الخدمة ودعمها. تضمن أن لديك الحقوق والأذونات اللازمة لاستخدام الصور والنصوص والعلامات التجارية التي تقدمها.", en: "You retain ownership of content you upload and grant the service operator a limited licence to store, process and display it as needed to provide and support the service. You confirm that you hold the rights and permissions needed for submitted images, text and trademarks." },
      { ar: "تعود حقوق المنصة وبرمجياتها وتصميمها وعلاماتها إلى أصحابها. لا تمنحك هذه الشروط ملكية في الخدمة، ولا تجيز لك نسخها أو إعادة بيعها إلا بموافقة مكتوبة أو ما يسمح به القانون.", en: "Rights in the platform, software, design and marks remain with their respective owners. These terms do not transfer ownership of the service or permit copying or resale except with written permission or as allowed by law." },
    ],
  },
  {
    title: { ar: "6. بيانات المطعم والخصوصية", en: "6. Restaurant data and privacy" },
    body: [
      { ar: "تظل بيانات المطعم والضيوف التي تدخلها عبر الخدمة خاضعة لسياسة الخصوصية وللاتفاقات المطبقة. بصفتك مطعماً، أنت مسؤول عن إظهار الإشعارات اللازمة لضيوفك وعن جمع البيانات واستخدامها وفق متطلباتك القانونية.", en: "Restaurant and guest data entered through the service is subject to the Privacy Policy and applicable agreements. As a restaurant, you are responsible for providing required notices to your guests and collecting and using data according to your legal obligations." },
      { ar: "استخدم صلاحيات الحسابات بما يقلل الوصول غير الضروري إلى البيانات، ولا تدخل بيانات حساسة لا تحتاج إليها الخدمة.", en: "Use account permissions to limit unnecessary data access, and do not submit sensitive information the service does not require." },
    ],
  },
  {
    title: { ar: "7. التوفر والتغييرات والدعم", en: "7. Availability, changes and support" },
    body: [
      { ar: "نعمل على تطوير الخدمة وقد نضيف ميزات أو نعدّلها أو نوقفها. نبذل جهداً معقولاً للحفاظ على التوفر، لكن لا نضمن خدمة بلا انقطاع أو خلوها من الأخطاء ما لم يوجد اتفاق مكتوب منفصل.", en: "We continue to develop the service and may add, change or discontinue features. We use reasonable efforts to maintain availability but do not guarantee uninterrupted or error-free service unless a separate written agreement says otherwise." },
      { ar: "ستُتاح قنوات الدعم وساعات الاستجابة وفق ما ينشر أو يتفق عليه، ولا تنشئ صفحة التواصل وحدها التزاماً بزمن استجابة محدد.", en: "Support channels and response hours will be those published or separately agreed. The contact page alone does not create a guaranteed response time." },
    ],
  },
  {
    title: { ar: "8. الإيقاف والإنهاء", en: "8. Suspension and termination" },
    body: [
      { ar: "يمكن تقييد الحساب أو إيقافه عند وجود خطر أمني أو مخالفة جوهرية لهذه الشروط أو متطلب قانوني، مع مراعاة الإشعار والإجراءات التي يفرضها القانون أو الاتفاق المطبق.", en: "An account may be restricted or suspended for a security risk, material breach of these terms or legal requirement, subject to notices and procedures required by applicable law or agreement." },
      { ar: "عند انتهاء الاشتراك، تخضع إمكانية الوصول إلى البيانات وتنزيلها ومدة الاحتفاظ بها للخطة والاتفاق المطبق وسياسة الخصوصية. احتفظ بنسخ مناسبة من السجلات التي تحتاج إليها.", en: "After a subscription ends, access to, export of and retention periods for data are governed by the plan, applicable agreement and Privacy Policy. Maintain suitable copies of records you need." },
    ],
  },
  {
    title: { ar: "9. إخلاء المسؤولية وحدودها", en: "9. Disclaimers and liability" },
    body: [
      { ar: "إلى الحد الذي يسمح به القانون، تقدم الخدمة كما هي ومتاحة. لا تحل التقارير أو اقتراحات الذكاء الاصطناعي محل المشورة المحاسبية أو القانونية أو التشغيلية المختصة، ويجب التحقق من النتائج قبل الاعتماد عليها.", en: "To the extent permitted by law, the service is provided as available. Reports and AI-generated suggestions are not a substitute for professional accounting, legal or operational advice; verify results before relying on them." },
      { ar: "تحدد المسؤولية والاستثناءات وفق القانون الواجب التطبيق وأي اتفاق مكتوب. لا تقصد هذه الشروط استبعاد مسؤولية لا يجوز قانوناً استبعادها.", en: "Liability and exclusions are subject to applicable law and any written agreement. These terms do not seek to exclude liability that cannot legally be excluded." },
    ],
  },
  {
    title: { ar: "10. تحديث الشروط والتواصل", en: "10. Changes and contact" },
    body: [
      { ar: "قد نحدّث الشروط مع تطور الخدمة. سنعرض النسخة المحدّثة وتاريخ سريانها على هذه الصفحة؛ وإذا تطلب القانون موافقة جديدة، فسنطلبها بالطريقة المناسبة.", en: "We may update these terms as the service evolves. The revised version and effective date will appear on this page; where law requires renewed consent, it will be requested appropriately." },
      { ar: "أرسل الأسئلة أو الاعتراضات من صفحة التواصل. يجب استبدال بيانات مشغّل الخدمة والاختصاص القانوني في هذه المسودة قبل الإطلاق التجاري.", en: "Send questions or concerns through the contact page. The service operator and governing-jurisdiction details in this draft must be completed before commercial launch." },
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: { ar: "1. من نحن ونطاق السياسة", en: "1. Who we are and scope" },
    body: [
      { ar: "تشرح هذه السياسة أنواع المعلومات التي تعالجها منصة DineFlow وأغراض استخدامها وطرق إدارتها. هوية المشغّل القانوني وعنوانه واختصاصه لم ترد في مواصفات المشروع، ويجب إكمالها قبل الإطلاق التجاري.", en: "This policy explains the types of information processed by DineFlow, why it is used and how it is managed. The legal operator, address and jurisdiction were not specified in the project brief and must be completed before commercial launch." },
      { ar: "تعالج DineFlow بيانات حسابات المطاعم لتشغيل المنصة. أما بيانات الضيوف التي يضيفها المطعم أو يجمعها عبر المنيو والطلبات، فقد يعمل المطعم بوصفه الجهة التي تحدد أغراض معالجتها، ويعمل مزود المنصة وفق التعليمات والاتفاقات المطبقة. يجب تثبيت هذا التوزيع في عقد معالجة بيانات عند اللزوم.", en: "DineFlow processes restaurant account data to operate the platform. For guest data a restaurant adds or collects through menus and orders, the restaurant may determine the purposes of processing while the platform provider acts on its instructions and applicable agreements. This allocation should be documented in a data-processing agreement where required." },
    ],
  },
  {
    title: { ar: "2. المعلومات التي قد نعالجها", en: "2. Information we may process" },
    body: [
      { ar: "قد تشمل المعلومات: اسم المستخدم وبريده ورقم هاتفه الاختياري؛ بيانات المطعم والفروع والموظفين؛ أقسام المنيو والمنتجات والأسعار والصور؛ الطلبات والطاولات والحجوزات والمدفوعات المسجلة؛ رسائل التواصل والدعم؛ وبيانات تقنية لازمة للتشغيل والحماية. قد يُحفظ مع الاستفسارات معرّف مجزأ لمصدر الاتصال بغرض الحد من الرسائل الآلية وإساءة الاستخدام.", en: "Information may include a user's name, email and optional phone number; restaurant, branch and staff details; menu categories, products, prices and images; orders, tables, reservations and recorded payments; contact and support messages; and technical data needed for operation and protection. An enquiry may also retain a hashed source identifier for abuse prevention and rate limiting." },
      { ar: "لا تطلب من الضيوف أو الموظفين إرسال بيانات شخصية أو مالية حساسة عبر حقول لا تحتاجها المنصة.", en: "Do not ask guests or staff to submit sensitive personal or financial information through fields the platform does not need." },
    ],
  },
  {
    title: { ar: "3. أغراض الاستخدام", en: "3. How information is used" },
    body: [
      { ar: "تُستخدم المعلومات لتقديم الحساب والمنيو وإدارة الطلبات والطاولات والموظفين والاشتراك، ولتأمين الخدمة وحل الأعطال، ومعالجة استفسارات التواصل والدعم، وتحسين المنتج، والوفاء بمتطلبات قانونية أو تعاقدية عند انطباقها.", en: "Information is used to provide accounts, menus, order, table, staff and subscription management; secure the service and resolve faults; handle contact and support enquiries; improve the product; and meet legal or contractual requirements where applicable." },
      { ar: "لا يعني وجود وظيفة ذكاء اصطناعي أن اقتراحاتها صحيحة أو أنها تتخذ القرار نيابة عن المطعم. راجع المخرجات ولا تدخل معلومات لا ترغب في معالجتها وفق الخدمة.", en: "The presence of an AI feature does not mean its suggestions are correct or that it makes decisions for a restaurant. Review outputs and do not submit information you do not want processed under the service." },
    ],
  },
  {
    title: { ar: "4. الأساس القانوني", en: "4. Legal basis" },
    body: [
      { ar: "تختلف الأسس القانونية باختلاف البلد وعلاقة المستخدم بالخدمة. قد تشمل تنفيذ عقد، أو اتخاذ خطوات قبل التعاقد، أو موافقة المستخدم حيث تلزم، أو مصلحة مشروعة لا تتغلب عليها الحقوق، أو الوفاء بالتزام قانوني. يجب مراجعة هذه الأسس وتخصيصها للاختصاص الفعلي قبل الإطلاق.", en: "Legal bases vary by country and by the user's relationship with the service. They may include contract performance, pre-contractual steps, consent where required, legitimate interests that do not override rights, or legal obligations. These bases must be reviewed and tailored to the actual jurisdiction before launch." },
    ],
  },
  {
    title: { ar: "5. المشاركة والمعالجون", en: "5. Sharing and processors" },
    body: [
      { ar: "قد تُعالج المعلومات بواسطة مزودي استضافة أو قاعدة بيانات أو حماية أو دفع أو خدمات أخرى لازمة للتشغيل. نشارك الحد اللازم فقط، وتخضع مشاركة البيانات للضوابط والعقود المطبقة.", en: "Information may be processed by hosting, database, security, payment or other providers needed for operation. Only necessary information should be shared, subject to applicable safeguards and agreements." },
      { ar: "قد نكشف معلومات إذا تطلب القانون ذلك أو لحماية المستخدمين والمنصة، أو ننقلها ضمن إعادة تنظيم مؤسسي وفق الضمانات القانونية. لا تباع بيانات الحسابات الشخصية وفق تصميم هذا المنتج.", en: "Information may be disclosed where legally required or to protect users and the platform, or transferred in a corporate reorganisation with applicable safeguards. Personal account data is not designed to be sold." },
    ],
  },
  {
    title: { ar: "6. الاحتفاظ والحذف", en: "6. Retention and deletion" },
    body: [
      { ar: "نحتفظ بالمعلومات ما دامت لازمة لأغراض تشغيل الحساب والدعم والأمان والوفاء بالمتطلبات القانونية والتعاقدية، ثم نحذفها أو نجهل هويتها وفق إجراءات الاحتفاظ والنسخ الاحتياطي. المدد الدقيقة تعتمد على الإعدادات والاتفاق والاختصاص، ويجب تحديدها قبل الإطلاق التجاري.", en: "Information is retained while needed for account operation, support, security and legal or contractual requirements, then deleted or de-identified under retention and backup procedures. Exact periods depend on settings, agreements and jurisdiction and should be defined before commercial launch." },
      { ar: "قد تبقى نسخ احتياطية مؤقتة حتى دورة الاستبدال، وقد نحتفظ بسجلات لازمة للامتثال أو حل النزاعات بالقدر المسموح به.", en: "Temporary backup copies may remain until their replacement cycle, and records needed for compliance or dispute resolution may be retained to the extent permitted." },
    ],
  },
  {
    title: { ar: "7. الأمان", en: "7. Security" },
    body: [
      { ar: "نستخدم ضوابط تقنية وتنظيمية تتناسب مع غرض الخدمة، مثل المصادقة وإدارة الجلسات وفصل سياق المطعم والصلاحيات. لا يوجد نقل أو تخزين إلكتروني خالٍ تماماً من المخاطر؛ حافظ على سرية بيانات الدخول واستخدم صلاحيات مناسبة.", en: "We use technical and organisational controls appropriate to the service, including authentication, session management, restaurant context and permissions. No electronic transmission or storage is risk-free; protect credentials and use appropriate access controls." },
      { ar: "إذا كنت تشك بوجود وصول غير مصرح به إلى حسابك، غيّر كلمة المرور وأبلغ فريق DineFlow عبر صفحة التواصل.", en: "If you suspect unauthorised access to your account, change your password and notify the DineFlow team through the contact page." },
    ],
  },
  {
    title: { ar: "8. حقوق المستخدمين", en: "8. User rights" },
    body: [
      { ar: "بحسب الاختصاص، قد تملك حقوق الوصول والتصحيح والحذف والاعتراض وتقييد المعالجة ونقل البيانات وسحب الموافقة. أرسل الطلب من صفحة التواصل، وسنحتاج إلى التحقق من الهوية وتحديد الحساب أو المطعم المعني.", en: "Depending on jurisdiction, you may have rights to access, correct or delete information, object to or restrict processing, receive a copy or withdraw consent. Submit a request through the contact page; we may need to verify identity and identify the relevant account or restaurant." },
      { ar: "إذا كان الطلب يتعلق ببيانات ضيف جمعها مطعم، فقد يكون المطعم هو جهة التواصل المناسبة أو الجهة التي تقرر الاستجابة. لا يحد هذا من أي حق مباشر يقرره القانون.", en: "For guest information collected by a restaurant, the restaurant may be the appropriate contact or the party responsible for deciding the response. This does not limit any direct right provided by law." },
    ],
  },
  {
    title: { ar: "9. ملفات الارتباط والتقنيات المشابهة", en: "9. Cookies and similar technologies" },
    body: [
      { ar: "قد تستخدم المنصة ملفات أو قيماً محلية لازمة لتسجيل الدخول والجلسة واللغة والتفضيلات. يمكن للمتصفح حظر بعض التخزين، لكن وظائف تسجيل الدخول أو الواجهة قد لا تعمل كما ينبغي. يجب إدراج أي تحليلات أو ملفات اختيارية لاحقاً في هذه السياسة والحصول على الموافقات المطلوبة.", en: "The platform may use cookies or local values needed for sign-in, sessions, language and preferences. Blocking some storage may prevent sign-in or interface features from working correctly. Any later analytics or optional cookies should be listed here and the required consent obtained." },
    ],
  },
  {
    title: { ar: "10. النقل الدولي والتحديثات والتواصل", en: "10. International transfers, updates and contact" },
    body: [
      { ar: "قد يوجد مزودو الخدمة أو النسخ الاحتياطية في بلد مختلف عن بلدك. عند انطباق متطلبات النقل الدولي، يجب تحديد أماكن المعالجة والضمانات المناسبة وفق القانون المعني.", en: "Service providers or backups may be located in a different country. Where international-transfer rules apply, processing locations and appropriate safeguards must be identified under the relevant law." },
      { ar: "قد تتغير هذه السياسة مع تطور الخدمة. ننشر النسخة وتاريخ سريانها على هذه الصفحة. لإرسال طلب خصوصية أو سؤال، استخدم نموذج التواصل وحدد موضوع الرسالة. يجب استكمال بيانات المشغّل والاختصاص ووسيلة الاتصال الرسمية قبل الإطلاق التجاري.", en: "This policy may change as the service evolves. The version and effective date will be posted here. To submit a privacy request or question, use the contact form and select the relevant topic. Operator, jurisdiction and official contact details must be completed before commercial launch." },
    ],
  },
];
