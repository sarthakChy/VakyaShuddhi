import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/ui/sidebar"
import { useState } from "react"
import { Menu, User, Check, X, AlertCircle} from "lucide-react"
import { Link } from "react-router-dom";

interface GrammarError {
  id: number
  type: string
  message: string
  original: string
  suggestion: string
  context: string
}

function GrammarChecker() {
  const [textValue, setTextValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState("hindi")
  const [errors, setErrors] = useState<GrammarError[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
  }
  
  const handleCheckGrammar = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/grammar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: textValue,
          language: language 
        })
      })
      
      const data = await response.json()
      console.log('Response:', data)
      
      // Set errors from API response
      setErrors(data.errors || [])
    } catch (error) {
      console.error('Error checking grammar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = (errorId: number) => {
    const error = errors.find(e => e.id === errorId)
    if (error) {
      const newText = textValue.replace(error.original, error.suggestion)
      setTextValue(newText)
      setErrors(errors.filter(e => e.id !== errorId))
    }
  }

  const handleIgnore = (errorId: number) => {
    setErrors(errors.filter(e => e.id !== errorId))
  }

  const handleAcceptAll = () => {
    let newText = textValue
    errors.forEach(error => {
      newText = newText.replace(error.original, error.suggestion)
    })
    setTextValue(newText)
    setErrors([])
  }

  // Mock stats - replace with real data from API
  const stats = {
    grammar: errors.length > 0 ? Math.max(50, 100 - errors.length * 10) : 100,
    fluency: 85,
    clarity: 78,
    engagement: 92
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
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="lg:hidden"></span>
              <span className="text-lg font-medium ml-12 lg:ml-0">Grammar Checker</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                Upgrade to Premium
              </Button>
              <Button variant="ghost" size="sm">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative">
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-6xl mb-6">🚧</div>
              <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Grammar Checker for Indian languages is under development. We're working hard to bring you this feature!
              </p>
              <Button asChild>
                <Link to="/paraphrase">Try Paraphraser Instead</Link>
              </Button>
            </div>
          </div>

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
                    {errors.length > 0 ? `${errors.length} suggestions` : 'All'}
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
                            {error.context.split(error.original)[0]}
                            <span className="bg-red-200 dark:bg-red-900 px-1 rounded">
                              {error.original}
                            </span>
                            {error.context.split(error.original)[1]}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Suggestion:</div>
                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm">
                            {error.context.split(error.original)[0]}
                            <span className="bg-green-200 dark:bg-green-900 px-1 rounded font-medium">
                              {error.suggestion}
                            </span>
                            {error.context.split(error.original)[1]}
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