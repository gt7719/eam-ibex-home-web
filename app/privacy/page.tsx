"use client";

import Link from "next/link";
import { useSiteLanguage } from "../lib/use-site-language";

export default function PrivacyPage() {
  const { t } = useSiteLanguage();
  return <main className="policy-page"><article>
    <Link href="/register">← {t("Бүртгэл рүү буцах", "Back to registration")}</Link>
    <span>iBeX WEBSITE ACCOUNT • 2026-09-v2</span>
    <h1>{t("Нууцлалын бодлого", "Privacy policy")}</h1>
    <p>{t("iBeX веб бүртгэл нь хэрэглэгчийн нэр, и-мэйл, гар утас, хэлний сонголт, зөвшөөрлийн түүх, баталгаажуулалт болон аюулгүй байдлын төлөвийг боловсруулна.", "The iBeX website account processes the user's name, email, mobile number, language preference, consent history, verification and security status.")}</p>
    <h2>{t("Ашиглах зорилго", "Purposes")}</h2>
    <p>{t("Мэдээллийг хэрэглэгчийг таних, и-мэйл баталгаажуулах, нууц үг сэргээх, аюулгүй байдлыг хамгаалах, хэрэглэгчийн зөвшөөрсөн мэдээллийг хүргэхэд ашиглана.", "Information is used to identify users, verify email, recover passwords, protect security and deliver information the user has consented to receive.")}</p>
    <h2>iBeX Home AI</h2>
    <p>{t("Home AI нь зөвхөн хэрэглэгчийн туслах бөгөөд маркетингийн систем биш. Нэвтэрсэн хэрэглэгчийн асуулт, хариултыг яриаг refresh болон өөр төхөөрөмжөөс үргэлжлүүлэх зорилгоор iBeX-ийн D1 санд тухайн хэрэглэгчийн бүртгэлтэй тусгаарлан, админы тогтоосон хадгалалтын хугацаанд хадгална. Хэрэглэгч «Түүх цэвэрлэх» үйлдлээр яриагаа хүссэн үедээ устгана. Хариулт боловсруулахдаа одоогийн асуулт болон хамгийн ихдээ сүүлийн 6 мессежийг OpenAI API-д store: false тохиргоотой илгээнэ. Бодлогын хувилбар шинэчлэгдэхэд Home AI шинэ асуулт хүлээн авахаас өмнө хэрэглэгчээс нэг удаагийн зөвшөөрөл авна. Home AI нь Marketing AI болон байгууллагын үндсэн өгөгдөлд хандахгүй.", "Home AI is a user assistant, not a marketing system. Signed-in users' questions and answers are stored in iBeX D1 under their account for the administrator-configured retention period so a conversation can continue after refresh or on another device. Users can delete their conversation at any time with Clear history. The current question and up to six recent messages are sent to the OpenAI API with store: false to prepare a response. When the policy version changes, Home AI asks for one-time consent before accepting a new question. Home AI cannot access Marketing AI or core organizational data.")}</p>
    <h2>{t("Нууц үг ба баталгаажуулах код", "Passwords and verification codes")}</h2>
    <p>{t("Нууц үгийг буцаан унших боломжгүй хамгаалалттай hash хэлбэрээр хадгална. Баталгаажуулах болон сэргээх холбоос нэг удаагийн, хугацаатай бөгөөд эх утгаар хадгалагдахгүй.", "Passwords are stored as non-reversible secure hashes. Verification and recovery links are single-use and time-limited, and their original values are not stored.")}</p>
    <h2>{t("Утас ба SMS", "Phone and SMS")}</h2>
    <p>{t("Гар утсыг олон улсын E.164 хэлбэрээр хадгална. Эхний хувилбарт SMS баталгаажуулалт илгээхгүй. Үйлчилгээний SMS болон маркетингийн SMS зөвшөөрлийг тусад нь удирдана.", "Mobile numbers are stored in international E.164 format. The first version does not send SMS verification. Service and marketing SMS consents are managed separately.")}</p>
    <h2>{t("Маркетингийн зөвшөөрөл", "Marketing consent")}</h2>
    <p>{t("iBeX Marketing AI нь зөвхөн админ удирдлагад байрлах тусдаа систем. Home AI нь кампанит ажил, имэйл, SMS эсвэл сошиал нийтлэл үүсгэх, хуваарилах, илгээх эрхгүй. Хэрэглэгч зөвшөөрлөө цуцлах боломжтой.", "iBeX Marketing AI is a separate, administrator-only system. Home AI cannot create, schedule or send campaigns, email, SMS or social posts. Users may withdraw consent.")}</p>
    <h2>{t("Хадгалалт ба хүсэлт", "Retention and requests")}</h2>
    <p>{t("Бүртгэл устгах хүсэлт гармагц Home AI-ийн ярианы түүх шууд цэвэрлэгдэнэ. Бусад бүртгэлийн өгөгдөл 30 хоногийн хүлээлгийн дараа устгагдана. Мэдээлэлтэй холбоотой хүсэлтийг privacy@ibex.mn эсвэл admin@ibex.mn хаягаар гаргана.", "Home AI conversation history is deleted immediately when an account deletion request is submitted. Other account data is deleted after the 30-day waiting period. Data requests may be sent to privacy@ibex.mn or admin@ibex.mn.")}</p>
    <p className="policy-note">{t("Нийтэд нээхийн өмнө энэхүү баримт бичгийг эрх зүйн хяналтаар баталгаажуулна.", "This document must complete legal review before public launch.")}</p>
  </article></main>;
}
