import { request } from "./client";

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  orderNumber?: string;
}

/** Rate-limited by the server; its 429 message is shown as it is. */
export const sendContact = (input: ContactInput) =>
  request<{ success?: boolean; message?: string }>("/contact", {
    method: "POST",
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      ...(input.orderNumber?.trim() ? { orderNumber: input.orderNumber.trim() } : {}),
    },
  });
