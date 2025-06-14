import { AlertTriangle, Menu, Search, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Categories, type Tool, categories, tools } from './tools';

const App = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Categories | 'all'>(
    'all',
  );
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return sessionStorage.getItem('disclaimerDismissed') !== 'true';
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!showDisclaimer) {
      sessionStorage.setItem('disclaimerDismissed', 'true');
    }
  }, [showDisclaimer]);

  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderTool = () => {
    if (!activeTool) return null;

    const { Component } = activeTool;

    return <Component />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Navigation Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
          onKeyUp={(e) => {
            if (e.key === 'Escape') {
              setIsDrawerOpen(false);
            }
          }}
        />
      )}

      {/* Navigation Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-slate-800/95 backdrop-blur-md border-r border-slate-700 z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Go Go Gadgets</h2>
                <p className="text-xs text-slate-400">Dashboard</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search gadgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Categories */}
          <nav className="space-y-2 mb-8">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <span className="text-xs bg-slate-600 px-2 py-1 rounded-full">
                    {category.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Tools List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Available Tools
            </h3>
            {filteredTools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
                    activeTool?.id === tool.id
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                      : 'hover:bg-slate-700/50 text-white'
                  }`}
                >
                  <div
                    className={`w-10 h-10 bg-gradient-to-br ${tool.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{tool.name}</div>
                    <div
                      className={`text-xs ${
                        activeTool?.id === tool.id
                          ? 'text-black/70'
                          : 'text-slate-400'
                      }`}
                    >
                      {tool.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-80 min-h-screen">
        {/* Header */}
        <header
          className={`sticky top-0 z-30 transition-all duration-300 ${
            isScrolled
              ? 'bg-slate-900/80 backdrop-blur-md border-b border-slate-700'
              : ''
          }`}
        >
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {activeTool ? activeTool.name : 'Go Go Gadgets Dashboard'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {activeTool
                    ? activeTool.description
                    : 'Select a tool from the sidebar to get started'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          {activeTool ? (
            <div className="text-gray-900">{renderTool()}</div>
          ) : (
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <Wrench className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Welcome to Go Go Gadgets!
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Inspector Gadget's ultimate dashboard for interactive tools and
                utilities. Select a gadget from the sidebar to start using it.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.slice(0, 6).map((tool) => {
                  const IconComponent = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setActiveTool(tool)}
                      className="group bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-105 hover:shadow-xl text-left"
                    >
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {tool.name}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {tool.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Disclaimer Banner */}
      {showDisclaimer && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
          <div className="bg-yellow-200 text-yellow-900 border border-yellow-400 rounded-b-lg shadow-lg px-6 py-4 flex items-center gap-3 max-w-2xl mt-2 animate-fade-in">
            <AlertTriangle className="w-6 h-6 text-yellow-700 flex-shrink-0" />
            <div className="text-sm font-medium">
              I am not an accountant, lawyer, or professional giving any sort of
              advice. I do not claim these tools to be accurate in any
              defensible way. They were created merely to scratch an itch and
              help me make more informed decisions. Please, do not use AI or
              AI-generated tools in place of experienced and professional human
              beings who have dedicated years of their lives to offering advice
              relevant to individual and nuanced circumstances. You've been
              warned...there be dragons.
            </div>
            <button
              type="button"
              onClick={() => setShowDisclaimer(false)}
              className="ml-4 text-yellow-900 hover:text-yellow-700 font-bold text-lg focus:outline-none"
              aria-label="Dismiss disclaimer"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
