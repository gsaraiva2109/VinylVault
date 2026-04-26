import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Define the structure for each stat to be displayed
export interface Stat {
  label: string
  value: string | number
}

// Define the props for the VinylCard component
export interface VinylCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string
  imageAlt?: string
  title: string
  artist: string
  year?: number | string
  stats: Stat[]
  actionLabel: string
  onActionClick?: () => void
  rank?: number
}

const VinylCard = React.forwardRef<HTMLDivElement, VinylCardProps>(
  (
    {
      className,
      imageUrl,
      imageAlt,
      title,
      artist,
      stats,
      actionLabel,
      onActionClick,
      rank = 1,
      ...props
    },
    ref
  ) => {
    // Generate distinct, vibrant colors for the sci-fi look
    const colors = [
      "border-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.15)]", // Green
      "border-[#60a5fa] shadow-[0_0_20px_rgba(96,165,250,0.15)]", // Blue
      "border-[#facc15] shadow-[0_0_20px_rgba(250,204,21,0.15)]", // Yellow
      "border-[#f87171] shadow-[0_0_20px_rgba(248,113,113,0.15)]", // Red
      "border-[#a78bfa] shadow-[0_0_20px_rgba(167,139,250,0.15)]", // Purple
    ]

    const textColors = [
      "text-[#4ade80]",
      "text-[#60a5fa]",
      "text-[#facc15]",
      "text-[#f87171]",
      "text-[#a78bfa]",
    ]

    const bgColors = [
      "bg-[#4ade80]",
      "bg-[#60a5fa]",
      "bg-[#facc15]",
      "bg-[#f87171]",
      "bg-[#a78bfa]",
    ]

    const colorClass = colors[(rank - 1) % colors.length]
    const textColor = textColors[(rank - 1) % textColors.length]
    const bgColor = bgColors[(rank - 1) % bgColors.length]

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-64 lg:w-72 flex-col overflow-hidden rounded-xl border-2 bg-black/90 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]",
          colorClass,
          className
        )}
        {...props}
      >
        {/* Sci-fi Header */}
        <div className={cn("flex items-center gap-3 border-b-2 p-4", colorClass)}>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2", colorClass)}>
            <span className={cn("font-mono text-sm font-bold shrink-0", textColor)}>
              {rank}
            </span>
          </div>
          <span className={cn("font-mono text-xs font-bold uppercase tracking-widest", textColor)}>
            Match {rank}
          </span>
        </div>

        {/* Property Image */}
        <div className={cn("aspect-square w-full overflow-hidden border-b-2 bg-black/40", colorClass)}>
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageAlt || title}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/60">
              <span className="text-4xl">🎵</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex-1">
            <h3 className="line-clamp-2 text-xl font-black tracking-tight text-white uppercase">{title}</h3>
            <p className="mt-1 text-sm font-medium text-white/70 uppercase tracking-widest">
              {artist}
            </p>
          </div>

          {/* Stats Section */}
          <div className="my-5 grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className={cn("rounded-lg border bg-black/40 p-3 text-center", colorClass)}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{stat.label}</p>
                <p className={cn("mt-0.5 text-lg font-black", textColor)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button 
            onClick={onActionClick} 
            className={cn("w-full font-bold uppercase tracking-widest transition-opacity hover:opacity-80 text-black", bgColor)}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    )
  }
)
VinylCard.displayName = "VinylCard"

export { VinylCard }
