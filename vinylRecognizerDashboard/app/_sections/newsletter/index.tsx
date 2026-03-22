import NextForm from "next/form";
import * as React from "react";
import { Section } from "../../../common/section-wrapper";
import { Input } from "../../../common/input";
import { parseFormData, sendEvent } from "basehub/events";
import { fragmentOn } from "basehub";

export const newsletterFragment = fragmentOn("Newsletter", {
  title: true,
  description: true,
  submissions: {
    ingestKey: true,
    schema: true,
  },
});

export type NewsletterFragment = fragmentOn.infer<typeof newsletterFragment>;

export function Newsletter({ newsletter }: { newsletter: NewsletterFragment }) {
  const emailInput = newsletter.submissions.schema.find((field) => field.type === "email");

  return (
    <Section
      className="bg-[--surface-secondary] !py-10 dark:bg-[--dark-surface-secondary]"
      container="full"
    >
      <div className="container mx-auto flex flex-col gap-4 px-6 lg:flex-row lg:justify-between">
        <div className="flex flex-1 flex-col items-start gap-1">
          <h5 className="text-xl font-medium lg:text-2xl">{newsletter.title}</h5>
          <p className="text text-[--text-tertiary] dark:text-[--dark-text-tertiary] lg:text-lg">
            {newsletter.description}
          </p>
        </div>

        <NextForm
          action={async (data) => {
            "use server";
            const parsedData = parseFormData(
              newsletter.submissions.ingestKey,
              newsletter.submissions.schema,
              data,
            );
            if (!parsedData.success) {
              throw new Error(JSON.stringify(parsedData.errors));
            }
            await sendEvent(newsletter.submissions.ingestKey, parsedData.data);
          }}
        >
          <Input {...emailInput} />
        </NextForm>
      </div>
    </Section>
  );
}
