/** Reads email/password from the submitted auth form (handles browser autofill on controlled inputs). */
export function readEmailPasswordFromAuthForm(form: HTMLFormElement): {
  email: string;
  password: string;
} {
  const formData = new FormData(form);
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}
