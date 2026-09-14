# Version 55 — iBeX Home Customer & Marketing AI foundation

- Version 54-ийн нийтэд нээлттэй assistant-ийг `iBeX Home AI` болгон өргөтгөв.
- `iBeX Hybrid Intelligent AI` болон үйлдвэрлэлийн System AI-аас тусгаарласан `customer_ai_*` өгөгдлийн namespace нэмэв.
- OpenAI Responses API, `store: false`, structured output, privacy-preserving safety identifier болон model router нэмэв.
- Зөвхөн `approved + public + enabled` мэдлэг ашигладаг бөгөөд эх сурвалжгүй үед таамаглахгүй fallback ажиллана.
- Хэрэглэгчийн зөвшөөрөл, нууц мэдээлэл/prompt injection guard, minute/day rate limit, сарын төсөв болон хэрэглэгчийн тоонд суурилсан dynamic fair-share хамгаалалт нэмэв.
- Түүхий чат хадгалахгүй privacy-safe audit, aggregate token/cost tracking нэмэв.
- Демо, үнийн санал, тусламжийн зорилгыг хүний handoff болгон санал болгоно.
- Имэйл, сошиал, кампанит ажил болон бусад гадагш нөлөөлөх үйлдэл энэ release-д хаалттай; админы баталгаажуулалтын дараагийн шатанд нээгдэнэ.
