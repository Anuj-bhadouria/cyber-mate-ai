import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Shield, AlertTriangle, Newspaper, Phone, Loader2 } from "lucide-react";
import { streamChat } from "@/utils/chatStream";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

type Mode = "assessment" | "incident" | "awareness" | "helpline";

const modes = [
  { id: "assessment", label: "Security Assessment", icon: Shield, color: "text-cyan-400" },
  { id: "incident", label: "Incident Response", icon: AlertTriangle, color: "text-red-400" },
  { id: "awareness", label: "Awareness & News", icon: Newspaper, color: "text-purple-400" },
  { id: "helpline", label: "Helpline Support", icon: Phone, color: "text-green-400" },
];

const quickActions = {
  assessment: [
    "Help me assess our company's cybersecurity needs",
    "Recommend security tools for a small business",
    "What's the best budget allocation for security?",
  ],
  incident: [
    "We've been hit by ransomware, what do I do?",
    "Suspicious email clicked, how to contain?",
    "Data breach detected, need immediate help",
  ],
  awareness: [
    "What are the latest cybersecurity threats?",
    "Teach me about phishing prevention",
    "Best practices for password security",
  ],
  helpline: [
    "I need to report a cybercrime in India",
    "How do I contact CERT-In?",
    "What information do I need to file a complaint?",
  ],
};

export default function ChatInterface() {
  const [mode, setMode] = useState<Mode>("assessment");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        mode,
        onDelta: updateAssistant,
        onDone: () => setIsLoading(false),
        onError: (error) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
  };

  const ActiveIcon = modes.find((m) => m.id === mode)?.icon || Shield;

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-background/95 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                CyberMate
              </h1>
              <p className="text-xs text-muted-foreground">AI Cybersecurity Consultant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Selector */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {modes.map(({ id, label, icon: Icon, color }) => (
              <Button
                key={id}
                variant={mode === id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange(id as Mode)}
                className={`flex items-center gap-2 whitespace-nowrap transition-all ${
                  mode === id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                    : "hover:bg-secondary"
                }`}
              >
                <Icon className={`w-4 h-4 ${mode === id ? "" : color}`} />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center space-y-6 py-12">
                <div className="relative inline-block">
                  <ActiveIcon className="w-24 h-24 text-primary mx-auto animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {modes.find((m) => m.id === mode)?.label}
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {mode === "assessment" &&
                      "Let me help assess your organization's cybersecurity needs and recommend solutions."}
                    {mode === "incident" &&
                      "Get immediate guidance for cyber attacks and security incidents."}
                    {mode === "awareness" &&
                      "Stay informed about the latest threats, trends, and security best practices."}
                    {mode === "helpline" &&
                      "Access Indian cybercrime helplines and reporting resources."}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Quick Actions:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickActions[mode].map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSend(action)}
                        className="text-xs hover:border-primary hover:text-primary transition-colors"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <Card
                key={i}
                className={`p-4 ${
                  msg.role === "user"
                    ? "bg-primary/10 border-primary/30 ml-12"
                    : "bg-card/50 border-border/50 mr-12"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {msg.role === "user" ? "You" : <Shield className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 text-foreground leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, ...props }) => {
                          const isInline = !props.className;
                          return isInline ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <code className="block bg-muted p-2 rounded text-sm my-2 overflow-x-auto">{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className="bg-muted p-3 rounded my-2 overflow-x-auto">{children}</pre>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        a: ({ href, children }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </Card>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">CyberMate is thinking...</span>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (Press Enter to send)"
              className="min-h-[60px] max-h-[200px] resize-none bg-background/50 border-border/50 focus:border-primary"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="self-end bg-primary hover:bg-primary/90 shadow-lg shadow-primary/50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}