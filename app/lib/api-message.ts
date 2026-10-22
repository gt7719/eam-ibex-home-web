// Customer-visible responses never fall back to untranslated server diagnostics.
const english: Record<string, string> = {
  "Нэвтрэх шаардлагатай.": "Please sign in to continue.",
  "И-мэйл болон нууц үгээ оруулна уу.": "Enter your email and password.",
  "Нэвтрэх мэдээлэл буруу байна.": "The email or password is incorrect.",
  "Эхлээд и-мэйлээ баталгаажуулна уу.": "Please verify your email first.",
  "Бүртгэл түр түгжигдсэн байна.": "Your account is temporarily locked.",
  "Бүртгэл идэвхгүй байна. support@ibex.mn хаягтай холбогдоно уу.": "Your account is inactive. Please contact support@ibex.mn.",
  "Олон буруу оролдлого илэрлээ. 15 минутын дараа дахин оролдоно уу.": "Too many unsuccessful attempts. Please try again in 15 minutes.",
  "Олон хүсэлт илэрлээ. Түр хүлээгээд дахин оролдоно уу.": "Too many requests. Please try again shortly.",
  "Олон хүсэлт илэрлээ. 60 минутын дараа дахин оролдоно уу.": "Too many requests. Please try again in 60 minutes.",
  "Нэрээ бүрэн оруулна уу.": "Enter your full name.",
  "Зөв и-мэйл хаяг оруулна уу.": "Enter a valid email address.",
  "Нууц үг 8–128 тэмдэгт байна.": "Use a password with 8–128 characters.",
  "Нууц үг дор хаяж нэг том үсэг агуулна.": "Include at least one uppercase letter.",
  "Нууц үг дор хаяж нэг тоо агуулна.": "Include at least one number.",
  "Нууц үг дор хаяж нэг тусгай тэмдэгт агуулна.": "Include at least one special character.",
  "Нууц үгийн давталт тохирохгүй байна.": "The passwords do not match.",
  "Улсаа сонгоно уу.": "Choose your country.",
  "Улсын код сонгосон улстай тохирохгүй байна.": "The calling code does not match the selected country.",
  "Утасны дугаарыг улсын кодтой зөв оруулна уу.": "Enter a valid phone number with its calling code.",
  "Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө үү.": "Please accept the terms of service and privacy policy.",
  "Аюулгүй байдлын шалгалт амжилтгүй боллоо.": "The security check could not be completed. Please try again.",
  "Бүртгэлийн хамгаалалт сервер дээр тохируулагдаагүй байна.": "Registration is temporarily unavailable. Please try again later.",
  "Нууц үг сэргээх хамгаалалт сервер дээр тохируулагдаагүй байна.": "Password recovery is temporarily unavailable. Please try again later.",
  "Бүртгэлийн маягтыг дахин нээгээд оролдоно уу.": "Please reload the registration form and try again.",
  "Бүртгэлийг хадгалж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.": "We couldn't save your account. Check your details and try again.",
  "Бүртгэл үүслээ. И-мэйл болон SMS кодоор бүртгэлээ баталгаажуулна уу.": "Your account was created. Verify your email and phone to continue.",
  "Бүртгэл үүслээ. И-мэйлээр ирсэн холбоосоор баталгаажуулна уу.": "Your account was created. Please use the verification link in your email.",
  "Бүртгэл үүслээ. SMS кодоор утасны дугаараа баталгаажуулна уу.": "Your account was created. Please verify your phone using the SMS code.",
  "Бүртгэл амжилттай үүслээ.": "Your account was created successfully.",
  "И-мэйл бүртгэлтэй бол нууц үг сэргээх заавар илгээнэ.": "If this email is registered, password reset instructions will be sent.",
  "Сэргээх холбоос буруу байна.": "This password reset link is invalid.",
  "Сэргээх холбоос хүчингүй болсон байна.": "This password reset link has already been used or is no longer valid.",
  "Сэргээх холбоосын хугацаа дууссан байна.": "This password reset link has expired. Please request a new link.",
  "Багц сонгохын өмнө шаардлагатай баталгаажуулалтаа дуусгана уу.": "Complete the required verification before choosing a plan.",
  "Байгууллагын нэрийг оруулна уу.": "Enter your organization's name.",
  "Багц болон хугацаагаа сонгоно уу.": "Choose a plan and duration.",
  "Сонгосон багц олдсонгүй.": "The selected plan could not be found.",
  "Сонгосон хугацаа энэ багцын админ хязгаарт тохирохгүй байна.": "Choose one of the available durations for this plan.",
  "Багцын мэдээллийг уншиж чадсангүй.": "We couldn't load your plan. Please try again.",
  "6 оронтой SMS код оруулна уу.": "Enter the six-digit SMS code.",
  "SMS код буруу байна.": "The SMS code is incorrect.",
  "SMS кодын хугацаа дууссан байна.": "The SMS code has expired. Request a new code.",
  "Өнөөдрийн SMS илгээх хязгаарт хүрсэн байна.": "Today's SMS limit has been reached. Please try again tomorrow.",
  "Дахин SMS илгээхийн өмнө 60 секунд хүлээнэ үү.": "Wait 60 seconds before requesting another SMS.",
  "Идэвхтэй SMS код олдсонгүй. Шинэ код илгээнэ үү.": "No active SMS code was found. Please request a new code.",
  "Олон буруу код оруулсан тул шинэ SMS код авна уу.": "Too many incorrect attempts. Please request a new SMS code.",
  "SMS код илгээгдлээ.": "The SMS code has been sent.",
  "SMS илгээх тохиргоо бэлэн биш байна.": "SMS delivery is temporarily unavailable. Please try again later.",
  "Утасны дугаар баталгаажлаа.": "Your phone number has been verified.",
  "Зураг сонгоно уу.": "Choose an image.",
  "JPEG, PNG эсвэл WebP зураг 2MB-аас бага байна.": "Choose a JPEG, PNG or WebP image smaller than 2 MB.",
  "Зургийн бодит формат тохирохгүй байна.": "The image format is invalid. Please choose another image.",
};

export function apiMessage(value: unknown, lang: "mn" | "en" = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "mn") {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/SQL|constraint|database|server secret|stack trace/i.test(value)) return lang === "en" ? "We couldn't complete this request. Please try again later." : "Хүсэлтийг боловсруулах боломжгүй байна. Түр хүлээгээд дахин оролдоно уу.";
  if (lang === "en") {
    if (english[value]) return english[value];
    const sentences = value.match(/[^.!?]+[.!?]*/g)?.map(part => part.trim()).filter(Boolean) || [];
    if (sentences.length > 1 && sentences.every(part => english[part])) return sentences.map(part => english[part]).join(" ");
    // Bilingual administrative responses may already include an English part.
    const bilingual = value.split(" / ");
    if (bilingual.length > 1 && !/[А-Яа-яӨөҮү]/.test(bilingual.at(-1)!)) return bilingual.at(-1)!;
    if (/[А-Яа-яӨөҮү]/.test(value)) return "We couldn't complete this request. Please check your details and try again.";
    return value;
  }
  if (value === "Origin mismatch" || value === "Invalid request") return "Хүсэлтийг боловсруулах боломжгүй байна. Хуудсыг дахин ачаална уу.";
  return value;
}
