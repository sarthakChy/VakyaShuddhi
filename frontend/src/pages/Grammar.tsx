import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/ui/sidebar"
import { useState } from "react"
import { Menu, Check, X, AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/ui/navbar"
import api from "@/api/axios"

// मै घर जा रहा हूं और मै खाना खाऊंगा

interface GrammarError {
  id: number
  type: string
  message: string
  original: string
  suggestion: string
  context: string | null
}

interface GrammarResponse {
  errors: GrammarError[]
  stats: {
    grammar: number
    fluency: number
    clarity: number
    engagement: number
    total_words: number
    total_errors: number
  }
}

function GrammarChecker() {
  const [textValue, setTextValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState("hindi")
  const [errors, setErrors] = useState<GrammarError[]>([])
  const [stats, setStats] = useState({
    grammar: 0,
    fluency: 0,
    clarity: 0,
    engagement: 0,
    total_words: 0,
    total_errors: 0
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
  }
  
  const handleCheckGrammar = async () => {
    setIsLoading(true)
    try {
      const response = await api.post("/grammar_check", {
        message: textValue,
        language: language 
      })

      const data: GrammarResponse = response.data
      console.log('Response:', data)

      setErrors(data.errors || [])
      setStats(data.stats)
    } catch (error: any) {
      console.error('Error checking grammar:', error)
      
      // Handle different error types
      if (error.response?.status === 403) {
        alert('Monthly limit reached. Upgrade to premium for unlimited access.')
      } else if (error.response?.status === 401) {
        alert('Session expired. Please log in again.')
      } else {
        alert('Failed to check grammar. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = (errorId: number) => {
    const error = errors.find(e => e.id === errorId)
    if (error) {
      // Replace only the first occurrence to avoid replacing all instances
      const index = textValue.indexOf(error.original)
      if (index !== -1) {
        const newText = textValue.substring(0, index) + 
                       error.suggestion + 
                       textValue.substring(index + error.original.length)
        setTextValue(newText)
      }
      setErrors(errors.filter(e => e.id !== errorId))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total_errors: prev.total_errors - 1,
        grammar: Math.min(100, prev.grammar + 5)
      }))
    }
  }

  const handleIgnore = (errorId: number) => {
    setErrors(errors.filter(e => e.id !== errorId))
  }

  const handleAcceptAll = () => {
    let newText = textValue
    
    // Sort errors by position (descending) to avoid index shifts
    const sortedErrors = [...errors].sort((a, b) => {
      const posA = textValue.indexOf(a.original)
      const posB = textValue.indexOf(b.original)
      return posB - posA
    })
    
    sortedErrors.forEach(error => {
      const index = newText.indexOf(error.original)
      if (index !== -1) {
        newText = newText.substring(0, index) + 
                 error.suggestion + 
                 newText.substring(index + error.original.length)
      }
    })
    
    setTextValue(newText)
    setErrors([])
    
    // Update stats to perfect scores
    setStats(prev => ({
      ...prev,
      grammar: 100,
      fluency: 100,
      clarity: 100,
      total_errors: 0
    }))
  }

  const renderContextWithHighlight = (context: string | null, original: string, suggestion: string, isOriginal: boolean) => {
    if (!context) {
      return (
        <span className={isOriginal ? "bg-red-200 dark:bg-red-900 px-1 rounded" : "bg-green-200 dark:bg-green-900 px-1 rounded font-medium"}>
          {isOriginal ? original : suggestion}
        </span>
      )
    }

    const parts = context.split(original)
    if (parts.length < 2) {
      return context
    }

    return (
      <>
        {parts[0]}
        <span className={isOriginal ? "bg-red-200 dark:bg-red-900 px-1 rounded" : "bg-green-200 dark:bg-green-900 px-1 rounded font-medium"}>
          {isOriginal ? original : suggestion}
        </span>
        {parts[1]}
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-background h-screen sticky top-0">
        <Sidebar activeTool="grammar" />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar activeTool="grammar" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Navbar title="Grammar Checker"/>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative">
          <div className="h-full flex flex-col lg:flex-row">
            {/* Left Side - Text Editor */}
            <div className="flex-1 flex flex-col border-r">
              {/* Toolbar */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                        <SelectItem value="tamil">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="telugu">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="bengali">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="assamese">অসমীয়া (Assamese)</SelectItem>
                        <SelectItem value="gujarati">ગુજરાતી (Gujarati)</SelectItem>
                        <SelectItem value="kannada">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="malayalam">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="marathi">मराठी (Marathi)</SelectItem>
                        <SelectItem value="punjabi">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                        <SelectItem value="oriya">ଓଡ଼ିଆ (Oriya)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleCheckGrammar} 
                      disabled={isLoading || !textValue.trim()}
                      size="sm"
                    >
                      {isLoading ? "Checking..." : "Check Grammar"}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {textValue.split(/\s+/).filter(w => w).length} words
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 p-6">
                <Textarea 
                  className="min-h-full border-0 focus-visible:ring-0 text-base resize-none" 
                  placeholder="Type or paste your text here to check grammar..."
                  value={textValue} 
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Right Side - Suggestions Panel */}
            <div className="w-full lg:w-96 flex flex-col bg-muted/10">
              {/* Stats Section */}
              <div className="border-b p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${stats.grammar >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.grammar}
                    </div>
                    <div className="text-xs text-muted-foreground">Grammar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.fluency}</div>
                    <div className="text-xs text-muted-foreground">Fluency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.clarity}</div>
                    <div className="text-xs text-muted-foreground">Clarity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.engagement}</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                </div>
              </div>

              {/* Suggestions Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {errors.length > 0 ? `${errors.length} suggestion${errors.length > 1 ? 's' : ''}` : 'All clear'}
                  </span>
                  {errors.length > 0 && (
                    <Badge variant="destructive">{errors.length}</Badge>
                  )}
                </div>
                {errors.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleAcceptAll}>
                    Accept all
                  </Button>
                )}
              </div>

              {/* Suggestions List */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {errors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="font-semibold mb-2">No grammar issues found!</p>
                    <p className="text-sm">Your text looks great.</p>
                  </div>
                ) : (
                  errors.map((error) => (
                    <Card key={error.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <CardTitle className="text-sm font-medium">{error.type}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{error.message}</p>
                        
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Original:</div>
                          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                            {renderContextWithHighlight(error.context, error.original, error.suggestion, true)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Suggestion:</div>
                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm">
                            {renderContextWithHighlight(error.context, error.original, error.suggestion, false)}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleAccept(error.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleIgnore(error.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Ignore
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GrammarChecker