export type CallingCodeOption = readonly [iso: string, callingCode: string, nameMn: string, nameEn: string];

export const callingCodeOptions: readonly CallingCodeOption[] = [
  ["MN", "+976", "Монгол", "Mongolia"], ["CN", "+86", "Хятад", "China"], ["RU", "+7", "Орос", "Russia"],
  ["KR", "+82", "БНСУ", "South Korea"], ["JP", "+81", "Япон", "Japan"], ["US", "+1", "АНУ", "United States"],
  ["CA", "+1", "Канад", "Canada"], ["AU", "+61", "Австрали", "Australia"], ["NZ", "+64", "Шинэ Зеланд", "New Zealand"],
  ["GB", "+44", "Их Британи", "United Kingdom"], ["DE", "+49", "Герман", "Germany"], ["FR", "+33", "Франц", "France"],
  ["IT", "+39", "Итали", "Italy"], ["ES", "+34", "Испани", "Spain"], ["SG", "+65", "Сингапур", "Singapore"],
  ["AE", "+971", "АНЭУ", "United Arab Emirates"], ["KZ", "+7", "Казахстан", "Kazakhstan"], ["KG", "+996", "Кыргызстан", "Kyrgyzstan"],
  ["TR", "+90", "Турк", "Türkiye"], ["IN", "+91", "Энэтхэг", "India"], ["VN", "+84", "Вьетнам", "Vietnam"],
  ["TH", "+66", "Тайланд", "Thailand"], ["MY", "+60", "Малайз", "Malaysia"], ["ID", "+62", "Индонез", "Indonesia"],
  ["PH", "+63", "Филиппин", "Philippines"], ["HK", "+852", "Хонконг", "Hong Kong"], ["TW", "+886", "Тайвань", "Taiwan"],
  ["QA", "+974", "Катар", "Qatar"], ["SA", "+966", "Саудын Араб", "Saudi Arabia"], ["CH", "+41", "Швейцар", "Switzerland"],
  ["SE", "+46", "Швед", "Sweden"], ["NO", "+47", "Норвеги", "Norway"], ["FI", "+358", "Финланд", "Finland"],
  ["DK", "+45", "Дани", "Denmark"], ["NL", "+31", "Нидерланд", "Netherlands"], ["BE", "+32", "Бельги", "Belgium"],
  ["AT", "+43", "Австри", "Austria"], ["PL", "+48", "Польш", "Poland"], ["CZ", "+420", "Чех", "Czechia"],
  ["UA", "+380", "Украин", "Ukraine"], ["BR", "+55", "Бразил", "Brazil"], ["MX", "+52", "Мексик", "Mexico"],
] as const;

export const callingCodeByIso = new Map(callingCodeOptions.map(([iso, callingCode]) => [iso, callingCode]));

export function callingCodeForIso(iso: string) {
  return callingCodeByIso.get(iso.toUpperCase()) || "";
}
