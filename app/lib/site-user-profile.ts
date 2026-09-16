export type ProfileCompletenessInput = {
  fullName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  locale?: string | null;
  organizationName?: string | null;
  hasProfileImage?: boolean;
};

export function profileCompleteness(input: ProfileCompletenessInput) {
  const fields = [
    { key: "fullName", complete: Boolean(input.fullName?.trim()), weight: 20 },
    {
      key: "profileImage",
      complete: Boolean(input.hasProfileImage),
      weight: 10,
    },
    {
      key: "organization",
      complete: Boolean(input.organizationName?.trim()),
      weight: 25,
    },
    { key: "email", complete: Boolean(input.email?.trim()), weight: 20 },
    { key: "phone", complete: Boolean(input.phoneE164?.trim()), weight: 20 },
    {
      key: "locale",
      complete: input.locale === "mn" || input.locale === "en",
      weight: 5,
    },
  ];
  const percentage = fields.reduce(
    (total, field) => total + (field.complete ? field.weight : 0),
    0,
  );
  return {
    percentage,
    missing: fields
      .filter((field) => !field.complete)
      .map((field) => field.key),
  };
}

export function profileImageUrl(userId: string) {
  return `/api/account/profile-image/${encodeURIComponent(userId)}`;
}
