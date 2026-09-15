# Version 59 — Home AI and Marketing AI operational controls

- `AI удирдлага` дотор `Home AI удирдлага` табыг нэмж, одоогийн `Home AI мэдлэгийн сан`-г хэвээр үлдээв.
- Home AI-ийн Disabled/Test/Production горим, model routing, сарын app төсөв, анхааруулга, хэрэглэгчийн minute/day limit болон dynamic fair-share тохиргоог D1-д удирддаг болгов.
- Home AI usage, тооцоолсон token зардал, Approved + Public эх сурвалж, privacy болон агуулгагүй audit төлөвийг админд харуулав.
- Home AI, Marketing AI, iBeX Intelligent AI-г `OPENAI_HOME_API_KEY`, `OPENAI_MARKETING_API_KEY`, `OPENAI_INTELLIGENT_API_KEY` гэсэн тусдаа server-side secret-ээр хатуу тусгаарлав.
- Marketing AI-ийн `Интеграц ба тохиргоо` хэсэгт OpenAI төлөв, Disabled/Test/Production Draft горим, model, төсөв, rate limit, OAuth төлөв болон идэвхжүүлэх шалгуурыг бодитоор холбов.
- Marketing AI командын төвийг OpenAI Responses API-аар зөвхөн Draft бэлтгэдэг болгов; email/social/төсөв зарцуулах гадагш үйлдэл хаалттай, хүний баталгаажуулалт заавал хэвээр.
- Marketing AI-д Home AI болон System AI-аас тусдаа rate-limit, monthly usage, privacy-safe audit D1 namespace нэмэв.
- Аль аль нь `store: false`; API key-ийн утгыг browser, source, audit болон админ дэлгэцэд харуулахгүй.
