import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

function Home() {
  const [textValue, setTextValue] = useState("")
  const [paraphrasedText, setParaphrasedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
  }
  
  const handleClick = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/paraphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: textValue })
      })
      
      const data = await response.json()
      console.log('Response:', data)
      
      // Set paraphrased text (adjust based on your API response structure)
      setParaphrasedText(data.paraphrased || data.message || data.result)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-6xl gap-4 p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Original Text</label>
            <Textarea 
              className='min-h-96' 
              placeholder="Type your message here." 
              value={textValue} 
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Paraphrased Text</label>
            <Textarea 
              className='min-h-96' 
              placeholder="Paraphrased text will appear here..." 
              value={paraphrasedText}
              readOnly
            />
          </div>
        </div>
        <Button 
          className="h-12 text-lg w-full" 
          onClick={handleClick}
          disabled={isLoading || !textValue.trim()}
        >
          {isLoading ? "Paraphrasing..." : "Paraphrase"}
        </Button>
      </div>
    </div>
  )
}

export default Home