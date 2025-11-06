import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { 
  Menu, User, Sparkles, FileText, CheckCircle, 
  TrendingUp, Clock, Award, ArrowRight
} from "lucide-react"
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow, isValid} from 'date-fns';
import { useState, useEffect} from "react"
import api from "@/api/axios"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"

// Based on your formatted stats array
interface DashboardStat {
  label: string;
  value: string | number;
  icon:LucideIcon,
  color: string;
}

// Based on your /history endpoints
// A base type for common fields
interface BaseActivity {
  id: string;
  original: string;
  language: string;
  createdAt: string; // ISO string
}

// Specific type for paraphrase history
interface ParaphraseActivity extends BaseActivity {
  type: 'paraphrase';
  paraphrased: string;
}

// Specific type for grammar history
interface GrammarActivity extends BaseActivity {
  type: 'grammar';
  errors: any[]; // You could define a stronger 'Error' type here
}

// A union type for the combined list
type RecentActivityItem = ParaphraseActivity | GrammarActivity;


function Dashboard() {
  const {user :profile} = useAuth()
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate()

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

  useEffect(()=>{
    const fetchDashboard = async() =>{
      setLoading(true);
      setError(null);

      try{

        const [
          statsRes,
          paraphrasesRes,
          grammarRes
        ] = await Promise.all([
          api.get("/stats"),
          api.get("/history/paraphrases?limit=5"), // Get last 5
          api.get("/history/grammar?limit=5")      // Get last 5
        ]);
 
        const apiStats = statsRes.data;
        const formattedStats = [
          { 
            label: "Total Paraphrases", 
            value: apiStats.totalParaphrases, 
            icon: FileText, 
            color: "text-blue-600" 
          },
          { 
            label: "Total Grammar Checks", 
            value: apiStats.totalGrammarChecks, 
            icon: CheckCircle, 
            color: "text-green-600" 
          },
          { 
            label: "Paraphrases Left (Month)", 
            value: `${apiStats.remaining.paraphrase}`, 
            icon: TrendingUp, 
            color: "text-purple-600" 
          },
          { 
            label: "Grammar Checks Left", 
            value: `${apiStats.remaining.grammar}`, 
            icon: Clock, 
            color: "text-orange-600" 
          }
        ];
        setStats(formattedStats);

        const paraphrases = paraphrasesRes.data;
        const grammar = grammarRes.data;
        
        const combinedActivity = [...paraphrases, ...grammar]
          .sort((a, b) => new Date(b.createdAt).getDate() - new Date(a.createdAt)
          .getDate()).slice(0, 5);
        
        setRecentActivity(combinedActivity);
        

      }catch(err){
        console.error("Failed to fetch dashboard",err)
        setError("could not fetch Dashboard, try again")
      }finally{
        setLoading(false)
      }
    }

    fetchDashboard()
  },[])


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Error: {error}
      </div>
    );
  }

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
              <Button variant="outline" size="sm" className="hidden sm:flex cursor-pointer" onClick={()=>navigate('/upgrade')}>
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
                    Welcome back, {profile?.name || 'User'}! 👋
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    You've saved 8 hours this month with BharatWrite
                  </p>
                  <div className="flex gap-3">
                    <Button className="cursor-pointer" onClick={() => navigate('/paraphrase')} size="sm">
                      Start Writing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      View Tutorial
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {profile?.plan || 'Free'} plan
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
                  <Card key={idx} className="hover:shadow-lg transition cursor-pointer group" onClick={()=>navigate(action.link)}>
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
                          activity.type === 'paraphrase' 
                            ? 'bg-blue-500/10 text-blue-600' 
                            : 'bg-green-500/10 text-green-600'
                        } flex items-center justify-center flex-shrink-0`}>
                          {activity.type === 'paraphrase' ? (
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
                            {activity.original}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.original}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.createdAt && isValid(new Date(activity.createdAt))
                              ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                              : 'Just now'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4 cursor-pointer" onClick={()=>navigate('/history')}>
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
                    <Button className="w-full cursor-pointer" onClick={()=>navigate('/upgrade')}>
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