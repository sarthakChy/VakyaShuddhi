import { Sparkles, CheckCircle} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface SidebarProps {
  activeTool?:string
}

export function Sidebar({activeTool = "paraphrase"}:SidebarProps) {
  const tools = [
    { name: "Paraphraser", icon: Sparkles, href: "/paraphrase", id: "paraphrase" },
    { name: "Grammar Checker", icon: CheckCircle, href: "/grammar", id: "grammar" },
  ]

  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary cursor-pointer" onClick={()=> navigate("/")}/>
            <span className="font-bold cursor-pointer" onClick={()=> navigate("/")}>BharatWrite</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">TOOLS</p>
            {tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  tool.id==activeTool
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <tool.icon className="h-5 w-5" />
                <span className="text-sm">{tool.name}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" size="sm">
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </>
  )
}