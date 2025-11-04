import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { 
  Menu, User, Sparkles, FileText, CheckCircle, 
  TrendingUp, Clock, Award, ArrowRight 
} from "lucide-react"
import { useState } from "react"

function Dashboard() {
  const [profile] = useState({
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    avatar: "RK"
  })

  const stats = [
    { label: "Texts Paraphrased", value: "127", icon: FileText, color: "text-blue-600" },
    { label: "Grammar Checks", value: "43", icon: CheckCircle, color: "text-green-600" },
    { label: "Words Processed", value: "12.5K", icon: TrendingUp, color: "text-purple-600" },
    { label: "Time Saved", value: "8h", icon: Clock, color: "text-orange-600" }
  ]

  const recentActivity = [
    { 
      type: "Paraphrase", 
      text: "à¤®à¥ˆà¤‚ à¤…à¤ªà¤¨à¥‡ à¤˜à¤° à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥‚à¤‚...", 
      language: "Hindi", 
      time: "2 hours ago" 
    },
    { 
      type: "Grammar", 
      text: "The importance of education in society...", 
      language: "English", 
      time: "5 hours ago" 
    },
    { 
      type: "Paraphrase", 
      text: "à®®à®°à®¤à¯à®¤à®¿à®© à®®à®±à¯à®±à¯à®®à¯ à®µà®¾à®´à¯à®µà®¿à®©à¯...", 
      language: "Tamil", 
      time: "1 day ago" 
    }
  ]

  const quickActions = [
    {
      title: "Paraphrase Text",
      description: "Rewrite content in Indian languages",
      icon: Sparkles,
      color: "bg-blue-500/10 text-blue-600",
      link: "/paraphrase"
    },
    {
      title: "Check Grammar",
      description: "Fix grammar and spelling errors",
      icon: CheckCircle,
      color: "bg-green-500/10 text-green-600",
      link: "/grammar"
    },
    {
      title: "View History",
      description: "Access your previous work",
      icon: Clock,
      color: "bg-purple-500/10 text-purple-600",
      link: "/history"
    },
    {
      title: "Upgrade Plan",
      description: "Get premium features",
      icon: Award,
      color: "bg-orange-500/10 text-orange-600",
      link: "/upgrade"
    }
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-background h-screen sticky top-0">
        <Sidebar activeTool="dashboard" />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar activeTool="dashboard" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="lg:hidden"></span>
              <span className="text-lg font-medium ml-12 lg:ml-0">Dashboard</span>
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
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome back, {profile.name}! 👋
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    You've saved 8 hours this month with BharatWrite
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm">
                      Start Writing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      View Tutorial
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Free Plan
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition cursor-pointer group">
                    <CardContent className="pt-6">
                      <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Activity & Tips */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest writing tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition cursor-pointer">
                        <div className={`h-10 w-10 rounded-lg ${
                          activity.type === 'Paraphrase' 
                            ? 'bg-blue-500/10 text-blue-600' 
                            : 'bg-green-500/10 text-green-600'
                        } flex items-center justify-center flex-shrink-0`}>
                          {activity.type === 'Paraphrase' ? (
                            <Sparkles className="h-5 w-5" />
                          ) : (
                            <CheckCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{activity.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.language}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Activity
                  </Button>
                </CardContent>
              </Card>

              {/* Tips & Upgrade */}
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardHeader>
                    <Award className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Upgrade to Premium</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Unlimited paraphrasing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Advanced grammar checks
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Priority support
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        API access
                      </li>
                    </ul>
                    <Button className="w-full">
                      Upgrade Now
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">💡 Pro Tip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      For best results, use complete sentences when paraphrasing. 
                      Our AI understands context better with full sentences!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard