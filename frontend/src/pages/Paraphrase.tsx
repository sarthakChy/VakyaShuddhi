import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { ArrowRight, Menu} from "lucide-react"
import { Sidebar } from "@/components/ui/sidebar"
import { Navbar } from "@/components/ui/navbar"
import api from "@/api/axios"

function Paraphrase() {
  const [textValue, setTextValue] = useState("")
  const [paraphrasedText, setParaphrasedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState("hindi")

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log(e.target.value)
    const words  = e.target.value.split(" ")
    if (words.length <= 150) {

      setTextValue(e.target.value)
    }
  }
  
  const handleClick = async () => {
    setIsLoading(true)

    try {
      const response = await  api.post("/paraphrase",{
        message:textValue,
        language:language
      })  
      
      const data = response.data
      console.log('Response:', data)
      
      const paraphrased = data.paraphrased

      setParaphrasedText(paraphrased)      

    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-background h-screen sticky top-0">
        <Sidebar activeTool="paraphrase" />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Navbar title="Paraphraser"/>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Top Section: Language Selector and Info */}
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              {/* Left side - Language Selector */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Language / भाषा चुनें</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full lg:w-64">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                      <SelectItem value="tamil">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="telugu">తెలుగు (Telugu)</SelectItem>
                      <SelectItem value="bengali">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="gujarati">ગુજરાતી (Gujarati)</SelectItem>
                      <SelectItem value="kannada">ಕನ್ನಡ (Kannada)</SelectItem>
                      <SelectItem value="malayalam">മലയാളം (Malayalam)</SelectItem>
                      <SelectItem value="marathi">मराठी (Marathi)</SelectItem>
                      <SelectItem value="punjabi">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                      <SelectItem value="oriya">ଓଡ଼ିଆ (Oriya)</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              {/* Right side - Info Section */}
              <div className="flex-1 bg-muted/30 rounded-lg">
                <h3 className="font-semibold text-base mb-2">How to use the Paraphraser</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Select your preferred Indian language from the dropdown</li>
                  <li>• Type or paste your text in the Original Text box (up to 250 characters)</li>
                  <li>• Click the "Paraphrase" button to transform your text</li>
                  <li>• Review and use the paraphrased text as needed</li>
                </ul>
              </div>
            </div>

            {/* Text Areas - Side by Side */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Original Text */}
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Original Text</label>
                <Textarea 
                  className='min-h-96' 
                  placeholder="Type your message here..." 
                  value={textValue} 
                  onChange={handleChange}
                />
                <div className="text-xs text-muted-foreground text-right">
                    {textValue.trim() ? textValue.trim().split(/\s+/).length : 0} / 150 words
                </div>
              </div>
              
              {/* Paraphrased Text */}
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Paraphrased Text</label>
                {isLoading ? (
                  <div className="min-h-96 border rounded-md p-4 space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                    <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                    <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  </div>
                ) : (
                  <Textarea 
                    className='min-h-96' 
                    placeholder="Paraphrased text will appear here..." 
                    value={paraphrasedText}
                    readOnly
                  />
                )}
                <div className="text-xs text-muted-foreground text-right">
                    {paraphrasedText.trim() ? paraphrasedText.trim().split(/\s+/).length : 0} words
                </div>
              </div>
            </div>

            {/* Paraphrase Button */}
            <div className="mt-6">
              <Button 
                className="h-12 text-lg w-full" 
                onClick={handleClick}
                disabled={isLoading || !textValue.trim()}
              >
                {isLoading ? "Paraphrasing..." : (
                  <>
                    Paraphrase <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Paraphrase