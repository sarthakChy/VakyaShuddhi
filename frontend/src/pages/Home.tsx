import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

function Home() {
  const [textValue, setTextValue] = useState("")
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
      
      // Clear textarea after successful send
      setTextValue("")
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="grid w-full max-w-2xl gap-4 p-4">
        <Textarea 
          className='min-h-64' 
          placeholder="Type your message here." 
          value={textValue} 
          onChange={handleChange}
        />
        <Button 
          className="h-12 text-lg" 
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