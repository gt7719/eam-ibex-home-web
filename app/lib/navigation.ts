export type HeaderMenuId = "product" | "solution" | "industry" | "ai" | "intro";

export type NavigationItem = {
  id: string;
  titleMn: string;
  titleEn: string;
  descriptionMn: string;
  descriptionEn: string;
  icon: string;
  href: string;
  openInNewTab: boolean;
  enabled: boolean;
  media?: {
    type: "none" | "image" | "video" | "pdf";
    url: string;
    altMn: string;
    altEn: string;
    captionMn: string;
    captionEn: string;
  };
};

export type NavigationGroup = {
  id: string;
  titleMn: string;
  titleEn: string;
  enabled: boolean;
  items: NavigationItem[];
};

export type NavigationMenu = {
  id: HeaderMenuId;
  labelMn: string;
  labelEn: string;
  enabled: boolean;
  kickerMn: string;
  kickerEn: string;
  titleMn: string;
  titleEn: string;
  introMn: string;
  introEn: string;
  footerMn: string;
  footerEn: string;
  feature: {
    eyebrowMn: string;
    eyebrowEn: string;
    titleMn: string;
    titleEn: string;
    descriptionMn: string;
    descriptionEn: string;
    statMn: string;
    statEn: string;
    ctaMn: string;
    ctaEn: string;
  };
  groups: NavigationGroup[];
};

export type NavigationConfig = { menus: NavigationMenu[] };

export const NAVIGATION_MENU_IDS: HeaderMenuId[] = ["product", "solution", "industry", "ai", "intro"];

export const DEFAULT_NAVIGATION: NavigationConfig = {
  "menus": [
    {
      "id": "product",
      "labelMn": "Бүтээгдэхүүн",
      "labelEn": "Product",
      "enabled": true,
      "kickerMn": "БҮТЭЭГДЭХҮҮН • ASSET CORE + 14 МОДУЛЬ",
      "kickerEn": "PRODUCT • ASSET CORE + 14 MODULES",
      "titleMn": "Хөрөнгөд суурилсан засвар үйлчилгээний удирдлага",
      "titleEn": "Asset-based maintenance management",
      "introMn": "Asset Core нь ажил, засварын стратеги, нөөц, зардал, эрсдэл болон шийдвэрийн мэдээллийг хөрөнгө бүрийн түүхэд нэгтгэнэ.",
      "introEn": "Asset Core unifies work, maintenance strategy, resources, cost, risk and decisions in each asset history.",
      "footerMn": "Asset Core нь суурь бүтэц бөгөөд 14 модулийн тоонд орохгүй.",
      "footerEn": "Asset Core is the foundation and is not counted among the 14 modules.",
      "feature": {
        "eyebrowMn": "БҮТЭЭГДЭХҮҮНИЙ ТОЙМ",
        "eyebrowEn": "PRODUCT OVERVIEW",
        "titleMn": "Asset Core. 14 уялдсан модуль.",
        "titleEn": "Asset Core. 14 connected modules.",
        "descriptionMn": "Засварын мэдээллийг хөрөнгө бүрийн түүхэд нэгтгэнэ.",
        "descriptionEn": "Unify maintenance information in each asset history.",
        "statMn": "5 БҮТЭЦ • 14 МОДУЛЬ",
        "statEn": "5 STRUCTURES • 14 MODULES",
        "ctaMn": "Бүтээгдэхүүнийг бүрэн харах →",
        "ctaEn": "Explore the product →"
      },
      "groups": [
        {
          "id": "product-0",
          "titleMn": "Asset Core",
          "titleEn": "Asset Core",
          "enabled": true,
          "items": [
            {
              "id": "product-0-0",
              "titleMn": "Хөрөнгийн нэгдсэн бүртгэл",
              "titleEn": "Unified Asset Register",
              "descriptionMn": "Parent–Child бүтэц, байршил ба засварын түүх",
              "descriptionEn": "Parent–Child structure, location and maintenance history",
              "icon": "asset",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "product-1",
          "titleMn": "Илрүүлэх ба ажил гүйцэтгэх",
          "titleEn": "Detect & Execute",
          "enabled": true,
          "items": [
            {
              "id": "product-1-0",
              "titleMn": "Хүсэлт",
              "titleEn": "Requests",
              "descriptionMn": "Доголдлыг засварын ажилд шилжүүлэх",
              "descriptionEn": "Turn a defect into maintenance work",
              "icon": "request",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-1-1",
              "titleMn": "Үзлэг",
              "titleEn": "Inspections",
              "descriptionMn": "Нөхцөл, доголдлыг эрт бүртгэх",
              "descriptionEn": "Record condition and defects early",
              "icon": "inspection",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-1-2",
              "titleMn": "Ажлын захиалга",
              "titleEn": "Work Orders",
              "descriptionMn": "Төлөвлөлтөөс хаалт хүртэл",
              "descriptionEn": "Plan through closeout",
              "icon": "work",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-1-3",
              "titleMn": "MyTask ба Mobile",
              "titleEn": "MyTask & Mobile",
              "descriptionMn": "Талбайн засварын гүйцэтгэл",
              "descriptionEn": "Field maintenance execution",
              "icon": "mobile",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "product-2",
          "titleMn": "Засварын стратеги ба төлөвлөлт",
          "titleEn": "Maintenance Strategy & Planning",
          "enabled": true,
          "items": [
            {
              "id": "product-2-0",
              "titleMn": "PM",
              "titleEn": "PM",
              "descriptionMn": "Хуваарьт засварын ажлыг автоматаар үүсгэх",
              "descriptionEn": "Automatically generate scheduled maintenance",
              "icon": "calendar",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-2-1",
              "titleMn": "PdM",
              "titleEn": "PdM",
              "descriptionMn": "Тоолуур ба нөхцөлийн босгоор ажил үүсгэх",
              "descriptionEn": "Generate work from meter and condition thresholds",
              "icon": "condition",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-2-2",
              "titleMn": "Хуваарь ба гүйцэтгэл",
              "titleEn": "Schedule & Performance",
              "descriptionMn": "Хүн, хугацаа, ажлын ачааллыг төлөвлөх",
              "descriptionEn": "Plan people, time and workload",
              "icon": "schedule",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "product-3",
          "titleMn": "Нөөц, зардал ба хэрэгжилт",
          "titleEn": "Resources, Cost & Delivery",
          "enabled": true,
          "items": [
            {
              "id": "product-3-0",
              "titleMn": "Сэлбэг ба BOM",
              "titleEn": "Parts & BOM",
              "descriptionMn": "Хөрөнгийн сэлбэгийн бүтэц",
              "descriptionEn": "Asset spare-parts structure",
              "icon": "parts",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-3-1",
              "titleMn": "Агуулах ба нөөц",
              "titleEn": "Warehouse & Inventory",
              "descriptionMn": "Орлого, зарлага, бодит үлдэгдэл",
              "descriptionEn": "Receipts, issues and balance",
              "icon": "warehouse",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-3-2",
              "titleMn": "Төсөв ба зардал",
              "titleEn": "Budget & Cost",
              "descriptionMn": "Засварын төлөвлөгөө ба бодит зардал",
              "descriptionEn": "Maintenance plan versus actual cost",
              "icon": "cost",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-3-3",
              "titleMn": "Төсөл ба гэрээ",
              "titleEn": "Projects & Contracts",
              "descriptionMn": "Хугацаа, үүрэг ба хэрэгжилт",
              "descriptionEn": "Schedule, obligations and delivery",
              "icon": "contract",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "product-4",
          "titleMn": "Эрсдэл, өгөгдөл ба шийдвэр",
          "titleEn": "Risk, Data & Decisions",
          "enabled": true,
          "items": [
            {
              "id": "product-4-0",
              "titleMn": "ХАБЭА",
              "titleEn": "HSE",
              "descriptionMn": "Засварын ажилтай холбоотой эрсдэл",
              "descriptionEn": "Risk connected to maintenance work",
              "icon": "safety",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-4-1",
              "titleMn": "Datahub ба AI",
              "titleEn": "Datahub & AI",
              "descriptionMn": "Техникийн өгөгдлийг засварын шийдвэрт ашиглах",
              "descriptionEn": "Use technical data for maintenance decisions",
              "icon": "data",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "product-4-2",
              "titleMn": "Тайлан ба KPI",
              "titleEn": "Reports & KPI",
              "descriptionMn": "Засвар үйлчилгээний хэмжигдэхүйц үр дүн",
              "descriptionEn": "Measurable maintenance outcomes",
              "icon": "report",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        }
      ]
    },
    {
      "id": "solution",
      "labelMn": "Шийдэл",
      "labelEn": "Solutions",
      "enabled": true,
      "kickerMn": "ШИЙДЭЛ • БИЗНЕСИЙН 8 ХЭРЭГЦЭЭ",
      "kickerEn": "SOLUTIONS • 8 BUSINESS NEEDS",
      "titleMn": "Засварын асуудлаас хэмжигдэхүйц үр дүн рүү",
      "titleEn": "From maintenance problem to measurable result",
      "introMn": "Хөрөнгийн доголдол, засварын төлөвлөлт, нөөц, зардал болон хэрэгжилтийн асуудалд тохирох iBeX шийдлийг сонгоно.",
      "introEn": "Choose an iBeX solution for asset failures, maintenance planning, resources, cost and delivery.",
      "footerMn": "Шийдэл бүр бизнесийн асуудал, iBeX-ийн арга, холбогдох модуль болон хэмжих үзүүлэлттэй байна.",
      "footerEn": "Each solution links the business issue, iBeX approach, modules and measures.",
      "feature": {
        "eyebrowMn": "БИЗНЕСИЙН ҮР ДҮН",
        "eyebrowEn": "BUSINESS OUTCOMES",
        "titleMn": "Засварын асуудлаас хэмжигдэхүйц үр дүн рүү.",
        "titleEn": "From maintenance problem to measurable result.",
        "descriptionMn": "Найдвартай ажиллагаа, талбай, нөөц, зардалд тохирох шийдлээ сонгоно.",
        "descriptionEn": "Choose for reliability, field work, resources and cost.",
        "statMn": "8 БИЗНЕСИЙН ХЭРЭГЦЭЭ",
        "statEn": "8 BUSINESS NEEDS",
        "ctaMn": "Бүх шийдлийг харах →",
        "ctaEn": "Explore all solutions →"
      },
      "groups": [
        {
          "id": "solution-0",
          "titleMn": "Хөрөнгийн найдвартай ажиллагаа",
          "titleEn": "Asset Reliability",
          "enabled": true,
          "items": [
            {
              "id": "solution-0-0",
              "titleMn": "Төлөвлөгдөөгүй зогсолтыг бууруулах",
              "titleEn": "Reduce Unplanned Downtime",
              "descriptionMn": "PM, PdM ба үзлэгийн уялдаа",
              "descriptionEn": "PM, PdM and inspection",
              "icon": "downtime",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "solution-0-1",
              "titleMn": "Ажлын төлөвлөлтийг сайжруулах",
              "titleEn": "Improve Work Planning",
              "descriptionMn": "Хуваарь, баг ба гүйцэтгэл",
              "descriptionEn": "Schedule, teams and execution",
              "icon": "calendarCheck",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "solution-1",
          "titleMn": "Талбайн гүйцэтгэл ба аюулгүй байдал",
          "titleEn": "Field Execution & Safety",
          "enabled": true,
          "items": [
            {
              "id": "solution-1-0",
              "titleMn": "Талбайн засварын гүйцэтгэлийг хянах",
              "titleEn": "Control Field Maintenance",
              "descriptionMn": "Mobile бүртгэл, явц ба нотолгоо",
              "descriptionEn": "Mobile records, progress and evidence",
              "icon": "fieldWork",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "solution-1-1",
              "titleMn": "ХАБЭА ба эрсдэлийг ажилтай холбох",
              "titleEn": "Connect HSE & Risk to Work",
              "descriptionMn": "Эрсдэл, арга хэмжээ ба засварын ажил",
              "descriptionEn": "Risk, actions and maintenance work",
              "icon": "safety",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "solution-2",
          "titleMn": "Нөөц ба зардал",
          "titleEn": "Resources & Cost",
          "enabled": true,
          "items": [
            {
              "id": "solution-2-0",
              "titleMn": "Сэлбэгийн бэлэн байдлыг оновчлох",
              "titleEn": "Optimize Spare Availability",
              "descriptionMn": "Зөв сэлбэг, зөв байршил",
              "descriptionEn": "Correct part and location",
              "icon": "stock",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "solution-2-1",
              "titleMn": "Засварын зардлыг хянах",
              "titleEn": "Control Maintenance Cost",
              "descriptionMn": "Төсөв, WO зардал ба зөрүү",
              "descriptionEn": "Budget, WO cost and variance",
              "icon": "budget",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "solution-3",
          "titleMn": "Удирдлага ба хэрэгжилт",
          "titleEn": "Management & Delivery",
          "enabled": true,
          "items": [
            {
              "id": "solution-3-0",
              "titleMn": "Төсөл, гэрээний хэрэгжилтийг хянах",
              "titleEn": "Control Projects & Contracts",
              "descriptionMn": "Хугацаа, үүрэг ба гүйцэтгэл",
              "descriptionEn": "Schedule, obligations and delivery",
              "icon": "signed",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "solution-3-1",
              "titleMn": "KPI-д суурилсан шийдвэр гаргах",
              "titleEn": "Make KPI-Based Decisions",
              "descriptionMn": "Засварын өгөгдлийн нэгдсэн зураг",
              "descriptionEn": "Unified maintenance data",
              "icon": "analytics",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        }
      ]
    },
    {
      "id": "industry",
      "labelMn": "Салбар",
      "labelEn": "Industries",
      "enabled": true,
      "kickerMn": "САЛБАР • 8 ХЭРЭГЛЭЭНИЙ ОРЧИН",
      "kickerEn": "INDUSTRIES • 8 USE ENVIRONMENTS",
      "titleMn": "Салбарын хөрөнгийн засварын онцлогт тохирно",
      "titleEn": "Adapted to each industry’s maintenance context",
      "introMn": "iBeX нь үйлдвэрлэл, ашиглалтын процессыг удирдахгүй; салбар бүрийн хөрөнгө, эрсдэл, үзлэг болон засварын нөхцөлд тохируулан хэрэглэнэ.",
      "introEn": "iBeX does not control production or operations; it supports asset inspection, risk and maintenance in each environment.",
      "footerMn": "Олон байгууллага, байршил болон Parent–Child хөрөнгийн бүтцийг дэмжинэ.",
      "footerEn": "iBeX supports multi-company, multi-location and Parent–Child asset structures.",
      "feature": {
        "eyebrowMn": "САЛБАРЫН ОРЧИН",
        "eyebrowEn": "INDUSTRY CONTEXT",
        "titleMn": "Хөрөнгийн засварын орчинд тохируулна.",
        "titleEn": "Adapted to asset maintenance environments.",
        "descriptionMn": "Хөрөнгө, эрсдэл, үзлэг ба засварын онцлогт нийцнэ.",
        "descriptionEn": "Aligned to assets, risk, inspection and maintenance.",
        "statMn": "8 ХЭРЭГЛЭЭНИЙ ОРЧИН",
        "statEn": "8 USE ENVIRONMENTS",
        "ctaMn": "Салбаруудыг бүрэн харах →",
        "ctaEn": "Explore industries →"
      },
      "groups": [
        {
          "id": "industry-0",
          "titleMn": "Уул уурхай",
          "titleEn": "Mining",
          "enabled": true,
          "items": [
            {
              "id": "industry-0-0",
              "titleMn": "Хүнд машин механизм",
              "titleEn": "Heavy Equipment",
              "descriptionMn": "Тоолуур, үзлэг, засвар ба сэлбэг",
              "descriptionEn": "Meters, inspection, maintenance and parts",
              "icon": "heavyEquipment",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "industry-0-1",
              "titleMn": "Баяжуулах үйлдвэр",
              "titleEn": "Processing Plant",
              "descriptionMn": "Тоноглолын төлөвлөгөөт ба нөхцөлт засвар",
              "descriptionEn": "Planned and condition-based equipment maintenance",
              "icon": "processing",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "industry-1",
          "titleMn": "Үйлдвэрлэл",
          "titleEn": "Manufacturing",
          "enabled": true,
          "items": [
            {
              "id": "industry-1-0",
              "titleMn": "Үйлдвэрийн шугам",
              "titleEn": "Production Lines",
              "descriptionMn": "Шугамын тоног төхөөрөмжийн засвар",
              "descriptionEn": "Maintenance of line equipment",
              "icon": "production",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "industry-1-1",
              "titleMn": "Тоног төхөөрөмжийн үзлэг ба доголдол",
              "titleEn": "Equipment Inspection & Defects",
              "descriptionMn": "Checklist, доголдол ба засварын арга хэмжээ",
              "descriptionEn": "Checklists, defects and maintenance actions",
              "icon": "equipmentCheck",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "industry-2",
          "titleMn": "Эрчим хүч ба дэд бүтэц",
          "titleEn": "Energy & Infrastructure",
          "enabled": true,
          "items": [
            {
              "id": "industry-2-0",
              "titleMn": "Эрчим хүчний хөрөнгө",
              "titleEn": "Energy Assets",
              "descriptionMn": "Шугам, станц, тоноглолын засвар",
              "descriptionEn": "Maintenance of networks, plants and equipment",
              "icon": "power",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "industry-2-1",
              "titleMn": "Тархмал дэд бүтэц",
              "titleEn": "Distributed Infrastructure",
              "descriptionMn": "Олон байршлын хөрөнгийн засвар",
              "descriptionEn": "Maintenance across multiple locations",
              "icon": "network",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "industry-3",
          "titleMn": "Тээвэр ба байгууламж",
          "titleEn": "Fleet & Facilities",
          "enabled": true,
          "items": [
            {
              "id": "industry-3-0",
              "titleMn": "Автопарк",
              "titleEn": "Vehicle Fleet",
              "descriptionMn": "Километр, тоолуур ба засварын хуваарь",
              "descriptionEn": "Mileage, meters and maintenance schedules",
              "icon": "fleet",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "industry-3-1",
              "titleMn": "Барилга ба инженерийн систем",
              "titleEn": "Buildings & Engineering Systems",
              "descriptionMn": "Үзлэг, төлөвлөгөөт болон нөхцөлт засвар",
              "descriptionEn": "Inspection, planned and condition-based maintenance",
              "icon": "facility",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        }
      ]
    },
    {
      "id": "ai",
      "labelMn": "AI хөгжүүлэлт",
      "labelEn": "AI Development",
      "enabled": true,
      "kickerMn": "AI ХӨГЖҮҮЛЭЛТ • ROADMAP",
      "kickerEn": "AI DEVELOPMENT • ROADMAP",
      "titleMn": "Өгөгдлөөс инженерийн хяналттай зөвлөмж рүү",
      "titleEn": "From data to engineer-controlled recommendations",
      "introMn": "Rule-based PdM-ээс Predictive болон Generative AI хүртэлх хөгжүүлэлтийн төлөвийг бодитоор ялган харуулна.",
      "introEn": "Clearly distinguish implemented rule-based PdM from Pilot, R&D and future AI capabilities.",
      "footerMn": "AI нь эрх бүхий инженерийн баталгаажуулалт, tenant тусгаарлалт болон тайлбарлах боломжид тулгуурлана.",
      "footerEn": "AI depends on tenant isolation, explainability and authorized engineering review.",
      "feature": {
        "eyebrowMn": "AI ROADMAP",
        "eyebrowEn": "AI ROADMAP",
        "titleMn": "Өгөгдлөөс инженерийн хяналттай зөвлөмж рүү.",
        "titleEn": "From data to engineer-controlled recommendations.",
        "descriptionMn": "Хэрэгжсэн, туршилт, R&D болон ирээдүйн төлөв.",
        "descriptionEn": "Implemented, Pilot, R&D and Future.",
        "statMn": "4 ХӨГЖҮҮЛЭЛТИЙН ТӨЛӨВ",
        "statEn": "4 DEVELOPMENT STATES",
        "ctaMn": "AI roadmap харах →",
        "ctaEn": "View AI roadmap →"
      },
      "groups": [
        {
          "id": "ai-0",
          "titleMn": "01 • Хэрэгжсэн",
          "titleEn": "01 • Implemented",
          "enabled": true,
          "items": [
            {
              "id": "ai-0-0",
              "titleMn": "Datahub интеграц",
              "titleEn": "Datahub Integration",
              "descriptionMn": "IoT, GPS, PLC, SCADA өгөгдлийг хөрөнгөтэй холбох",
              "descriptionEn": "Map IoT, GPS, PLC and SCADA data to assets",
              "icon": "integration",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "ai-0-1",
              "titleMn": "Rule-based PdM",
              "titleEn": "Rule-Based PdM",
              "descriptionMn": "With Count / Without Count дүрмийн автоматжуулалт",
              "descriptionEn": "With Count / Without Count automation",
              "icon": "rules",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "ai-1",
          "titleMn": "02 • Туршилт",
          "titleEn": "02 • Pilot",
          "enabled": true,
          "items": [
            {
              "id": "ai-1-0",
              "titleMn": "Үйлдвэрлэлийн өгөгдлийн пилот",
              "titleEn": "Industrial Data Pilots",
              "descriptionMn": "IoT gateway ба SmartGPS Violian",
              "descriptionEn": "IoT gateway and SmartGPS Violian",
              "icon": "pilot",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "ai-1-1",
              "titleMn": "Өгөгдөл–хөрөнгийн зураглал",
              "titleEn": "Data-to-Asset Mapping",
              "descriptionMn": "ID, нэгж, хугацаа ба холбоосыг баталгаажуулах",
              "descriptionEn": "Validate IDs, units, time and relationships",
              "icon": "mapping",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "ai-2",
          "titleMn": "03 • Судалгаа, хөгжүүлэлт",
          "titleEn": "03 • R&D",
          "enabled": true,
          "items": [
            {
              "id": "ai-2-0",
              "titleMn": "Доголдлын хэв шинж илрүүлэх",
              "titleEn": "Failure Pattern Detection",
              "descriptionMn": "Түүхэн ба техникийн өгөгдлийн судалгаа",
              "descriptionEn": "Research technical and historical data",
              "icon": "pattern",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "ai-2-1",
              "titleMn": "Засварын хугацаа ба Монгол аргачлал",
              "titleEn": "Timing & Mongolian Methods",
              "descriptionMn": "Инженерийн арга, томьёог хамгаалалттай хөгжүүлэх",
              "descriptionEn": "Develop protected engineering methods",
              "icon": "method",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "ai-3",
          "titleMn": "04 • Ирээдүйн төлөв",
          "titleEn": "04 • Future",
          "enabled": true,
          "items": [
            {
              "id": "ai-3-0",
              "titleMn": "Predictive AI ба хуваарийн оновчлол",
              "titleEn": "Predictive AI & Scheduling",
              "descriptionMn": "Эвдрэлийн магадлал, техникийн нөөц ба зөвлөмж",
              "descriptionEn": "Failure probability, technical reserve and recommendations",
              "icon": "predictive",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "ai-3-1",
              "titleMn": "Generative AI туслах",
              "titleEn": "Generative AI Assistant",
              "descriptionMn": "Гарын авлага, түүх ба инженерийн мэдлэгийн сан",
              "descriptionEn": "Manuals, history and engineering knowledge",
              "icon": "generative",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        }
      ]
    },
    {
      "id": "intro",
      "labelMn": "Танилцуулга",
      "labelEn": "Resources",
      "enabled": true,
      "kickerMn": "ТАНИЛЦУУЛГА • МЭДЛЭГИЙН ТӨВ",
      "kickerEn": "RESOURCES • KNOWLEDGE CENTER",
      "titleMn": "iBeX-ийг ойлгох бүх материал нэг дор",
      "titleEn": "Everything needed to understand iBeX",
      "introMn": "Хөрөнгөд суурилсан засвар үйлчилгээний зарчим, системийн процесс болон ашиглах зааврыг нэг дор судална.",
      "introEn": "Study asset-based maintenance principles, system processes and practical guidance in one place.",
      "footerMn": "Сонгосон материал энэ цонхондоо доош дэлгэрч, дараагийн сонголтод жагсаалтаас шууд шилжинэ.",
      "footerEn": "The selected resource expands below while the selection list remains accessible.",
      "feature": {
        "eyebrowMn": "МЭДЛЭГИЙН ТӨВ",
        "eyebrowEn": "KNOWLEDGE CENTER",
        "titleMn": "iBeX-ийг ойлгоход хэрэгтэй бүх зүйл.",
        "titleEn": "Everything needed to understand iBeX.",
        "descriptionMn": "Видео, flowchart, гарын авлага, мэдээ ба контент.",
        "descriptionEn": "Video, flowcharts, manuals, news and content.",
        "statMn": "4 ҮНДСЭН ХЭСЭГ",
        "statEn": "4 CORE SECTIONS",
        "ctaMn": "Бүх материалыг харах →",
        "ctaEn": "Explore all resources →"
      },
      "groups": [
        {
          "id": "intro-0",
          "titleMn": "Видео",
          "titleEn": "Video",
          "enabled": true,
          "items": [
            {
              "id": "intro-0-0",
              "titleMn": "iBeX хэрхэн ажилладаг вэ?",
              "titleEn": "How iBeX Works",
              "descriptionMn": "Хөрөнгө төвтэй үндсэн зарчим",
              "descriptionEn": "Asset-centered principles",
              "icon": "play",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-0-1",
              "titleMn": "Mobile хэрэглээ",
              "titleEn": "Mobile Use",
              "descriptionMn": "Талбайн засварын бүртгэл",
              "descriptionEn": "Field maintenance records",
              "icon": "mobile",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-0-2",
              "titleMn": "Шинэ боломж ба шинэчлэл",
              "titleEn": "Features & Updates",
              "descriptionMn": "Шинэ ажиллагааны богино танилцуулга",
              "descriptionEn": "Short feature introductions",
              "icon": "sparkles",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "intro-1",
          "titleMn": "Flowchart",
          "titleEn": "Flowcharts",
          "enabled": true,
          "items": [
            {
              "id": "intro-1-0",
              "titleMn": "Системийн ерөнхий Flowchart",
              "titleEn": "System Flowchart",
              "descriptionMn": "Asset Core-т төвлөрсөн нийт урсгал",
              "descriptionEn": "Asset Core-centered overview",
              "icon": "flow",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-1-1",
              "titleMn": "Засварын ажлын үндсэн урсгал",
              "titleEn": "Maintenance Work Flow",
              "descriptionMn": "Хүсэлтээс хаалт хүртэл",
              "descriptionEn": "Request through closeout",
              "icon": "route",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "intro-2",
          "titleMn": "Хэрэглэгчийн гарын авлага",
          "titleEn": "User Manual",
          "enabled": true,
          "items": [
            {
              "id": "intro-2-0",
              "titleMn": "Анхлан ашиглах",
              "titleEn": "Getting Started",
              "descriptionMn": "Нэвтрэлт, үндсэн цэс ба Asset Core",
              "descriptionEn": "Sign-in, navigation and Asset Core",
              "icon": "rocket",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-2-1",
              "titleMn": "Өгөгдөл бэлтгэх ба системд оруулах",
              "titleEn": "Prepare & Import Organization Data",
              "descriptionMn": "Байгууллагын өгөгдөл, загвар, импорт ба шалгалт",
              "descriptionEn": "Data, templates, import and validation",
              "icon": "dataImport",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        },
        {
          "id": "intro-3",
          "titleMn": "Мэдээ ба контент",
          "titleEn": "News & Content",
          "enabled": true,
          "items": [
            {
              "id": "intro-3-0",
              "titleMn": "Facebook пост ба Reel",
              "titleEn": "Facebook Posts & Reels",
              "descriptionMn": "iBeX Project Mongolia-ийн нийтлэл, богино видео",
              "descriptionEn": "Content from iBeX Project Mongolia",
              "icon": "social",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-3-1",
              "titleMn": "Олон нийтийн арга хэмжээ",
              "titleEn": "Public Events",
              "descriptionMn": "Хурал, форум, сургалт ба хамтын ажиллагаа",
              "descriptionEn": "Conferences, forums, training and collaboration",
              "icon": "event",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            },
            {
              "id": "intro-3-2",
              "titleMn": "Судалгаа ба хөгжүүлэлт",
              "titleEn": "Research & Development",
              "descriptionMn": "Судалгаа, пилот болон AI хөгжүүлэлт",
              "descriptionEn": "Research, pilots and AI development",
              "icon": "research",
              "href": "",
              "openInNewTab": false,
              "enabled": true
            }
          ]
        }
      ]
    }
  ]
};

const ICONS = new Set([
  "asset", "request", "inspection", "work", "mobile", "calendar", "condition", "schedule",
  "parts", "warehouse", "cost", "contract", "safety", "data", "report", "downtime",
  "calendarCheck", "fieldWork", "stock", "budget", "signed", "analytics", "heavyEquipment",
  "processing", "production", "equipmentCheck", "power", "network", "fleet", "facility",
  "integration", "rules", "pilot", "mapping", "pattern", "method", "predictive", "generative",
  "play", "sparkles", "route", "rocket", "dataImport", "social", "event", "research", "content",
]);

export const NAVIGATION_ICON_OPTIONS = [...ICONS];

function text(value: unknown, fallback: string, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function id(value: unknown, fallback: string) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return /^[a-z0-9][a-z0-9-]{0,79}$/i.test(candidate) ? candidate : fallback;
}

function safeHref(value: unknown) {
  const candidate = typeof value === "string" ? value.trim().slice(0, 500) : "";
  if (!candidate || candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? candidate : "";
  } catch {
    return "";
  }
}

function safeMediaHref(value: unknown) {
  const candidate = text(value, "", 800);
  if (/^\/api\/media\/[a-zA-Z0-9-]{1,100}$/.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? candidate : "";
  } catch {
    return "";
  }
}

export function cloneDefaultNavigation(): NavigationConfig {
  return JSON.parse(JSON.stringify(DEFAULT_NAVIGATION)) as NavigationConfig;
}

export function normalizeNavigation(value: unknown): NavigationConfig | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as NavigationConfig).menus)) return null;
  const incoming = (value as NavigationConfig).menus;
  const menus = NAVIGATION_MENU_IDS.map((menuId) => {
    const fallback = DEFAULT_NAVIGATION.menus.find((menu) => menu.id === menuId)!;
    const candidate = incoming.find((menu) => menu?.id === menuId);
    if (!candidate) return null;
    const groups = Array.isArray(candidate.groups)
      ? candidate.groups.slice(0, 8).map((group, groupIndex) => {
          const fallbackGroup = fallback.groups[groupIndex] || fallback.groups[0];
          const items = Array.isArray(group?.items)
            ? group.items.slice(0, 20).map((item, itemIndex) => {
                const fallbackItem = fallbackGroup?.items[itemIndex] || fallbackGroup?.items[0];
                const itemId = id(item?.id, `${menuId}-${groupIndex}-${itemIndex}`);
                return {
                  id: itemId,
                  titleMn: text(item?.titleMn, fallbackItem?.titleMn || "Шинэ мэдээлэл", 140),
                  titleEn: text(item?.titleEn, fallbackItem?.titleEn || "New item", 140),
                  descriptionMn: text(item?.descriptionMn, fallbackItem?.descriptionMn || "", 260),
                  descriptionEn: text(item?.descriptionEn, fallbackItem?.descriptionEn || "", 260),
                  icon: ICONS.has(item?.icon) ? item.icon : fallbackItem?.icon || "content",
                  href: safeHref(item?.href),
                  openInNewTab: item?.openInNewTab === true,
                  enabled: item?.enabled !== false,
                  media: (() => {
                    const mediaType = ["image", "video", "pdf"].includes(item?.media?.type) ? item.media.type as "image" | "video" | "pdf" : "none";
                    const mediaUrl = safeMediaHref(item?.media?.url);
                    return {
                      type: mediaType !== "none" && mediaUrl ? mediaType : "none",
                      url: mediaUrl,
                      altMn: text(item?.media?.altMn, "", 300),
                      altEn: text(item?.media?.altEn, "", 300),
                      captionMn: text(item?.media?.captionMn, "", 500),
                      captionEn: text(item?.media?.captionEn, "", 500),
                    };
                  })(),
                };
              })
            : [];
          return {
            id: id(group?.id, `${menuId}-${groupIndex}`),
            titleMn: text(group?.titleMn, fallbackGroup?.titleMn || "Шинэ бүлэг", 140),
            titleEn: text(group?.titleEn, fallbackGroup?.titleEn || "New group", 140),
            enabled: group?.enabled !== false,
            items,
          };
        })
      : [];
    if (!groups.length || groups.every((group) => !group.items.length)) return null;
    return {
      id: menuId,
      labelMn: text(candidate.labelMn, fallback.labelMn, 60),
      labelEn: text(candidate.labelEn, fallback.labelEn, 60),
      enabled: candidate.enabled !== false,
      kickerMn: text(candidate.kickerMn, fallback.kickerMn, 180),
      kickerEn: text(candidate.kickerEn, fallback.kickerEn, 180),
      titleMn: text(candidate.titleMn, fallback.titleMn, 180),
      titleEn: text(candidate.titleEn, fallback.titleEn, 180),
      introMn: text(candidate.introMn, fallback.introMn),
      introEn: text(candidate.introEn, fallback.introEn),
      footerMn: text(candidate.footerMn, fallback.footerMn),
      footerEn: text(candidate.footerEn, fallback.footerEn),
      feature: {
        eyebrowMn: text(candidate.feature?.eyebrowMn, fallback.feature.eyebrowMn, 140),
        eyebrowEn: text(candidate.feature?.eyebrowEn, fallback.feature.eyebrowEn, 140),
        titleMn: text(candidate.feature?.titleMn, fallback.feature.titleMn, 180),
        titleEn: text(candidate.feature?.titleEn, fallback.feature.titleEn, 180),
        descriptionMn: text(candidate.feature?.descriptionMn, fallback.feature.descriptionMn, 360),
        descriptionEn: text(candidate.feature?.descriptionEn, fallback.feature.descriptionEn, 360),
        statMn: text(candidate.feature?.statMn, fallback.feature.statMn, 100),
        statEn: text(candidate.feature?.statEn, fallback.feature.statEn, 100),
        ctaMn: text(candidate.feature?.ctaMn, fallback.feature.ctaMn, 100),
        ctaEn: text(candidate.feature?.ctaEn, fallback.feature.ctaEn, 100),
      },
      groups,
    };
  });
  return menus.some((menu) => !menu) ? null : { menus: menus as NavigationMenu[] };
}
