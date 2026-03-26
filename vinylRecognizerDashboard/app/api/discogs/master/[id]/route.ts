import { NextResponse } from "next/server"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    
    // Server-side fetch to bypass CORS and hit the official public Discogs API
    const res = await fetch(`https://api.discogs.com/masters/${id}`, {
      headers: { "User-Agent": "VinylRecognizerDashboard/1.0" }
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: "Discogs master release not found" }, { status: res.status })
    }
    
    const data = await res.json()
    
    // Map the raw Discogs Master JSON into the exact format expected by our frontend
    const mapped = {
      // VITAL: Masters are abstract. We use the 'main_release' ID so the DB stores a valid Release ID
      id: String(data.main_release || id),
      title: data.title,
      // Strip Discogs disambiguation numbers (e.g. "Miles Davis (2)" -> "Miles Davis")
      artist: data.artists?.[0]?.name?.replace(/\s\(\d+\)$/, "") || "Unknown Artist",
      year: data.year || new Date().getFullYear(),
      genre: data.styles?.[0] || data.genres?.[0] || "Unknown",
      coverImage: data.images?.[0]?.resource_url || data.images?.[0]?.uri || null,
      lowestPrice: null
    }
    
    return NextResponse.json(mapped)
  } catch (err) {
    console.error("Master proxy error:", err)
    return NextResponse.json({ error: "Internal server error connecting to Discogs" }, { status: 500 })
  }
}
