import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Header/Nav */}
      <header className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/placeholder.svg" alt="Concept Map Logo" className="h-8 w-8" />
          <span className="ml-2 font-medium">Concept Map</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm hover:text-primary">Features</a>
          <a href="#benefits" className="text-sm hover:text-primary">Benefits</a>
          <a href="#pricing" className="text-sm hover:text-primary">Pricing</a>
          <a href="#faq" className="text-sm hover:text-primary">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="outline" size="sm">Log in</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Sign up free</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Optimize Your Learning With AI-Powered Concept Maps
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Based on cutting-edge AI technology, our platform creates intuitive concept maps that help you understand complex topics faster, retain information longer, and connect ideas more effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link to="/register">Try it Free</Link>
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
        <div className="bg-yellow-100 rounded-lg p-6">
          <img 
            src="/placeholder.svg" 
            alt="Concept Map Dashboard" 
            className="w-full rounded shadow-lg border border-yellow-200" 
          />
        </div>
      </section>

      {/* Logos Section */}
      <section className="container mx-auto px-4 py-12 text-center border-t border-b">
        <p className="text-sm text-muted-foreground mb-6">Trusted by top educational institutions</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {[1, 2, 3, 4, 5].map((i) => (
            <img key={i} src="/placeholder.svg" alt={`Partner ${i}`} className="h-8 opacity-70" />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">With innovative features and an intuitive interface</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-16">
          Our platform combines powerful AI with user-friendly design to make concept mapping more efficient and effective.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Analysis</h3>
            <p className="text-muted-foreground">
              Our AI analyzes your content in real-time and generates concept maps that highlight key relationships and hierarchies.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Complete Control</h3>
            <p className="text-muted-foreground">
              Customize and refine AI-generated maps with intuitive drag-and-drop editing and formatting options.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-platform Integration</h3>
            <p className="text-muted-foreground">
              Seamlessly integrate with learning management systems and export to multiple formats for easy sharing.
            </p>
          </div>
        </div>
      </section>

      {/* All Features Section */}
      <section className="container mx-auto px-4 py-16 text-center bg-slate-50 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">All the features you need</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-16">
          Our AI-powered concept mapping tool provides everything you need to transform complex information into clear, memorable visual representations.
        </p>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-left">Campaign overview</h3>
            <p className="text-muted-foreground text-left mb-4">
              Get a comprehensive overview of your learning progress. Track which concepts you've mastered and which need more attention.
            </p>
            <div className="mt-8">
              <img 
                src="/placeholder.svg" 
                alt="Campaign Overview" 
                className="rounded-lg border shadow-sm w-full" 
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 8v8m-8-5v5m4-9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-left">Weekly visitors</h3>
            <p className="text-muted-foreground text-left mb-4">
              Monitor your study sessions and engagement with concepts over time. Identify patterns and optimize your learning schedule.
            </p>
            <div className="mt-8">
              <img 
                src="/placeholder.svg" 
                alt="Weekly Visitors" 
                className="rounded-lg border shadow-sm w-full" 
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-left">Analytical data</h3>
            <p className="text-muted-foreground text-left mb-4">
              Gain insights into your learning patterns and concept relationships. Our AI identifies connections you might miss.
            </p>
            <div className="mt-8">
              <img 
                src="/placeholder.svg" 
                alt="Analytical Data" 
                className="rounded-lg border shadow-sm w-full" 
              />
            </div>
          </div>

          <div className="bg-yellow-50 p-8 rounded-lg shadow-sm border flex items-center">
            <div>
              <img 
                src="/placeholder.svg" 
                alt="Video Thumbnail" 
                className="rounded-lg w-full" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Easily, quickly, and effectively master complex subjects!</h2>
            <p className="text-muted-foreground mb-8">
              Our AI-powered concept mapping tool transforms the way you learn by visualizing connections between ideas. Research shows that concept maps can improve knowledge retention by up to 50% compared to traditional note-taking.
            </p>
            <Button size="lg">Learn More</Button>
          </div>
          <div className="bg-yellow-100 rounded-lg p-6">
            <img 
              src="/placeholder.svg" 
              alt="Concept Map Dashboard" 
              className="w-full rounded shadow-lg border border-yellow-200" 
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Easy to use</h3>
          <p className="text-sm text-muted-foreground">
            Intuitive UI designed for students and educators with no technical learning curve.
          </p>
        </div>
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Saves time & energy</h3>
          <p className="text-sm text-muted-foreground">
            AI generates concept maps in seconds that would take hours to create manually.
          </p>
        </div>
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Optimizes ROI</h3>
          <p className="text-sm text-muted-foreground">
            Proven to improve learning outcomes and knowledge retention by up to 50%.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-bold mb-12 text-center">Kind words from education leaders</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="flex justify-center mb-6">
                <img src="/placeholder.svg" alt={`Partner ${i}`} className="h-12" />
              </div>
              <p className="text-muted-foreground mb-6 italic text-center">
                "The AI-generated concept maps have transformed how our students approach complex subjects. They're understanding connections faster and retaining information longer."
              </p>
              <div className="flex items-center">
                <img 
                  src="/placeholder.svg" 
                  alt="Testimonial Author" 
                  className="w-12 h-12 rounded-full mr-4" 
                />
                <div>
                  <p className="font-semibold">Dr. Sarah Parker</p>
                  <p className="text-sm text-muted-foreground">Education Director, University of Technology</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              What is a Concept Map?
              <span className="ml-auto">+</span>
            </h3>
            <div className="border-t pt-4 mt-2">
              <p className="text-muted-foreground">
                A concept map is a visual representation that shows relationships between ideas. Our AI takes this educational tool to the next level by automatically identifying connections and creating beautiful, clear maps from your content.
              </p>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              Is Ezedu easy to use?
              <span className="ml-auto">+</span>
            </h3>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              How do I input my content?
              <span className="ml-auto">+</span>
            </h3>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              How much does it cost?
              <span className="ml-auto">+</span>
            </h3>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              Can Ezedu be used in mobile devices?
              <span className="ml-auto">+</span>
            </h3>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-yellow-100 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Take Your Learning to the Next Level?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of students and educators who are using AI-powered concept maps to transform their learning experience.
              </p>
              <Button size="lg" className="bg-black text-white hover:bg-black/90">
                Get Started Free
              </Button>
            </div>
            <div className="w-full md:w-1/3">
              <img 
                src="/placeholder.svg" 
                alt="App Preview" 
                className="w-full rounded-lg border shadow-lg" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-6 md:mb-0">
              <img src="/placeholder.svg" alt="Concept Map Logo" className="h-8 mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Transforming learning through AI-powered concept mapping
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Links</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-muted-foreground hover:text-primary">Home</a></li>
                  <li><a href="#features" className="text-muted-foreground hover:text-primary">Features</a></li>
                  <li><a href="#pricing" className="text-muted-foreground hover:text-primary">Pricing</a></li>
                  <li><a href="#faq" className="text-muted-foreground hover:text-primary">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-muted-foreground">Email: hello@conceptmap.com</li>
                  <li className="text-muted-foreground">Phone: +1 (555) 123-4567</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Office</h4>
                <p className="text-sm text-muted-foreground">
                  123 Learning Street<br />
                  San Francisco, CA 94107<br />
                  United States
                </p>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} Concept Map App. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-xs text-muted-foreground hover:text-primary">Terms</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary">Privacy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 