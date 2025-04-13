import * as React from "react"
import { 
  Search, 
  File, 
  Folder, 
  MoreHorizontal, 
  Calendar, 
  Users,
  Star, 
  StarOff,
  Download,
  Share2,
  Edit,
  Trash2,
  Clock,
  FolderOpen
} from "lucide-react"

import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card"
import { cn } from "../lib/utils"

// Map item type definition
export type MapItem = {
  id: number
  title: string
  description: string
  isPublic?: boolean
  isFavorite?: boolean
  createdAt: string
  lastEdited: string
  nodes: any[] | number
  edges?: any[]
  author?: string
  tags?: string[]
  thumbnail?: string
  svgContent?: string
  shareId?: string
  shareUrl?: string
  inputText?: string
}

// Props for the FileSystem component
interface FileSystemProps {
  items: MapItem[]
  showAuthor?: boolean
  showActions?: boolean
  emptyMessage?: string
  onSearch?: (query: string) => void
  onFavorite?: (id: number) => void
  onDelete?: (id: number) => void
  onEdit?: (id: number) => void
  onShare?: (id: number) => void
  onDownload?: (id: number) => void
  className?: string
  searchBarInHeader?: boolean
}

export function FileSystem({
  items,
  showAuthor = false,
  showActions = true,
  emptyMessage = "No items found",
  onSearch,
  onFavorite,
  onDelete,
  onEdit,
  onShare,
  onDownload,
  className,
  searchBarInHeader = false
}: FileSystemProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  
  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items
    return items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (showAuthor && item.author?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [items, searchQuery, showAuthor])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (onSearch) {
      onSearch(e.target.value)
    }
  }

  const searchElement = (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search maps..."
        className="pl-9 h-9 w-[240px]"
        value={searchQuery}
        onChange={handleSearch}
      />
    </div>
  );

  return (
    <div className={cn("flex flex-col w-full h-full", className)}>
      {/* View mode toggle without search bar */}
      <div className="flex justify-end px-6 py-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          className="h-8 w-8"
        >
          {viewMode === "grid" ? (
            <div className="flex flex-col gap-1">
              <div className="w-3.5 h-0.5 bg-current"></div>
              <div className="w-3.5 h-0.5 bg-current"></div>
              <div className="w-3.5 h-0.5 bg-current"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <div className="w-1.5 h-1.5 bg-current"></div>
              <div className="w-1.5 h-1.5 bg-current"></div>
              <div className="w-1.5 h-1.5 bg-current"></div>
              <div className="w-1.5 h-1.5 bg-current"></div>
            </div>
          )}
        </Button>
      </div>

      {/* File system content */}
      <div className="flex-1 p-6 pt-0 overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4" />
            <p>{emptyMessage}</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="hover:shadow-md transition-shadow duration-200 cursor-pointer" 
                onClick={() => onEdit && onEdit(item.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="truncate">{item.title}</CardTitle>
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onShare && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onShare(item.id);
                              }}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              <span>Share</span>
                            </DropdownMenuItem>
                          )}
                          {onDownload && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownload(item.id);
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                          )}
                          {onFavorite && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onFavorite(item.id);
                              }}
                            >
                              {item.isFavorite ? (
                                <>
                                  <StarOff className="mr-2 h-4 w-4" />
                                  <span>Remove from favorites</span>
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  <span>Add to favorites</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(item.id);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <File className="h-3.5 w-3.5" />
                      <span>{item.nodes} nodes</span>
                    </div>
                    {showAuthor && item.author && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{item.author}</span>
                      </div>
                    )}
                    {item.isFavorite && (
                      <div className="ml-auto">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Last edited {item.lastEdited}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="flex items-center py-3 hover:bg-muted/50 px-2 rounded-md transition-colors cursor-pointer"
                onClick={() => onEdit && onEdit(item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <File className="h-5 w-5 mr-3 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-muted-foreground mr-4">
                  <div className="hidden md:flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last edited {item.lastEdited}</span>
                  </div>
                  
                  {showAuthor && item.author && (
                    <div className="hidden md:flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{item.author}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <File className="h-3.5 w-3.5" />
                    <span>{item.nodes} nodes</span>
                  </div>

                  {item.isFavorite && (
                    <Star className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                
                {showActions && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {onShare && (
                          <DropdownMenuItem onClick={() => onShare(item.id)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Share</span>
                          </DropdownMenuItem>
                        )}
                        {onDownload && (
                          <DropdownMenuItem onClick={() => onDownload(item.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                        )}
                        {onFavorite && (
                          <DropdownMenuItem onClick={() => onFavorite(item.id)}>
                            {item.isFavorite ? (
                              <>
                                <StarOff className="mr-2 h-4 w-4" />
                                <span>Remove from favorites</span>
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-4 w-4" />
                                <span>Add to favorites</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Export the search element for direct use in headers
export function FileSearchBar({
  searchQuery = "",
  onSearch
}: {
  searchQuery?: string,
  onSearch?: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="relative flex-1 max-w-2xl">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search maps..."
        className="pl-9 h-9 w-full"
        value={searchQuery}
        onChange={onSearch}
      />
    </div>
  );
}