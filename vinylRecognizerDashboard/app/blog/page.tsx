import { Heading } from "../../common/heading";
import { Section } from "../../common/section-wrapper";
import { SearchContent as Search } from "../../common/search";
import { SearchHitsProvider } from "../../context/search-hits-context";
import { type AvatarFragment, avatarFragment } from "../../lib/basehub/fragments";

import { BlogpostCard, blogpostCardFragment } from "./_components/blogpost-card";
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
      blog: {
        metadata: {
          title: true,
          description: true,
        },
      },
    },
  });

  return {
    title: data.site.blog.metadata.title ?? undefined,
    description: data.site.blog.metadata.description ?? undefined,
  };
};

export default async function BlogPage() {
  const {
    _componentInstances: { blogPost },
    site: { blog, generalEvents },
    collections: { authors },
  } = await basehub().query({
    _componentInstances: {
      blogPost: {
        _searchKey: true,
      },
    },
    collections: {
      authors: {
        items: {
          _id: true,
          image: avatarFragment,
        },
      },
    },
    site: {
      generalEvents: { ingestKey: true },
      blog: {
        _analyticsKey: true,
        mainTitle: true,
        featuredPosts: blogpostCardFragment,
        listTitle: true,
        posts: {
          __args: { orderBy: "publishedAt__DESC" },
          items: blogpostCardFragment,
        },
      },
    },
  });

  const { posts } = blog;

  if (posts.items.length === 0) {
    notFound();
  }

  return (
    <Section className="gap-16">
      <PageView ingestKey={generalEvents.ingestKey} />
      <div className="grid grid-cols-1 gap-5 self-stretch md:grid-cols-2">
        <Heading align="left">
          <h2>{blog.mainTitle}</h2>
        </Heading>
        <SearchHitsProvider
          authorsAvatars={authors.items.reduce((acc: Record<string, AvatarFragment>, author) => {
            acc[author._id] = author.image;

            return acc;
          }, {})}
        >
          <Search _searchKey={blogPost._searchKey} />
        </SearchHitsProvider>
        {blog.featuredPosts?.slice(0, 3).map((post) => (
          <BlogpostCard key={post._id} type="card" {...post} />
        ))}
      </div>
      <div className="w-full space-y-3">
        <Heading align="left">
          <h3 className="!text-xl lg:!text-2xl">{blog.listTitle}</h3>
        </Heading>
        <div className="-mx-4 flex flex-col self-stretch">
          {posts.items.map((post) => (
            <BlogpostCard key={post._id} {...post} className="-mx-4" />
          ))}
        </div>
      </div>
    </Section>
  );
}
