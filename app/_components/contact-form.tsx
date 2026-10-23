"use client";

import type { FormEvent } from "react";
import { contact } from "@/lib/content";
import { ArrowIcon } from "./ui";

const fields = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email address", type: "email", autoComplete: "email" },
  { name: "subject", label: "Subject", type: "text", autoComplete: "off" },
] as const;

const inputClass =
  "mt-2 block w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-lg text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-flare-deep";

// No backend yet: hand the message to the visitor's mail app, addressed to the office.
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const get = (key: string) => String(data.get(key) ?? "").trim();
  const body = `${get("message")}\n\n-- \n${get("name")}\n${get("email")}`;
  window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(get("subject"))}&body=${encodeURIComponent(body)}`;
}

export function ContactForm() {
  return (
    <form onSubmit={handleSubmit} className="grid gap-8 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.name} className={field.name === "subject" ? "sm:col-span-2" : undefined}>
          <span className="label-mono text-ink/60">{field.label}</span>
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            className={inputClass}
          />
        </label>
      ))}
      <label className="sm:col-span-2">
        <span className="label-mono text-ink/60">Message</span>
        <textarea name="message" rows={5} required className={`${inputClass} resize-none`} />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/50">Opens your email app with the message ready to send.</p>
        <button
          type="submit"
          className="press group inline-flex h-13 items-center justify-center gap-3 rounded-full bg-ink pl-7 pr-6 text-sm font-medium text-white hover:bg-flare-deep"
        >
          Send message
          <ArrowIcon className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
        </button>
      </div>
    </form>
  );
}
