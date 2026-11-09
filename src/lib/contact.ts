import i18n from "../i18n";

// Mirrors the app's Support/content/contact.ts so both clients send the same messages.

/** The shop's mailbox: the API sends from it and delivers Contact us messages to it. */
export const SUPPORT_EMAIL = "homemadecreator.shop@gmail.com";
export const SUPPORT_SUBJECT = "HomeMade Creator Support";

/** Topic ids; their labels are contact.topics.<id>. */
export const SUPPORT_TOPICS = ["order", "design", "account", "technical", "other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

/** The API's limits for POST /contact, checked here first so customers see them early. */
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, messageMin: 10, message: 5000, orderNumber: 40 } as const;

export interface ContactDraft {
  name: string;
  email: string;
  subject: string;
  message: string;
  orderNumber: string;
}

export type ContactField = keyof ContactDraft;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rule as the API's DTO.
const ORDER_NUMBER = /^#?[A-Za-z0-9-]+$/;

/** The first problem with the form (and which field it is in), or null when it can be sent. */
export function validateContact(draft: ContactDraft): { field: ContactField; message: string } | null {
  const t = i18n.t.bind(i18n);
  const name = draft.name.trim();
  const email = draft.email.trim();
  const subject = draft.subject.trim();
  const message = draft.message.trim();
  const orderNumber = draft.orderNumber.trim();

  if (!name) return { field: "name", message: t("contact.nameRequired") };
  if (name.length > CONTACT_LIMITS.name) return { field: "name", message: t("contact.nameTooLong", { max: CONTACT_LIMITS.name }) };
  if (!email) return { field: "email", message: t("contact.emailRequired") };
  if (email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) return { field: "email", message: t("contact.emailInvalid") };
  if (!subject) return { field: "subject", message: t("contact.subjectRequired") };
  if (subject.length > CONTACT_LIMITS.subject) return { field: "subject", message: t("contact.subjectTooLong", { max: CONTACT_LIMITS.subject }) };
  if (orderNumber && (orderNumber.length > CONTACT_LIMITS.orderNumber || !ORDER_NUMBER.test(orderNumber)))
    return { field: "orderNumber", message: t("contact.orderNumberInvalid") };
  if (!message) return { field: "message", message: t("contact.messageRequired") };
  if (message.length < CONTACT_LIMITS.messageMin) return { field: "message", message: t("contact.messageTooShort", { min: CONTACT_LIMITS.messageMin }) };
  if (message.length > CONTACT_LIMITS.message) return { field: "message", message: t("contact.messageTooLong", { max: CONTACT_LIMITS.message }) };
  return null;
}

/** mailto: link with the subject (and the topic's label, in the page language) filled in. */
export function supportMailUrl(topic?: string | null) {
  const subject = topic ? `${SUPPORT_SUBJECT}: ${topic}` : SUPPORT_SUBJECT;
  const body = topic ? `Topic: ${topic}\n\n` : "";
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` + (body ? `&body=${encodeURIComponent(body)}` : "");
}
