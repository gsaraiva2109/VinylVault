import { BaseHubImage } from "basehub/next-image";
import Link from "next/link";
import { Heading } from "../../common/heading";
import { ChangelogList } from "./_components/changelog-list";
import { changelogListFragment } from "./_components/changelog-fragment";
import { PageView } from "../../components/page-view";
import type { Metadata } from "next";
import { basehub } from "basehub";
import { notFound } from "next/navigation";
import "../../basehub.config";

export const dynamic = "force-static";
export const revalidate = 30;

export const generateMetadata = async (): Promise<Metadata | undefined> => {
  const data = await basehub().query({
    site: {
      changelog: {
        metadata: {
          title: true,
          description: true,
        },
      },
    },
  });

  return {
    title: data.site.changelog.metadata.title ?? undefined,
    description: data.site.changelog.metadata.description ?? undefined,
  };
};

export default async function ChangelogPage() {
  const {
    site: { changelog, generalEvents },
  } = await basehub().query({
    site: {
      changelog: {
        _analyticsKey: true,
        title: true,
        subtitle: true,
        posts: {
          __args: {
            orderBy: "publishedAt__DESC",
          },
          items: changelogListFragment,
        },
        socialLinksTitle: true,
        socialLinks: { icon: { url: true }, url: true, _title: true, _id: true },
      },
      generalEvents: {
        ingestKey: true,
      },
    },
  });

  const socialLinks = changelog.socialLinks;
  if (changelog.posts.items.length === 0) {
    return notFound();
  }

  return (
    <>
      <PageView ingestKey={generalEvents.ingestKey} />
      <div className="flex items-center justify-between border-b border-[--border] dark:border-[--dark-border]">
        <div className="mx-auto flex w-full max-w-screen-md flex-col items-start justify-between gap-4 border-r border-[--border] px-8 py-24 dark:border-[--dark-border] md:flex-row md:items-center">
          <Heading align="left" className="flex-1 !flex-col-reverse" subtitle={changelog.subtitle}>
            <h1>{changelog.title}</h1>
          </Heading>
          <div className="flex items-center gap-2 md:flex-col">
            <p className="text-sm text-[--text-tertiary] dark:text-[--dark-text-tertiary]">
              {changelog.socialLinksTitle}
            </p>
            <div className="flex gap-2">
              {socialLinks.map((link) => (
                <Link
                  key={link._id}
                  className="aspect-square hover:brightness-90"
                  href={link.url}
                  target="_blank"
                >
                  <BaseHubImage
                    priority
                    alt={link._title}
                    height={18}
                    src={link.icon?.url ?? ""}
                    width={18}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="!mx-auto !max-w-screen-md px-8 pt-16">
        <ChangelogList changelogPosts={changelog.posts.items} />
      </div>
    </>
  );
}
