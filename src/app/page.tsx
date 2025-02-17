'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-pink-600">Pink Scan AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-6 py-2 text-pink-600 hover:text-pink-700 font-medium"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 md:pr-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Transform Your Documents with AI
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Instantly convert your documents into searchable, editable text using our advanced AI technology. Fast, accurate, and secure.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                href="/login"
                className="px-8 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium text-lg text-center"
              >
                Start Scanning Free
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 border-2 border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors font-medium text-lg text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 mt-12 md:mt-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-lg transform rotate-6 scale-105 opacity-20"></div>
              <div className="relative bg-white p-6 rounded-lg shadow-xl">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-full h-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4v16h16V4H4zm2 2h12v12H6V6zm2 2v8h8V8H8zm1 1h6v6H9V9z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 border-t border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '99%', label: 'Accuracy Rate' },
              { number: '50K+', label: 'Documents Scanned' },
              { number: '10K+', label: 'Happy Users' },
              { number: '24/7', label: 'Support' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-pink-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Powerful Features for Your Documents
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Instant Scanning',
                description: 'Upload your documents and get searchable text in seconds with our advanced OCR technology.',
                icon: '🚀',
              },
              {
                title: 'Smart Organization',
                description: 'Automatically organize and categorize your documents using AI-powered classification.',
                icon: '📊',
              },
              {
                title: 'Secure Storage',
                description: 'Keep your documents safe with enterprise-grade encryption and secure cloud storage.',
                icon: '🔒',
              },
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg bg-gray-50 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Upload', description: 'Upload any document or image containing text' },
              { step: '2', title: 'Process', description: 'Our AI analyzes and extracts text automatically' },
              { step: '3', title: 'Review', description: 'Review and edit the extracted text if needed' },
              { step: '4', title: 'Download', description: 'Download or share your searchable document' },
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-lg p-6 text-center relative z-10">
                  <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-pink-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "This tool has revolutionized how we handle documents. It's fast, accurate, and incredibly easy to use.",
                author: "Sarah Johnson",
                role: "Small Business Owner"
              },
              {
                quote: "The accuracy of the text extraction is impressive. It's saved us countless hours of manual data entry.",
                author: "Michael Chen",
                role: "Project Manager"
              },
              {
                quote: "Customer support is excellent, and the interface is intuitive. Exactly what we needed for our workflow.",
                author: "Emily Rodriguez",
                role: "Operations Director"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-lg">
                <div className="text-pink-600 mb-4">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">{testimonial.quote}</p>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Documents?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are already saving time with our AI-powered solution.
          </p>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-pink-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg inline-block"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pink Scan AI</h3>
              <p className="text-gray-600">
                AI-powered document scanning and text extraction solution.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 hover:text-pink-600">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-pink-600">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Help Center</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Contact</a></li>
                <li><a href="#" className="text-gray-600 hover:text-pink-600">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 mb-4 md:mb-0">
                &copy; 2025 Pink Scan AI. All rights reserved.
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-pink-600">Terms</a>
                <a href="#" className="text-gray-600 hover:text-pink-600">Privacy</a>
                <a href="#" className="text-gray-600 hover:text-pink-600">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
