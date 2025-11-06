import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Menu, User, Sparkles, CheckCircle, Search, 
  Trash2, Copy, Eye, Download, Filter
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { formatDistanceToNow, isValid } from 'date-fns'
import api from "@/api/axios"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BaseActivity {
  id: string
  original: string
  language: string
  createdAt: string
}

interface ParaphraseActivity extends BaseActivity {
  type: 'paraphrase'
  paraphrased: string
}

interface GrammarActivity extends BaseActivity {
  type: 'grammar'
  errors: any[]
}

type HistoryItem = ParaphraseActivity | GrammarActivity

function History() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "paraphrase" | "grammar">("all")
  const [filterLanguage, setFilterLanguage] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    filterResults()
  }, [searchQuery, filterType, filterLanguage, history])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const [paraphrasesRes, grammarRes] = await Promise.all([
        api.get("/history/paraphrases"),
        api.get("/history/grammar")
      ])

      const paraphrases = paraphrasesRes.data
      const grammar = grammarRes.data

      const combined = [...paraphrases, ...grammar]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setHistory(combined)
      setFilteredHistory(combined)
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterResults = () => {
    let filtered = history

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(item => item.type === filterType)
    }

    // Filter by language
    if (filterLanguage !== "all") {
      filtered = filtered.filter(item => item.language === filterLanguage)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type === 'paraphrase' && 
         item.paraphrased.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredHistory(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const item = history.find(h => h.id === id)
      if (!item) return

      const endpoint = item.type === 'paraphrase' 
        ? `/history/paraphrases/${id}` 
        : `/history/grammar/${id}`
      
      await api.delete(endpoint)
      setHistory(history.filter(h => h.id !== id))
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const handleView = (item: HistoryItem) => {
    setSelectedItem(item)
    setViewDialogOpen(true)
  }

  const handleExport = () => {
    const data = filteredHistory.map(item => ({
      type: item.type,
      language: item.language,
      original: item.original,
      result: item.type === 'paraphrase' ? item.paraphrased : `${item.errors.length} errors found`,
      date: item.createdAt
    }))

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bharatwrite-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueLanguages = Array.from(new Set(history.map(item => item.language)))

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-background h-screen sticky top-0">
        <Sidebar activeTool="history" />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar activeTool="history" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="lg:hidden"></span>
              <span className="text-lg font-medium ml-12 lg:ml-0">History</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => navigate('/upgrade')}>
                Upgrade to Premium
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{history.length}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {history.filter(h => h.type === 'paraphrase').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Paraphrases</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {history.filter(h => h.type === 'grammar').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Grammar Checks</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExport}
                    disabled={filteredHistory.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Type Filter */}
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="paraphrase">Paraphrases</SelectItem>
                      <SelectItem value="grammar">Grammar Checks</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Language Filter */}
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {uniqueLanguages.map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredHistory.length} of {history.length} items
                </div>
              </CardContent>
            </Card>

            {/* History List */}
            {loading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : filteredHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">No history found</h3>
                  <p className="text-muted-foreground mb-6">
                    {history.length === 0 
                      ? "Start using BharatWrite to see your history here"
                      : "No items match your search criteria"}
                  </p>
                  <Button className="cursor-pointer" onClick={() => navigate('/paraphrase')}>
                    Start Writing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'paraphrase'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-green-500/10 text-green-600'
                        }`}>
                          {item.type === 'paraphrase' ? (
                            <Sparkles className="h-6 w-6" />
                          ) : (
                            <CheckCircle className="h-6 w-6" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {item.type === 'paraphrase' ? 'Paraphrase' : 'Grammar Check'}
                            </Badge>
                            <Badge variant="secondary">
                              {item.language}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {item.createdAt && isValid(new Date(item.createdAt))
                                ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                                : 'Recently'}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.original}
                          </p>

                          {item.type === 'paraphrase' && (
                            <p className="text-sm font-medium line-clamp-2 mb-3">
                              {item.paraphrased}
                            </p>
                          )}

                          {item.type === 'grammar' && (
                            <p className="text-sm font-medium mb-3">
                              {item.errors.length} grammar {item.errors.length === 1 ? 'issue' : 'issues'} found
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(item)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(
                                item.type === 'paraphrase' ? item.paraphrased : item.original
                              )}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.type === 'paraphrase' ? (
                <Sparkles className="h-5 w-5 text-blue-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {selectedItem?.type === 'paraphrase' ? 'Paraphrase' : 'Grammar Check'} Details
            </DialogTitle>
            <DialogDescription>
              <Badge variant="outline" className="mt-2">
                {selectedItem?.language}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Original Text</h4>
                <div className="p-4 bg-muted rounded-lg text-sm">
                  {selectedItem.original}
                </div>
              </div>

              {selectedItem.type === 'paraphrase' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Paraphrased Text</h4>
                  <div className="p-4 bg-primary/5 rounded-lg text-sm">
                    {selectedItem.paraphrased}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleCopy(selectedItem.paraphrased)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Paraphrased Text
                  </Button>
                </div>
              )}

              {selectedItem.type === 'grammar' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Grammar Issues</h4>
                  <div className="space-y-2">
                    {selectedItem.errors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No grammar issues found!</p>
                    ) : (
                      selectedItem.errors.map((error, idx) => (
                        <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <p className="text-sm font-medium">{error.type}</p>
                          <p className="text-xs text-muted-foreground">{error.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                Created {selectedItem.createdAt && isValid(new Date(selectedItem.createdAt))
                  ? formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })
                  : 'recently'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default History