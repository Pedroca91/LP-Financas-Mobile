import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from '../components/ui/toast-provider';
import { 
  Bot, Send, User, Trash2, MessageSquare, Plus, Sparkles, 
  TrendingUp, PiggyBank, CreditCard, HelpCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "Como estão minhas finanças este mês?" },
  { icon: PiggyBank, text: "Quanto devo economizar por mês?" },
  { icon: CreditCard, text: "Análise dos meus gastos com cartão" },
  { icon: HelpCircle, text: "Dicas para reduzir despesas" },
];

export function ChatAssistant() {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/chat/sessions`);
      setSessions(response.data);
      if (response.data.length > 0) {
        // Load most recent session
        loadSession(response.data[0].session_id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    try {
      const response = await axios.get(`${API}/chat/history?session_id=${sessionId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Excluir esta conversa?')) return;
    try {
      await axios.delete(`${API}/chat/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewSession();
      }
      toast.success('Conversa excluída');
    } catch (error) {
      toast.error('Erro ao excluir conversa');
    }
  };

  const sendMessage = async (text = inputMessage) => {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: text,
        session_id: currentSessionId
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(response.data.session_id);
        fetchSessions();
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content) => {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Assistente Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Converse com a IA sobre suas finanças
          </p>
        </div>
        <Button onClick={startNewSession} variant="outline" className="rounded-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100%-100px)]">
        {/* Sessions Sidebar */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto max-h-[400px]">
            {loadingSessions ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma conversa ainda
              </p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.session_id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => loadSession(session.session_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {session.last_message?.substring(0, 30) || 'Nova conversa'}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.message_count} mensagens
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.session_id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Olá! Sou o LP Finanças AI</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Posso te ajudar a analisar seus gastos, dar dicas de economia e responder dúvidas sobre suas finanças.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => sendMessage(prompt.text)}
                    >
                      <prompt.icon className="h-4 w-4 mr-2 shrink-0" />
                      <span className="text-left text-sm">{prompt.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      }`}
                    >
                      <div 
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMessageContent(message.content) 
                        }}
                      />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>
          
          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={loading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
