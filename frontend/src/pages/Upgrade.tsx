import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, Check, Sparkles, Zap, Crown, 
  ArrowRight, Star, Shield, Headphones
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

function Upgrade() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const navigate = useNavigate()

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, yearly: 0 },
      description: "Perfect for trying out BharatWrite",
      icon: Sparkles,
      color: "text-gray-600",
      features: [
        "50 paraphrases per month",
        "10 grammar checks per month",
        "10 Indian languages",
        "Basic support",
        "Standard processing speed"
      ],
      limitations: [
        "No API access",
        "No priority support",
        "Basic features only"
      ],
      cta: "Current Plan",
      popular: false,
      disabled: true
    },
    {
      name: "Pro",
      price: { monthly: 499, yearly: 4990 },
      description: "Best for content creators and professionals",
      icon: Zap,
      color: "text-blue-600",
      features: [
        "Unlimited paraphrasing",
        "Unlimited grammar checks",
        "10 Indian languages",
        "Priority support",
        "Fast processing speed",
        "Advanced AI models",
        "Export to multiple formats",
        "No ads"
      ],
      limitations: [],
      cta: "Upgrade to Pro",
      popular: true,
      disabled: false
    },
    {
      name: "Enterprise",
      price: { monthly: 1999, yearly: 19990 },
      description: "For teams and organizations",
      icon: Crown,
      color: "text-purple-600",
      features: [
        "Everything in Pro",
        "API access (100k requests/month)",
        "Custom AI model training",
        "Dedicated account manager",
        "SLA guarantee",
        "Advanced analytics",
        "Team collaboration tools",
        "White-label option",
        "Custom integrations"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
      disabled: false
    }
  ]

  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your data is encrypted and secure with industry-standard protocols"
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Get help whenever you need it from our expert support team"
    },
    {
      icon: Star,
      title: "Regular Updates",
      description: "Access new features and improvements as soon as they're released"
    }
  ]

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Content Writer",
      image: "👩‍💼",
      text: "BharatWrite has transformed my Hindi content creation. The Pro plan is worth every rupee!"
    },
    {
      name: "Rajesh Kumar",
      role: "Student",
      image: "👨‍🎓",
      text: "As a student writing in Tamil, this tool helps me write better essays. Highly recommended!"
    },
    {
      name: "Anita Desai",
      role: "Marketing Manager",
      image: "👩‍💻",
      text: "Our team uses the Enterprise plan for all regional campaigns. Excellent ROI!"
    }
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="lg:hidden"></span>
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-lg font-medium ml-12 lg:ml-0">BharatWrite</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <Badge className="mb-2">Pricing</Badge>
              <h1 className="text-4xl md:text-5xl font-bold">
                Choose the perfect plan for you
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start free, upgrade when you need more. All plans include access to 10 Indian languages.
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={billingCycle === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </span>
              <Button
                variant="outline"
                size="sm"
                className="relative h-8 w-14"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              >
                <div className={`absolute h-6 w-6 rounded-full bg-primary transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </Button>
              <span className={billingCycle === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
              </span>
            </div>

            {/* Pricing Cards */}
            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, idx) => (
                <Card 
                  key={idx} 
                  className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center`}>
                        <plan.icon className={`h-6 w-6 ${plan.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-4xl font-bold">
                        ₹{billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                      <p className="text-sm text-muted-foreground">
                        ₹{plan.price.yearly} billed annually
                      </p>
                    )}
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Button 
                      className="w-full cursor-pointer" 
                      variant={plan.popular ? "default" : "outline"}
                      disabled={plan.disabled}
                    >
                      {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">What's included:</p>
                      <ul className="space-y-2">
                        {plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Features Grid */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center">Why upgrade to premium?</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {features.map((feature, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <feature.icon className="h-10 w-10 text-primary mb-4" />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center">Compare all features</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-4 font-semibold">Feature</th>
                          <th className="text-center py-4 font-semibold">Free</th>
                          <th className="text-center py-4 font-semibold">Pro</th>
                          <th className="text-center py-4 font-semibold">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-4">Paraphrases per month</td>
                          <td className="text-center py-4">50</td>
                          <td className="text-center py-4">Unlimited</td>
                          <td className="text-center py-4">Unlimited</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-4">Grammar checks per month</td>
                          <td className="text-center py-4">10</td>
                          <td className="text-center py-4">Unlimited</td>
                          <td className="text-center py-4">Unlimited</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-4">Indian languages</td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-4">API access</td>
                          <td className="text-center py-4">-</td>
                          <td className="text-center py-4">-</td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-4">Priority support</td>
                          <td className="text-center py-4">-</td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-4">Custom AI training</td>
                          <td className="text-center py-4">-</td>
                          <td className="text-center py-4">-</td>
                          <td className="text-center py-4"><Check className="h-4 w-4 mx-auto" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Testimonials */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center">Loved by thousands</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">{testimonial.image}</div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">"{testimonial.text}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="space-y-6 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center">Frequently asked questions</h2>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Can I change plans later?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We accept all major credit cards, debit cards, UPI, and net banking.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Is there a refund policy?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Yes, we offer a 7-day money-back guarantee on all paid plans. No questions asked.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA Section */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Join thousands of Indian users who trust BharatWrite for their writing needs.
                </p>
                <Button size="lg" className="text-lg px-8 cursor-pointer" onClick={()=> navigate('/dashboard')}>
                  Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Upgrade