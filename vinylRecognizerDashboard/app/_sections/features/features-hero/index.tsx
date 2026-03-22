import { BaseHubImage } from "basehub/next-image";
import { basehub, fragmentOn } from "basehub";
import { Heading } from "../../../../common/heading";
import { Section } from "../../../../common/section-wrapper";
import { darkLightImageFragment, headingFragment } from "../../../../lib/basehub/fragments";
import clsx from "clsx";
import { DarkLightImage } from "../../../../common/dark-light-image";
import { TrackedButtonLink } from "../../../../components/tracked-button";
import s from "./hero.module.css";
import { GeneralEvents } from "../../../../lib/basehub/fragments";

export const featureHeroFragment = fragmentOn("FeatureHeroComponent", {
  _analyticsKey: true,
  heroLayout: true,
  heading: headingFragment,
  image: darkLightImageFragment,
  actions: {
    _id: true,
    href: true,
    label: true,
    type: true,
  },
});

type FeatureHero = fragmentOn.infer<typeof featureHeroFragment>;

export default function FeatureHero({
  heading,
  heroLayout,
  image,
  actions,
  eventsKey,
}: FeatureHero & { eventsKey: GeneralEvents["ingestKey"] }) {
  switch (heroLayout) {
    case "Image bottom": {
      return (
        <Section>
          <div className="flex flex-col gap-6">
            <Heading {...heading}>
              <h4>{heading.title}</h4>
            </Heading>
            <div className="flex justify-center gap-3">
              {actions?.map((action) => (
                <TrackedButtonLink
                  key={action._id}
                  analyticsKey={eventsKey}
                  href={action.href}
                  intent={action.type}
                  name="cta_click"
                  size="lg"
                >
                  {action.label}
                </TrackedButtonLink>
              ))}
            </div>
          </div>
          <DarkLightImage
            priority
            className="block rounded-lg border border-[--border] dark:border-[--dark-border]"
            {...image}
          />
        </Section>
      );
    }
    case "Image Right": {
      return (
        <Section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col gap-6 lg:pr-16">
              <Heading {...heading} align="left">
                <h4>{heading.title}</h4>
              </Heading>
              <div className="flex justify-start gap-3">
                {actions?.map((action) => (
                  <TrackedButtonLink
                    key={action._id}
                    analyticsKey={eventsKey}
                    href={action.href}
                    intent={action.type}
                    name="cta_click"
                    size="lg"
                  >
                    {action.label}
                  </TrackedButtonLink>
                ))}
              </div>
            </div>
            <DarkLightImage
              priority
              className="block flex-1 rounded-lg border border-[--border] dark:border-[--dark-border] lg:w-1/2"
              {...image}
            />
          </div>
        </Section>
      );
    }
    case "full image": {
      return (
        <>
          <DarkLightImage
            {...image}
            priority
            className="block max-h-[720px] w-full border-y border-t-0 border-[--border] object-cover dark:border-[--dark-border]"
          />
          <Section>
            <div className="flex items-center justify-between self-stretch">
              <Heading {...heading} align="left">
                <h4>{heading.title}</h4>
              </Heading>
              {actions && actions.length > 0 ? (
                <div className="flex gap-3">
                  {actions.map((action) => (
                    <TrackedButtonLink
                      key={action._id}
                      analyticsKey={eventsKey}
                      href={action.href}
                      intent={action.type}
                      name="cta_click"
                      size="lg"
                    >
                      {action.label}
                    </TrackedButtonLink>
                  ))}
                </div>
              ) : null}
            </div>
          </Section>
        </>
      );
    }
    case "gradient": {
      return (
        <Section>
          <div className="z-10 flex flex-col items-center gap-8">
            <LogoLite />
            <Heading {...heading}>
              <h4>{heading.title}</h4>
            </Heading>
            <div className="flex gap-3">
              {actions
                ? actions.map((action) => (
                    <TrackedButtonLink
                      key={action._id}
                      analyticsKey={eventsKey}
                      href={action.href}
                      intent={action.type}
                      name="cta_click"
                      size="lg"
                    >
                      {action.label}
                    </TrackedButtonLink>
                  ))
                : null}
            </div>
          </div>
          {/* Gradient */}
          <div
            className={clsx(
              "absolute -top-1/2 left-1/2 z-0 h-[400px] w-[60vw] -translate-x-1/2 scale-150 rounded-[50%]",
              s.gradient,
            )}
          />
        </Section>
      );
    }
    default: {
      return null;
    }
  }
}

async function LogoLite() {
  const {
    site: {
      settings: { logoLite },
    },
  } = await basehub().query({
    site: {
      settings: {
        logoLite: {
          url: true,
          width: true,
          height: true,
          alt: true,
        },
      },
    },
  });

  return (
    <BaseHubImage
      priority
      alt={logoLite.alt ?? "Logo"}
      className="size-20"
      height={logoLite.height}
      src={logoLite.url}
      width={logoLite.width}
    />
  );
}
