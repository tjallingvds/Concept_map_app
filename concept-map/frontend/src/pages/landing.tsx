import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context.tsx';
import { useEffect, useState } from 'react';
import { useFadeIn } from '../hooks/use-fade-in.ts';
import { FadeInItem } from '../components/fade-in-item.tsx';

const faqItems = [
  {
    question: 'What is a Concept Map?',
    answer:
      'A concept map is a visual representation showing relationships between ideas. Our AI takes this educational tool to the next level by automatically identifying connections and creating beautiful, clear maps from your content.',
  },
  {
    question: 'Is Ezedu easy to use?',
    answer:
      'Ezedu is designed for maximum simplicity. The intuitive interface makes it easy to create and edit concept maps even without prior experience. You can start working in minutes.',
  },
  {
    question: 'How do I input my content?',
    answer:
      'You can paste text, upload documents (e.g., PDF, Word), or even enter a web page URL. Our AI will analyze the provided information and automatically generate a draft concept map.',
  },
  {
    question: 'How much does it cost?',
    answer:
      "We offer a free plan to explore the basic features. For advanced capabilities and higher generation volume, various paid plans are available. See the 'Pricing' section for details.",
  },
  {
    question: 'Can Ezedu be used on mobile devices?',
    answer:
      'Yes, our platform is fully responsive and optimized for use on any device, including smartphones and tablets, allowing you to study anywhere, anytime.',
  },
];

const keyBenefits = [
  {
    title: 'Real-Time Analysis',
    description:
      'Our AI analyzes your content in real-time and generates concept maps that highlight key relationships and hierarchies.',
    icon: (
      <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Complete Control',
    description: 'Customize and refine AI-generated maps with intuitive drag-and-drop editing and formatting options.',
    icon: (
      <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Multi-platform Integration',
    description:
      'Seamlessly integrate with learning management systems and export to multiple formats for easy sharing.',
    icon: (
      <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const detailedFeatures = [
  {
    title: 'Learning Progress Overview',
    description:
      "Get a comprehensive overview of your learning progress. Track which concepts you've mastered and which need more attention.",
    image: '/placeholder.svg',
    alt: 'Learning Progress Overview Dashboard',
    icon: (
      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Activity Tracking',
    description:
      'Monitor your study sessions and engagement with concepts over time. Identify patterns and optimize your learning schedule.',
    image: '/placeholder.svg',
    alt: 'Activity Tracking Chart',
    icon: (
      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 8v8m-8-5v5m4-9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Concept Connection Analytics',
    description:
      'Gain insights into your learning patterns and concept relationships. Our AI identifies connections you might miss.',
    image: '/placeholder.svg',
    alt: 'Concept Connection Analytics Graph',
    icon: (
      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Product Demo Video',
    description: 'See how easy and fast it is to create amazing concept maps with our AI.',
    image: '/placeholder.svg',
    alt: 'Video Thumbnail of Product Demo',
    icon: null,
  },
];

const howItWorksSteps = [
  {
    title: 'Upload or Paste Your Content',
    description: 'Text, documents, or URLs – our AI is ready to process any information.',
    icon: '1',
  },
  {
    title: 'AI Generates Concept Map',
    description: 'Based on your content, a visual map highlighting key concepts and relationships is created.',
    icon: '2',
  },
  {
    title: 'Customize and Enhance the Map',
    description: 'Easily edit nodes, connections, and appearance to tailor the map perfectly to your needs.',
    icon: '3',
  },
  {
    title: 'Use Your Map for Learning',
    description: 'Visualize knowledge, prepare for exams, and share maps with friends or colleagues.',
    icon: '4',
  },
];

const benefitHighlights = [
  {
    title: 'Easy to Use',
    description: 'Intuitive UI designed for students and educators with no technical learning curve.',
  },
  {
    title: 'Saves Time & Energy',
    description: 'AI generates concept maps in seconds that would take hours to create manually.',
  },
  {
    title: 'Optimizes Outcomes',
    description: 'Proven to improve learning results and knowledge retention by up to 50%.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['Limited generations', 'Basic editing features', 'Access from any device'],
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/mo',
    features: ['Unlimited generations', 'Advanced editing tools', 'Export to PDF/PNG', 'Priority support'],
    recommended: true,
  },
  {
    name: 'Institution',
    price: 'Contact Us',
    period: '',
    features: ['For educational organizations', 'Team access', 'LMS integrations', 'Personalized support'],
  },
];

const testimonials = [
  {
    quote:
      "The AI-generated concept maps have transformed how our students approach complex subjects. They're understanding connections faster and retaining information longer.",
    author: 'Dr. Sarah Parker',
    title: 'Education Director, University of Technology',
    avatar: '/avatar-sarah-parker.png',
    logo: '/university-logo-1.svg',
  },
  {
    quote:
      'The Ezedu tool has become an essential part of our curriculum. It allows teachers to easily create visual materials and students to better absorb the material.',
    author: 'Professor David Chen',
    title: 'Computer Science Faculty, State College',
    avatar: '/avatar-david-chen.png',
    logo: '/university-logo-2.svg',
  },
  {
    quote:
      "Concept Map's solution exceeded our expectations. The ease of use combined with the power of AI makes it an ideal tool for modern learning.",
    author: 'Maria Gonzalez',
    title: 'Curriculum Coordinator, Progress School',
    avatar: '/avatar-maria-gonzalez.png',
    logo: '/university-logo-3.svg',
  },
];

export default function LandingPage() {
  const { loading, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const heroRef = useFadeIn<HTMLElement>();
  const logosRef = useFadeIn<HTMLElement>();
  const keyBenefitsRef = useFadeIn<HTMLElement>();
  const detailedFeaturesRef = useFadeIn<HTMLElement>();
  const howItWorksRef = useFadeIn<HTMLElement>(); // New section
  const benefitsSectionRef = useFadeIn<HTMLElement>(); // Renamed for clarity
  const benefitHighlightsSectionRef = useFadeIn<HTMLElement>();
  const featuresGridRef = useFadeIn<HTMLElement>(); // For the brief grid
  const testimonialsRef = useFadeIn<HTMLElement>();
  const pricingRef = useFadeIn<HTMLElement>(); // New section
  const faqSectionRef = useFadeIn<HTMLElement>();
  const ctaRef = useFadeIn<HTMLElement>();
  const footerRef = useFadeIn<HTMLElement>();

  const mockFeatures = [
    {
      title: 'Real-Time Analysis',
      description:
        'Our AI analyzes your content in real-time and generates concept maps that highlight key relationships and hierarchies.',
      icon: (
        <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Complete Control',
      description:
        'Customize and refine AI-generated maps with intuitive drag-and-drop editing and formatting options.',
      icon: (
        <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: 'Multi-platform Integration',
      description:
        'Seamlessly integrate with learning management systems and export to multiple formats for easy sharing.',
      icon: (
        <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-white">
      {/* Header/Nav */}
      <header className="container mx-auto px-4 py-4 flex items-center justify-between z-10 relative border-b border-gray-200">
        <div className="flex items-center">
          <img src="/placeholder.svg" alt="Concept Map Logo" className="h-8 w-8" />
          <span className="ml-2 font-bold text-lg text-gray-900">Concept Map</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="text-gray-600 hover:text-yellow-700 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-600 hover:text-yellow-700 transition-colors">
            How It Works
          </a>
          <a href="#benefits" className="text-gray-600 hover:text-yellow-700 transition-colors">
            Benefits
          </a>
          <a href="#pricing" className="text-gray-600 hover:text-yellow-700 transition-colors">
            Pricing
          </a>
          <a href="#faq" className="text-gray-600 hover:text-yellow-700 transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={login}
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
          >
            Log in
          </Button>
          <Button size="sm" onClick={login} className="bg-yellow-500 text-white hover:bg-yellow-600">
            Sign up free
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        ref={heroRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center
                 opacity-0 transition-all duration-1000 ease-out
                 ${heroRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <div>
          <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            AI-Powered Learning
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4 leading-tight">
            Optimize Your Learning With AI-Powered Concept Maps
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Based on cutting-edge AI technology, our platform creates intuitive concept maps that help you understand
            complex topics faster, retain information longer, and connect ideas more effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={login}
              className="bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Learn More
            </Button>
          </div>
        </div>
        <div className="relative p-6 bg-yellow-100 rounded-xl shadow-xl transform rotate-3 translate-x-4 hidden md:block">
          <img
            src="/placeholder.svg"
            alt="Concept Map Dashboard Preview"
            className="w-full rounded-lg border border-yellow-200 shadow-lg -rotate-3"
          />
          {/* Add abstract background elements with animation */}
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
        </div>
        <div className="md:hidden relative p-4 bg-yellow-100 rounded-lg shadow-lg">
          <img
            src="/placeholder.svg"
            alt="Concept Map Dashboard Preview"
            className="w-full rounded-lg border border-yellow-200 shadow-lg"
          />
        </div>
      </section>

      {/* Logos Section */}
      <section
        id="logos"
        ref={logosRef.ref}
        className={`container mx-auto px-4 py-12 text-center border-t border-b border-gray-200
                 opacity-0 transition-opacity duration-1000 ease-out
                 ${logosRef.isVisible ? 'opacity-100' : ''}`}
      >
        <p className="text-sm text-gray-500 mb-6">Trusted by top educational institutions</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {[1, 2, 3, 4, 5].map((i) => (
            <img
              key={i}
              src={`/placeholder.svg`}
              alt={`Partner ${i} Logo`}
              className="h-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-300"
            />
          ))}
        </div>
      </section>

      {/* All Features Section */}
      <section
        id="features"
        ref={keyBenefitsRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center
                opacity-0 transition-all duration-1000 ease-out
                ${keyBenefitsRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Key Benefits
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          With innovative features and an intuitive interface
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-16">
          Our platform combines powerful AI with user-friendly design to make concept mapping more efficient and
          effective.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Wrap each item in FadeInItem */}
          {keyBenefits.map((feature, index) => (
            <FadeInItem key={index}>
              {' '}
              {/* delay can be added here if needed: delay={index * 100} */}
              <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm text-center h-full">
                <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </FadeInItem>
          ))}
        </div>
      </section>

      {/* Detailed Features Section */}
      <section
        id="detailed-features"
        ref={detailedFeaturesRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center rounded-2xl
                opacity-0 transition-all duration-1000 ease-out
                ${detailedFeaturesRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Detailed Capabilities
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">All the features you need for success</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-16">
          Our AI-powered concept mapping tool provides everything you need to transform complex information into clear,
          memorable visual representations.
        </p>
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 text-left">
          {detailedFeatures.map((feature, index) => {
            const isVideoBlock = feature.icon === null;
            return (
              <FadeInItem key={index}>
                {isVideoBlock ? (
                  <div
                    className={`bg-yellow-50 p-8 rounded-xl shadow-sm border border-yellow-200 flex items-center justify-center h-full`}
                  >
                    <img src={feature.image} alt={feature.alt} className="rounded-lg w-full shadow-md cursor-pointer" />
                  </div>
                ) : (
                  <div className={`bg-white p-8 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col`}>
                    <div className="bg-gray-800 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
                    <div className="mt-auto pt-4">
                      <img
                        src={feature.image}
                        alt={feature.alt}
                        className="rounded-lg border border-gray-200 shadow-sm w-full"
                      />
                    </div>
                  </div>
                )}
              </FadeInItem>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={howItWorksRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center
                 opacity-0 transition-all duration-1000 ease-out
                 ${howItWorksRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          How It Works
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple Steps to Deep Understanding</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-16">
          In just a few steps, you can transform any text into a structured and clear concept map.
        </p>

        <div className="relative flex flex-col items-center">
          {/* Vertical timeline line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-yellow-300 hidden md:block"></div>

          {/* Timeline steps */}
          {/* Wrap each item in FadeInItem */}
          {howItWorksSteps.map((step, index) => {
            const isEven = index % 2 === 0;
            return (
              <FadeInItem key={index}>
                {' '}
                {/* delay={index * 100} */}
                <div
                  className={`flex items-center w-full mb-8 md:mb-12 ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'}`}
                >
                  {/* Circle with number/icon */}
                  <div className="z-10 flex items-center justify-center w-10 h-10 bg-yellow-500 rounded-full text-white font-bold flex-shrink-0">
                    {step.icon}
                  </div>
                  {/* Step content */}
                  <div
                    className={`flex-grow md:flex-none md:w-5/12 p-6 rounded-xl border border-gray-200 bg-white shadow-md relative ${
                      isEven ? 'md:ml-10 text-left' : 'md:mr-10 text-left'
                    }`}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                    {/* Arrow/connector for desktop */}
                    <div
                      className={`hidden md:block absolute w-6 h-0.5 bg-yellow-300 top-1/2 transform -translate-y-1/2 ${
                        isEven ? '-left-6' : '-right-6'
                      }`}
                    ></div>
                  </div>
                </div>
              </FadeInItem>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        ref={benefitsSectionRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24
                 opacity-0 transition-all duration-1000 ease-out
                 ${benefitsSectionRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* These individual items are not wrapped in FadeInItem, so they appear with the section */}
          <div>
            <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Benefits for You
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Master complex subjects easily, quickly, and effectively!
            </h2>
            <p className="text-gray-600 mb-8">
              Our AI-powered concept mapping tool transforms the way you learn by visualizing connections between ideas.
              Research shows that concept maps can improve knowledge retention by up to 50% compared to traditional
              note-taking.
            </p>
            <Button
              size="lg"
              className="bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-shadow"
            >
              Learn More About Benefits
            </Button>
          </div>
          <div className="relative p-6 bg-yellow-100 rounded-xl shadow-xl transform -rotate-2 translate-x-3 hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Concept Map Benefits Visualization"
              className="w-full rounded-lg border border-yellow-200 shadow-lg rotate-2"
            />
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000"></div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-6000"></div>
          </div>
          <div className="md:hidden relative p-4 bg-yellow-100 rounded-lg shadow-lg">
            <img
              src="/placeholder.svg"
              alt="Concept Map Benefits Visualization"
              className="w-full rounded-lg border border-yellow-200 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        ref={benefitHighlightsSectionRef.ref}
        className={`container mx-auto px-4 py-12 grid md:grid-cols-3 gap-8 border-t border-b border-gray-200
                 opacity-0 transition-all duration-1000 ease-out
                 ${benefitHighlightsSectionRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        {/* Wrap each item in FadeInItem */}
        {benefitHighlights.map((item, index) => (
          <FadeInItem key={index}>
            {' '}
            {/* delay={index * 100} */}
            <div className="text-center p-6 h-full">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </FadeInItem>
        ))}
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        ref={pricingRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center
                 opacity-0 transition-all duration-1000 ease-out
                 ${pricingRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Pricing
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Affordable Plans for Every User</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-16">
          Choose the plan that's right for you, whether for individual learning or institutional use.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <FadeInItem key={index}>
              <div
                className={`p-8 rounded-xl border border-gray-200 bg-white shadow-lg text-left flex flex-col h-full ${
                  plan.recommended ? 'border-yellow-500 ring ring-yellow-200' : ''
                }`}
              >
                {plan.recommended && (
                  <span className="inline-block bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full self-start mb-4">
                    Recommended
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600">{plan.period}</span>}
                </div>
                <ul className="space-y-3 text-gray-600 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center">
                      <svg
                        className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    size="lg"
                    className={`w-full ${
                      plan.recommended
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {plan.price === 'Contact Us' ? 'Send Inquiry' : 'Choose Plan'}
                  </Button>
                </div>
              </div>
            </FadeInItem>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        ref={testimonialsRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center
                 opacity-0 transition-all duration-1000 ease-out
                 ${testimonialsRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Testimonials
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
          Kind words from education leaders
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <FadeInItem key={index}>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="flex justify-center mb-6">
                  <img
                    src="/placeholder.svg"
                    alt={`${testimonial.title.split(',')[1].trim()} Logo`}
                    className="h-10 opacity-80"
                  />
                </div>
                <p className="text-gray-600 mb-6 italic text-center flex-grow">"{testimonial.quote}"</p>
                <div className="flex items-center mt-auto">
                  <img
                    src="/placeholder.svg"
                    alt={`Avatar of ${testimonial.author}`}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </FadeInItem>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        ref={faqSectionRef.ref}
        className={`container mx-auto px-4 py-16 md:py-24 text-center
                 opacity-0 transition-all duration-1000 ease-out
                 ${faqSectionRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          FAQ
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <FadeInItem key={index} threshold={0}>
              <div className="mb-6 border-b border-gray-200 pb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2 flex items-center cursor-pointer hover:text-yellow-700 transition-colors"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  {item.question}
                  <span
                    className={`ml-auto text-2xl transform transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-45' : 'rotate-0'
                    }`}
                  >
                    +
                  </span>
                </h3>
                {openFaqIndex === index && (
                  <div className="pt-4 animate-in slide-in-from-top-4 duration-300 fade-in-0">
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                )}
              </div>
            </FadeInItem>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta"
        ref={ctaRef.ref}
        className={`bg-yellow-100f py-16 md:py-24
                 opacity-0 transition-all duration-1000 ease-out
                 ${ctaRef.isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
      >
        <div className="container mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-xl">
            <div className="mb-8 md:mb-0 md:mr-8 max-w-xl text-center md:text-left">
              <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                Start Now
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ready to Take Your Learning to the Next Level?
              </h2>
              <p className="text-gray-600 mb-6">
                Join thousands of students and educators who are using AI-powered concept maps to transform their
                learning experience.
              </p>
              <Button
                size="lg"
                onClick={login}
                className="bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
              >
                Get Started Free
              </Button>
            </div>
            <div className="w-full md:w-1/3 flex justify-center items-center">
              <img
                src="/placeholder.svg"
                alt="Concept Map App Preview"
                className="w-full md:w-auto max-w-xs rounded-lg border border-gray-200 shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        ref={footerRef.ref}
        className={`bg-white py-12 border-t border-gray-200
                 opacity-0 transition-opacity duration-1000 ease-out
                 ${footerRef.isVisible ? 'opacity-100' : ''}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-6 md:mb-0 max-w-sm">
              <img src="/placeholder.svg" alt="Concept Map Logo" className="h-8 mb-4" />
              <p className="text-sm text-gray-600">Transforming learning through AI-powered concept mapping.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="text-gray-600 hover:text-yellow-700 transition-colors">
                      Home
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="text-gray-600 hover:text-yellow-700 transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className="text-gray-600 hover:text-yellow-700 transition-colors">
                      How It Works
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="text-gray-600 hover:text-yellow-700 transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="text-gray-600 hover:text-yellow-700 transition-colors">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    Email:{' '}
                    <a href="mailto:hello@conceptmap.com" className="hover:text-yellow-700 transition-colors">
                      hello@conceptmap.com
                    </a>
                  </li>
                  <li>
                    Phone:{' '}
                    <a href="tel:+15551234567" className="hover:text-yellow-700 transition-colors">
                      +1 (555) 123-4567
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Office</h4>
                <p className="text-sm text-gray-600">
                  123 Learning Street
                  <br />
                  San Francisco, CA 94107
                  <br />
                  United States
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
            <p className="mb-4 md:mb-0">© {new Date().getFullYear()} Concept Map App. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-yellow-700 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-yellow-700 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-yellow-700 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
