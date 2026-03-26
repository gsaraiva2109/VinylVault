import { NextResponse } from "next/server"

/**
 * GET /api/spotify/search?q=Artist - Album
 * Searches for a Spotify album bit using public client credentials.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ 
      error: "Spotify credentials missing in .env.local",
      tip: "Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment variables."
    }, { status: 500 })
  }

  try {
    // 1. Get Access Token (Client Credentials Flow)
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!tokenRes.ok) {
      throw new Error("Failed to authenticate with Spotify")
    }

    const { access_token } = await tokenRes.json()

    // 2. Search for the Album
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!searchRes.ok) {
      throw new Error("Spotify search failed")
    }

    const data = await searchRes.json()
    const album = data.albums?.items?.[0]

    if (!album) {
      return NextResponse.json({ error: "No matching Spotify album found" }, { status: 404 })
    }

    return NextResponse.json({
      albumId: album.id,
      albumUrl: album.external_urls?.spotify,
      previewUrl: album.images?.[0]?.url,
    })
  } catch (err) {
    console.error("Spotify Search Proxy Error:", err)
    return NextResponse.json({ error: "Internal server error connecting to Spotify" }, { status: 500 })
  }
}
