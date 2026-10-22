import { contact, contactSection } from "@/lib/content";
import { ContactForm } from "./contact-form";
import { ArrowIcon, Flag, SectionLabel } from "./ui";

export function Contact() {
  return (
    <section id="contact" className="relative bg-paper text-ink">
      <div className="shell grid gap-16 py-28 lg:grid-cols-12 lg:py-40">
        <div className="lg:col-span-5">
          <SectionLabel index="06" className="text-ink/60">
            Contact
          </SectionLabel>
          <h2
            data-reveal
            className="mt-6 text-[clamp(2.25rem,4.4vw,4.25rem)] font-medium leading-[1] tracking-[-0.035em]"
          >
            {contactSection.title}
          </h2>
          <p data-reveal className="mt-6 max-w-md text-lg leading-relaxed text-ink/65">
            {contactSection.intro}
          </p>

          <a
            data-reveal
            href={`mailto:${contact.email}`}
            className="group mt-12 inline-flex items-center gap-3 border-b border-ink/20 pb-2 text-lg font-medium tracking-tight transition-colors hover:border-flare-deep sm:text-2xl"
          >
            {contact.email}
            <ArrowIcon className="h-5 w-5 -rotate-45 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>

          <dl data-reveal className="mt-12 grid gap-6 border-t border-ink/15 pt-6 sm:grid-cols-2">
            <div>
              <dt className="label-mono text-ink/50">Location</dt>
              <dd className="mt-2 flex items-center gap-2.5 font-medium">
                <Flag code="at" className="h-3.5" />
                {contact.location}
              </dd>
            </div>
            <div>
              <dt className="label-mono text-ink/50">Web</dt>
              <dd className="mt-2 font-medium">
                <a href={contact.webUrl} className="hover:text-flare-deep">
                  {contact.web}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div data-reveal className="lg:col-span-6 lg:col-start-7 lg:pt-14">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
