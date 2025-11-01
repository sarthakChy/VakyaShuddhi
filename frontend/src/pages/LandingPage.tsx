import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Sparkles, Shield, Languages, Globe } from "lucide-react"
import { useNavigate } from "react-router-dom"

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BharatWrite</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm hover:text-primary transition">Features</a>
            <a href="#languages" className="text-sm hover:text-primary transition">Languages</a>
            <a href="#tools" className="text-sm hover:text-primary transition">Tools</a>
            <Button className="cursor-pointer" variant="outline" size="sm">साइन इन</Button>
            <Button className="cursor-pointer" size="sm">Get Started</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
            Write better in your language
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            AI-powered writing assistant designed for Indian languages. Paraphrase, check grammar, and write with confidence in Hindi, Tamil, Telugu, Bengali, and more.
          </p>
          <p className="text-lg text-primary font-semibold mb-8">
            हिंदी • தமிழ் • తెలుగు • বাংলা • ગુજરાતી • ಕನ್ನಡ • മലയാളം • मराठी • ਪੰਜਾਬੀ • ଓଡ଼ିଆ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button size="lg" className="text-lg px-8 cursor-pointer">
              शुरू करें - It's Free!
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <span className="text-yellow-500">★★★★★</span>
                <span className="ml-2">4.8/5</span>
              </div>
              <span>•</span>
              <span>1M+ Indian users</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for Bharat, by Bharat
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Languages className="h-10 w-10 text-primary mb-4" />
                <CardTitle>10 Indian Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Support for Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, and Oriya. Write naturally in your mother tongue.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Cultural Context</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our AI understands Indian context, idioms, and expressions. Get suggestions that sound natural and culturally appropriate.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Your data stays secure. We respect your privacy and never share your content with third parties.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section id="languages" className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Supported Indian Languages</h2>
            <p className="text-muted-foreground">Write with confidence in any of these languages</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
                { name: "हिंदी", english: "Hindi" },
                { name: "தமிழ்", english: "Tamil" },
                { name: "తెలుగు", english: "Telugu" },
                { name: "বাংলা", english: "Bengali" },
                { name: "ગુજરાતી", english: "Gujarati" },
                { name: "ಕನ್ನಡ", english: "Kannada" },
                { name: "മലയാളം", english: "Malayalam" },
                { name: "मराठी", english: "Marathi" },
                { name: "ଓଡ଼ିଆ", english: "Oriya" },
                { name: "ਪੰਜਾਬੀ", english: "Punjabi" },
              ].map((lang, idx) => (
              <Card key={idx} className="text-center hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary mb-1">{lang.name}</div>
                  <div className="text-sm text-muted-foreground">{lang.english}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Two powerful tools. One platform.</h2>
            <p className="text-muted-foreground">Everything you need to write perfectly in Indian languages</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Paraphraser</CardTitle>
                    <div className="text-xs text-muted-foreground">पैराफ्रेज़र</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mb-6">
                  Rewrite content in your regional language while maintaining the original meaning. Perfect for students, content creators, and professionals.
                </CardDescription>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Works with Hindi, Tamil, Telugu & more</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Preserves cultural context</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Multiple writing styles</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 cursor-pointer" onClick={()=>navigate('/paraphrase')}>Try Paraphraser</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Grammar Checker</CardTitle>
                    <div className="text-xs text-muted-foreground">व्याकरण जांचकर्ता</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mb-6">
                  Fix grammar mistakes in Indian languages. Get instant corrections and suggestions to improve your writing quality.
                </CardDescription>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Detect grammar errors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Spelling corrections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Punctuation suggestions</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 cursor-pointer" onClick={()=> navigate("/grammar")}>Try Grammar Checker</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Trusted by millions across India
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">1M+</div>
              <div className="text-sm text-muted-foreground">Indian users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">10+</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">4.8/5</div>
              <div className="text-sm text-muted-foreground">User rating</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">500K+</div>
              <div className="text-sm text-muted-foreground">Daily users</div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect for everyone</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">👨‍🎓</div>
                <h3 className="font-semibold mb-2">Students</h3>
                <p className="text-sm text-muted-foreground">Write essays and assignments in your regional language</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">✍️</div>
                <h3 className="font-semibold mb-2">Content Creators</h3>
                <p className="text-sm text-muted-foreground">Create engaging content for Indian audiences</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">💼</div>
                <h3 className="font-semibold mb-2">Professionals</h3>
                <p className="text-sm text-muted-foreground">Draft emails and documents in Hindi or other languages</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-semibold mb-2">Social Media</h3>
                <p className="text-sm text-muted-foreground">Polish posts for Instagram, Twitter, and Facebook</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            अपनी भाषा में लिखें, आत्मविश्वास से
          </h2>
          <p className="text-xl text-muted-foreground mb-2">
            Write in your language, with confidence
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            Join millions of Indians who trust BharatWrite for their daily writing needs
          </p>
          <Button size="lg" className="text-lg px-8 cursor-pointer">
            Start Writing Free - मुफ्त में शुरू करें
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Tools</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Paraphraser</a></li>
                <li><a href="#" className="hover:text-primary transition">Grammar Checker</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Languages</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Hindi</a></li>
                <li><a href="#" className="hover:text-primary transition">Tamil</a></li>
                <li><a href="#" className="hover:text-primary transition">Telugu</a></li>
                <li><a href="#" className="hover:text-primary transition">All Languages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 BharatWrite. Made with ❤️ in India. सभी अधिकार सुरक्षित।</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage